# Review: demo simulator (Phase 4, step 1)

Model: Gemini Hydrogen 4, High, in a new chat.

## What to paste into Gemini

Paste everything below the line "Text for Gemini", and the three files it names:

- supabase/migrations/20261118000000_demo_settings.sql (80 lines, new)
- supabase/migrations/20261118000100_demo_simulator.sql (174 lines, new)
- supabase/checks/demo_tick.sql (89 lines, new)

Also changed: supabase/checks/permissions.sql (63 lines; only a comment above the expected list, 4 lines added, 1 removed).

## Text for Gemini

Find problems in this code. Do not confirm that it is correct. List each problem with the file, the line, and a concrete case where it goes wrong.

The project is a concept prototype of a virtual ER waiting room on Supabase (Postgres). Synthetic data only. Low-acuity patients wait off-site, follow their place in line on their phone, and come back when staff recall them. Table public.visits holds real visits (is_demo = false) and demo visits (is_demo = true) at sites A and B. Real patients' place in line counts demo visits too, on purpose, so the demo shows a 2 to 3 hour wait.

The new function public.simulate_demo_tick() runs from pg_cron every 5 minutes as the database owner (security definer, so row-level security does not apply). It plays staff and patients for demo visits only. It does nothing unless demo_settings.running is true.

Main question: can simulate_demo_tick, demo_new_token or demo_new_code change, delete or reveal any visit with is_demo = false, in any case (concurrent staff actions, a paused site, a token or code clash, a trigger error, a second run at the same time)?

Other questions:
1. Can a tick stop with an error (for example the VWR02 pause error below) and so leave the demo stuck? Is a stopped tick harmless?
2. Does any move break the allowed moves in visits_check_step below?
3. Can anyone other than pg_cron run these functions? (Each is revoked from public, anon, authenticated and service_role.)
4. Does demo_tick.sql prove what it says? It runs inside begin ... rollback, pauses the visits_before_write trigger only while it moves demo times back 5 minutes, and compares each real visit's version before and after.
5. Simpler ways to do the same thing.

Facts the code depends on (not in the three files):

- visits_before_write (before insert or update, each row): on insert sets version = 1 and sets every non-null time column to now(); on update adds 1 to version and sets each time column that changed to a non-null value to now().
- visits_check_step (before insert or update, each row): a new visit may start only as pre_arrival, waiting, declined or not_eligible. Site may not change. Allowed status moves: pre_arrival to waiting, declined or not_eligible; needs_reassessment to waiting, declined or not_eligible; waiting to called, arrived or removed; called to on_the_way, arrived, removed or unable_to_reach; on_the_way to arrived or removed; unable_to_reach to needs_reassessment; arrived, removed to waiting, called or on_the_way (undo). A new waiting visit (insert, or a move from pre_arrival or needs_reassessment) raises VWR02 if site_settings.offsite_paused for that site is not false (read with "for share").
- An after-statement trigger on visits updates a one-row change_signal table, even when zero rows change.
- visits.code and visits.access_token are unique, with checks ^[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{6}$ and ^[0-9A-HJKMNP-TV-Z]{26}$.
- The patient functions the tick calls (newest versions):

```sql
create function public.record_seen(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.visits set seen_at = now()
  where access_token = p_token and status = 'called' and seen_at is null;
  return found;
end; $$;

create or replace function public.confirm_on_my_way(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.visits
  set status = 'on_the_way', confirmed_at = now(), seen_at = coalesce(seen_at, now())
  where access_token = p_token and status = 'called';
  return found;
end; $$;

create function public.record_still_here(p_token text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  update public.visits set last_still_here_at = now()
  where access_token = p_token and status = 'waiting';
  return found;
end; $$;
```

## Checked (output in this session, 2026-11-18)

- Both migrations ran in the SQL Editor without errors; cron job simulate-demo is active, */5 * * * *.
- supabase/checks/permissions.sql: the list is the same as before (anon and authenticated get nothing new); no table without row-level security.
- supabase/checks/demo_tick.sql: real visits changed 0; site A waiting 9; site B waiting 9; site B new waiting while paused 0; call-backs at A 9.
- npm test: 65 files, 376 tests passed. npm run lint: no errors. npm run build: completed.

## Not checked

- The simulator has not run live yet (demo_settings.running is still false).
- What happens when a staff member pauses a site during a tick.
- How the staff and patient screens look with demo visits.

## What to bring back

Gemini's full answer. Paste it under "Response" below.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted as given.

### Problems Found in the Code

1. **TOCTOU race when staff pause a site mid-tick raises an unhandled `VWR02` exception and aborts the entire tick**
* **File & line:** `supabase/migrations/20261118000100_demo_simulator.sql`, lines 35–36 (`select offsite_paused into v_paused ...`), lines 121–124 (`update public.visits set status = 'waiting' ...`), and lines 153–161 (`insert into public.visits ...` with `v_status = 'waiting'`).
* **Concrete case:** `simulate_demo_tick()` reads `site_settings.offsite_paused` into `v_paused` without a lock at line 35 (`false`). Under PostgreSQL's default `READ COMMITTED` isolation, each statement sees a fresh snapshot. If a staff member pauses Site B (`offsite_paused = true`) after line 35 runs and before line 121 or line 153 runs for Site B, `visits_check_step` locks `site_settings FOR SHARE`, sees `offsite_paused = true`, and raises `VWR02`. With no `EXCEPTION` handler in `simulate_demo_tick()`, the entire transaction aborts and rolls back all Site A and Site B progress from that tick.

2. **Unique-constraint collision (`23505`) between `demo_new_code()` / `demo_new_token()` and concurrent inserts aborts the tick**
* **File & line:** `supabase/migrations/20261118000000_demo_settings.sql`, lines 46 and 74 (`exit when not exists (select 1 from public.visits where ...)`), and `supabase/migrations/20261118000100_demo_simulator.sql`, lines 130–131 and 153–161.
* **Concrete case:** `demo_new_code()` checks `not exists` across a 6-character space ($31^6 \approx 8.87 \times 10^8$ codes) and returns a candidate string before the `INSERT` executes. If a concurrent real visit insert (or a second call within the same transaction) claims that code before line 130 or line 153 runs, Postgres raises `23505` (`unique_violation`) and aborts the whole tick instead of retrying.

3. **Recall order ignores `ctas_level`, recalling CTAS 5 patients ahead of CTAS 4 patients**
* **File & line:** `supabase/migrations/20261118000100_demo_simulator.sql`, lines 109–112 (`order by triaged_at, id`), vs. lines 122 and 157 (`ctas_level = case when random() < 0.5 then 4 else 5 end`).
* **Concrete case:** A CTAS 5 demo patient is created at 12:00 and a CTAS 4 demo patient is created at 12:05. Because line 111 orders only by `triaged_at, id`, the simulator recalls the lower-acuity CTAS 5 patient first—contradicting the triage-priority queue order shown to staff and patients.

4. **Paused site continuously inserts 2 `not_eligible` rows every 5 minutes (24/hour) once `v_waiting < 9`**
* **File & line:** `supabase/migrations/20261118000100_demo_simulator.sql`, lines 140–165 (`while v_waiting < 9 and v_added < 2 loop` with `v_status := case when v_paused then 'not_eligible' else 'waiting' end`).
* **Concrete case:** While Site A is paused (`v_paused = true`), recalls drain `v_waiting` below 9. On every subsequent 5-minute tick, `v_waiting` stays `< 9` because `v_status` is `'not_eligible'` (so line 162 never increments `v_waiting`), causing the loop to insert 2 `not_eligible` rows every 5 minutes indefinitely for the entire duration of the pause.

5. **Exact 5/10/20/30-minute interval comparisons slip by a full 5-minute tick under normal `pg_cron` jitter**
* **File & line:** `supabase/migrations/20261118000100_demo_simulator.sql`, lines 59 (`30 minutes`), 70 (`5 minutes`), 82 (`10 minutes`), 83 (`20 minutes`), 91 (`30 minutes`), and 119 (`10 minutes`).
* **Concrete case:** Unlike Step 3 (lines 103–104, which use `18 minutes` and `12 minutes` so 15- and 20-minute `pg_cron` ticks still match despite millisecond jitter), Step 2 uses `confirmed_at <= now() - interval '5 minutes'`. If tick 1 runs at `12:00:00.015` (`confirmed_at = 12:00:00.015`) and tick 2 runs at `12:05:00.004`, `12:00:00.015 <= 12:00:00.004` is `false` by 11 milliseconds, delaying the check until `12:10:00`.

6. **Resuming the simulator after a `>= 30`-minute pause marks `called` visits `unable_to_reach` with only 1 phone attempt instead of 2**
* **File & line:** `supabase/migrations/20261118000100_demo_simulator.sql`, lines 80–96.
* **Concrete case:** A demo visit is recalled at `12:00` (`phone_attempts = 0`), then `demo_settings.running` is set to `false` at `12:05` and back to `true` at `12:35`. At `12:35`, lines 80–87 increment `phone_attempts` from `0` to `1`, and lines 90–96 immediately set `status = 'unable_to_reach'` in the same tick—skipping the second phone attempt (`phone_attempts = 2`).

7. **Row-by-row `FOR ... LOOP` updates fire the `AFTER STATEMENT` `change_signal` trigger once per row**
* **File & line:** `supabase/migrations/20261118000100_demo_simulator.sql`, lines 40–65, 69–96, and 118–125.
* **Concrete case:** When 8 waiting demo patients pass the 30-minute `last_still_here_at` mark on the same tick, lines 58–65 run 8 separate single-row `UPDATE` statements via `record_still_here()`, firing the `visits` statement trigger 8 times instead of once.

8. **Stale/inaccurate comments and schema coupling**
* **File & line:** `supabase/migrations/20261118000100_demo_simulator.sql`, line 98 (`-- 3. Recall. The owner writes this rule (see the TODO below).` — no TODO exists); `supabase/migrations/20261118000000_demo_settings.sql`, line 25 (says `128 random bits`, whereas 26 Crockford characters at 5 bits each is 130 random bits) and line 40 (`extensions.gen_random_bytes(26)` hardcodes the `extensions` schema, failing if `pgcrypto` is installed in `public`).

---

### Answers to Your Specific Questions

#### Main Question: Can `simulate_demo_tick`, `demo_new_token`, or `demo_new_code` change, delete, or reveal any visit with `is_demo = false`?

* **Change or delete `is_demo = false` rows: No.**
* None of the three functions executes `DELETE`.
* Every `UPDATE` in `simulate_demo_tick()` explicitly filters `where is_demo = true` (lines 74, 86, 95, 108, 124) or calls `record_seen` / `confirm_on_my_way` / `record_still_here` with an `access_token` selected from `where is_demo = true` (lines 40, 49, 58). Because `visits.access_token` is unique, those RPCs can only match that single `is_demo = true` row.
* Every `INSERT` hardcodes `is_demo = true` (lines 131, 161).
* Under concurrent staff actions, a paused site, a token/code clash, a trigger error, or a second concurrent run (`pg_try_advisory_xact_lock` on line 25 exits immediately), any error rolls back the tick's transaction without touching `is_demo = false` rows.
* *Indirect side effect only:* Each `INSERT`/`UPDATE` fires the `AFTER STATEMENT` trigger on `visits` that updates the one-row `change_signal` table, waking active real-patient and staff pollers even though no `is_demo = false` row changed.

* **Reveal `is_demo = false` rows: No.**
* `simulate_demo_tick()` returns `void`; `demo_new_token()` and `demo_new_code()` only return generated random strings (checking `exists` across all `visits` so demo values cannot collide with real visits), and all three functions have `EXECUTE` revoked from `public, anon, authenticated, service_role`.

#### 1. Can a tick stop with an error and leave the demo stuck? Is a stopped tick harmless?

* **Will it leave the demo stuck? No.** Because `pg_try_advisory_xact_lock` (line 25) is transaction-scoped, PostgreSQL releases the lock automatically when the aborted transaction rolls back, and `pg_cron` runs the next tick 5 minutes later. If the abort was caused by a mid-tick pause (`VWR02`), the next tick reads `v_paused = true` at line 35 and proceeds without attempting `waiting` writes.
* **Is a stopped tick harmless? Mostly, with two caveats:**
1. Because Sites A and B share one transaction, a `VWR02` pause race on Site B rolls back all patient taps, arrivals, recalls, and new demo visits for Site A during that 5-minute interval as well.
2. Each aborted tick logs a failed run in `cron.job_run_details`, which will trigger alerts if you monitor `pg_cron` failures.

#### 2. Does any move break the allowed moves in `visits_check_step`?

* **No status transition breaks the allowed move graph:**
* `INSERT`s use `'pre_arrival'` (line 131) and `'waiting'`, `'declined'`, or `'not_eligible'` (lines 147–151)—all in the allowed start set.
* `UPDATE`s only perform `called -> on_the_way` (line 53), `on_the_way -> arrived` (line 73), `called -> unable_to_reach` (line 94), `waiting -> called` (line 107), `pre_arrival -> waiting` (line 121), or same-status column updates (`seen_at`, `last_still_here_at`, `phone_attempts`/`last_phone_result`). `site` is never updated.

* **Only the pause rule (`VWR02`) can be violated under concurrency:** As detailed in Problem 1, a staff pause committed between line 35 and line 121/153 causes `simulate_demo_tick()` to attempt a `waiting` move on a paused site, which `visits_check_step` rejects with `VWR02`.

#### 3. Can anyone other than `pg_cron` run these functions?

* **No API role can run them:** Revoking `EXECUTE` from `public, anon, authenticated, service_role` blocks PostgREST/Data API callers completely (even if Supabase's `ALTER DEFAULT PRIVILEGES` granted `EXECUTE` to `anon`/`authenticated`/`service_role` at creation time).
* **Who else can run them:** Only the function owner (`postgres`), database superusers (e.g., `supabase_admin`), and anyone with direct SQL Editor / `postgres`-role connection access.
* **Note on `demo_settings`:** `supabase/migrations/20261118000000_demo_settings.sql` line 21 revokes table privileges from `anon, authenticated` (and enables RLS with no policies), which blocks `anon` and `authenticated`, while `service_role` retains access because it bypasses RLS in Supabase.

#### 4. Does `demo_tick.sql` prove what it says?

It proves the 5 happy-path counts it prints, **but has four gaps relative to what it claims**:

1. **Non-determinism despite `setseed(0.42)` (`supabase/checks/demo_tick.sql`, line 25):** `setseed` only seeds `random()`, not `extensions.gen_random_bytes(26)` or `gen_random_uuid()`. Because `visits.id` is random on every run, `abs(hashtext(id::text)::bigint) % 10 <> 0` (non-responder selection) and `order by triaged_at, id` (tie-breaking rows created at the same `now()`) vary across runs, and any pre-existing `is_demo = true` rows in the database are included in the simulation.
2. **Check 1 (`real visits changed`, lines 66–69) passes vacuously on an empty database:** If `public.visits` has zero `is_demo = false` rows when `demo_tick.sql` runs, `count(*)` is `0` without proving real rows are protected.
3. **Check 4 (`site B new waiting while paused`, lines 79–81) checks `triaged_at = now()` instead of comparing pre-pause vs. post-pause waiting IDs:** If a bug moved an existing `pre_arrival` visit to `waiting` without updating `triaged_at`, `triaged_at = now()` would still report `0`. It also does not test a mid-tick pause race.
4. **Entire branches of `simulate_demo_tick()` are unverified:** None of the 5 checks verifies that `demo_settings.running = false` is a no-op, or that patient responses (`seen_at`, `confirmed_at`, `last_still_here_at`), arrivals (`arrived`), phone attempts (`phone_attempts`), or `unable_to_reach` ever fire. In addition, toggling `visits_before_write` 60 times (lines 40 and 54) acquires 60 `ACCESS EXCLUSIVE` locks on `public.visits`, stalling concurrent queries while the script runs.

#### 5. Simpler ways to do the same thing

* **Catch `VWR02` instead of locking `site_settings` across the tick:** Wrap the `pre_arrival -> waiting` update (line 121) and desk `insert` (line 153) in `begin ... exception when sqlstate 'VWR02' then v_paused := true; end;`. If staff pause the site mid-tick, the simulator catches `VWR02`, flips `v_paused := true` on the spot, and finishes the rest of the tick cleanly without rolling back Site A or holding a `FOR SHARE` lock on `site_settings`.
* **Retry `23505` inside `demo_new_code()` / `demo_new_token()` or wrap the `INSERT`:** Either wrap the two `INSERT`s in a small retry loop on `unique_violation` (`23505`) or generate the code/token inside the `INSERT` retry block so a rare concurrent clash never aborts a tick.
* **Replace `FOR ... LOOP` cursors with set-based `UPDATE`s:** Steps 2 (`arrived`, `phone_attempts`, `unable_to_reach`) and 4 (`pre_arrival -> waiting`) can each be a single `UPDATE public.visits SET ... WHERE is_demo = true AND site = v_site AND ... AND random() < 0.5`, cutting PL/pgSQL loops and `change_signal` trigger invocations to one per step.
* **Gate Step 5 (`Desk starts`) on `if not v_paused then`:** Skipping desk starts while paused (matching Step 4 `Home starts`) eliminates the endless `not_eligible` insert loop when a site is paused.
* **Use `generate_series` instead of character-by-character concatenation in `demo_new_token()` / `demo_new_code()`:**
```sql
select string_agg(substr(alphabet, (get_byte(b, i) % 32) + 1, 1), '')
from generate_series(0, 25) as i;
```
This avoids 26 intermediate string allocations per attempt.
* **Use `clock_timestamp()` or an optional `p_now timestamptz default now()` parameter in `simulate_demo_tick` for testing:** Passing `p_now` in `demo_tick.sql` lets you advance simulated time by 5 minutes per iteration without `ALTER TABLE public.visits DISABLE/ENABLE TRIGGER visits_before_write` and its 60 `ACCESS EXCLUSIVE` table locks.

## Check of the response (Claude, 2026-11-18)

Main question: Gemini agrees that no path changes, deletes or shows a visit with is_demo = false. This agrees with check row 1.

Accepted (fix in a new migration, because the two files already ran):

- 1, VWR02 race: correct. Wrap the home start update and the desk insert in begin ... exception when sqlstate 'VWR02', set v_paused := true and go on. Then a pause during a tick does not roll back the work for the other site.
- 4, endless not_eligible rows while paused: correct. 2 rows per tick per site, 24 per hour. How to fix it is a product choice (asked in the same turn).
- 5, timing jitter: correct. Each tick's now() is a few ms after the 5-minute mark, so an exact 5, 10, 20 or 30 minutes can miss by ms and slip 5 minutes. Use 1 minute less (4, 9, 19, 29, 29, 9).
- 6, unable_to_reach after only 1 phone attempt: correct. Add phone_attempts >= 2 to the unable_to_reach rule.
- 8, line 98 comment: correct ("see the TODO below" is stale). "128 random bits": correct, lib/codes.ts uses 16 bytes (128 bits), but demo_new_token uses 26 bytes, 5 bits each (130 bits). Fix both comments.
- Q3 note, service_role keeps rights on demo_settings: correct. The app does not use service_role (grep of app, data, lib, components: no match), but revoke it too, the same as the functions.
- Q4, gaps 2 to 4 in demo_tick.sql: add a row for the number of real visits checked (must be more than 0), check paused site B by the ids that were waiting before the pause, add a running = false tick that changes no demo version, and add rows that show arrivals and phone attempts happen.

Rejected:

- 2, 23505 clash: a second call in the same transaction sees the rows the first insert made, so that part is wrong. A clash with a real insert in the same few ms has a chance of about 1 in 900 million per code. The result is one tick that does nothing. No fix.
- 3, CTAS order: SPEC line 125 says "Place in line is ordered by triaged_at, never by created_at." CTAS 4 and 5 do not change the order. The recall order is correct.
- 7, one change_signal write per row: all writes are in one transaction, so pollers see one change at commit. No fix.
- 8, extensions schema: pgcrypto is in extensions on Supabase, and the migration ran. No fix.
- generate_series in the token makers: 26 short appends per new visit, a few visits per tick. No gain.
- p_now parameter: visits_before_write sets every new time to now(), so a p_now value would be written over. The check still must pause the trigger. The ACCESS EXCLUSIVE lock is held until rollback, a few seconds. Add a note to the check file.
