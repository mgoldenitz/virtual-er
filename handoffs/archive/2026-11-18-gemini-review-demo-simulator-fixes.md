# Review: demo simulator fixes (Phase 4, step 1b, review round 2)

Model: Gemini Hydrogen 4, High, in a new chat (not the chat of round 1).

## What to paste into Gemini

Paste everything below the line "Text for Gemini", and these two files:

- supabase/migrations/20261118000200_demo_simulator_fixes.sql (208 lines, new)
- supabase/checks/demo_tick.sql (126 lines, changed: 54 lines added, 13 removed, then 2 lines of the expected range)

## Text for Gemini

Find problems in this code. Do not confirm that it is correct. List each problem with the file, the line, and a concrete case where it goes wrong.

The project is a concept prototype of a virtual ER waiting room on Supabase (Postgres). Synthetic data only. Table public.visits holds real visits (is_demo = false) and demo visits (is_demo = true) at sites A and B. Real patients' place in line counts demo visits too, on purpose.

public.simulate_demo_tick() runs from pg_cron every 5 minutes as the database owner (security definer). It plays staff and patients for demo visits only, and does nothing unless demo_settings.running is true. The migration replaces an earlier version with these changes, from a first review:

1. Time rules have 1 minute of slack (4, 9, 19, 29 minutes), because each cron tick's now() is a few ms after the 5-minute mark.
2. unable_to_reach needs phone_attempts >= 2.
3. The home start update (pre_arrival to waiting) and the desk insert are each in begin ... exception when sqlstate 'VWR02' then v_paused := true; end; so a site pause during a tick does not roll back the work for the other site.
4. No desk starts while a site is paused (owner choice).
5. Execute on the function is revoked from public, anon, authenticated and service_role; all rights on demo_settings are revoked from service_role.

Settled, do not report:
- Place in line is ordered by triaged_at only, never by CTAS (SPEC). The recall order "order by triaged_at, id" is correct.
- A unique clash on code or token with a real insert in the same ms only stops one tick; no fix.
- One change_signal write per row is fine; all writes are in one transaction.
- A home start can make 10 demo visits waiting (desk starts stop at 9); the check allows 7 to 10 (owner choice).
- The check pauses visits_before_write, because that trigger sets every new time to now(); a p_now parameter would be written over.

Main question: can the new function change, delete or reveal any visit with is_demo = false, in any case?

Other questions:
1. Does each VWR02 block work as meant? After the exception, is v_paused true and does the rest of that site's step stop? Can any other error now be caught and hidden by mistake?
2. Is there any move the 1-minute slack makes too early or makes happen twice?
3. Does demo_tick.sql (rows 0 to 8) prove what each row says?

Facts the code depends on (not in the files):
- visits_before_write (before insert or update, each row): on insert sets version = 1 and sets every non-null time column to now(); on update adds 1 to version and sets each time column that changed to a non-null value to now().
- visits_check_step (before insert or update, each row): a new visit may start only as pre_arrival, waiting, declined or not_eligible. Allowed moves: pre_arrival to waiting, declined or not_eligible; waiting to called, arrived or removed; called to on_the_way, arrived, removed or unable_to_reach; on_the_way to arrived or removed; unable_to_reach to needs_reassessment. A new waiting visit (insert, or a move from pre_arrival or needs_reassessment) raises SQLSTATE VWR02 if site_settings.offsite_paused for that site is not false.
- record_seen, confirm_on_my_way and record_still_here are security definer functions that update one visit by its unique access_token (unchanged since round 1).

## Checked (output in this session, 2026-11-18)

- The migration ran in the SQL Editor without errors. A read-only query shows the new body is live, service_role has no select on demo_settings, the cron job is active, running is false, 0 demo visits.
- supabase/checks/permissions.sql: the list is the same as before; the second query returned no rows (no table without row-level security).
- supabase/checks/demo_tick.sql: 0 real visits checked 3; 1 real visits changed 0; 2 site A waiting 10; 3 site B waiting 9; 4 site B new waiting after pause 0; 5 call-backs at A 9; 6 demo arrived 15; 7 phone attempts recorded 10; 8 changes while running is false 0.
- npm test: 65 files, 376 tests passed. npm run lint: no errors. npm run build: completed.

## Not checked

- A real VWR02 during a tick (a staff pause in the same moment). No check makes one.
- The simulator running live (running is still false).

## What to bring back

Gemini's full answer. Paste it under "Response" below.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Full answer as pasted:

### Problems Found in the Code

1. Check 8 ("8 changes while running is false") misses deletions of demo visits and ignores is_demo = false rows
* File & line: supabase/checks/demo_tick.sql, lines 77-80 and 119-122 (from public.visits v left join demo_before_off b on b.id = v.id where v.is_demo = true and (b.id is null or v.version is distinct from b.version)).
* Concrete case: If a bug in simulate_demo_tick() executes a DELETE on public.visits while demo_settings.running = false, the deleted row is absent from public.visits v (the left side of the LEFT JOIN), so Check 8 still outputs 0 instead of detecting the missing row (unlike Check 1 at lines 89-92, which joins from real_before on the left). Likewise, where v.is_demo = true skips any is_demo = false row modified or inserted while running = false.

2. Check 4 ("4 site B new waiting after pause") can pass (0) even if both if not v_paused guards are removed
* File & line: supabase/checks/demo_tick.sql, lines 61-63, 68-73, and 102-105; supabase/migrations/20261118000200_demo_simulator_fixes.sql, lines 134, 139, 164, and 168.
* Concrete case: At the end of tick 30 (line 61), every demo timestamp was shifted back only 5 minutes, so any pre_arrival visit created on tick 30 has created_at = now() - 5 minutes and is not yet eligible for the 9 minutes home-start threshold at line 139 when line 73 runs. At the same time, after 30 ticks Site B already has 9 waiting visits (3 site B waiting 9 in your output), so Step 5's while v_waiting < 9 (line 168) runs zero iterations regardless of v_paused. If you deleted if not v_paused then at lines 134 and 164, Check 4 would still output 0 whenever Site B had 9 waiting visits and no pre_arrival visit >= 9 minutes old. Check 4 also does not verify that new pre_arrival inserts (line 156) stopped on Site B.

3. Check 1 ("1 real visits changed") passes vacuously on an empty table and misses newly inserted is_demo = false rows
* File & line: supabase/checks/demo_tick.sql, lines 37-38 and 85-92.
* Concrete case: Because demo_tick.sql does not insert temporary is_demo = false rows inside its begin ... rollback block, running it on a database with zero real visits (0 real visits checked = 0) makes Check 1 return 0 without testing real-visit isolation. Even when real visits exist (such as your 3 rows), if they happen to be in terminal statuses (arrived or removed) rather than pre_arrival, waiting, called, or on_the_way, they never exercise the simulator's is_demo = true filters on active visits. In addition, from real_before rb left join public.visits v does not catch a newly inserted row with is_demo = false.

4. Check 7 ("7 phone attempts recorded") does not verify the 2-attempt rule for unable_to_reach
* File & line: supabase/checks/demo_tick.sql, lines 115-117 (where is_demo = true and phone_attempts > 0), compared with supabase/migrations/20261118000200_demo_simulator_fixes.sql, lines 107-114.
* Concrete case: Fix #2 requires phone_attempts >= 2 before moving a called visit to unable_to_reach, yet Check 7 only counts rows with phone_attempts > 0. If line 110 regressed to phone_attempts >= 1 (or was omitted), Check 7 would still report a positive count and pass.

5. setseed(0.42) in demo_tick.sql does not make the check deterministic, and pre-existing demo rows are not isolated
* File & line: supabase/checks/demo_tick.sql, lines 34 and 47-64; supabase/migrations/20261118000200_demo_simulator_fixes.sql, lines 53, 62, 73, 129, 157, and 184.
* Concrete case: setseed(0.42) seeds random(), but visits.id (gen_random_uuid()) and demo_new_code()/demo_new_token() (gen_random_bytes()) do not use random(). Because non-responder selection (abs(hashtext(id::text)::bigint) % 10 <> 0) and recall tie-breaking (order by triaged_at, id) depend on id, counts vary across runs; furthermore, if any is_demo = true rows already exist in public.visits before demo_tick.sql runs, they are shifted back 5 minutes per tick and counted in rows 2-7.

6. A mid-tick pause right before Step 5 can still insert up to two declined or not_eligible demo rows
* File & line: supabase/migrations/20261118000200_demo_simulator_fixes.sql, lines 47, 164, and 173-194.
* Concrete case: Staff pause Site A (offsite_paused = true) after line 47 reads v_paused = false and before Step 5 executes. Because visits_check_step only raises VWR02 on a new waiting visit, if Step 5 rolls the 20% declined or not_eligible branch (lines 175-179) on iteration 1 (v_added = 1), that row is inserted while the site is already paused and v_paused stays false until a subsequent iteration rolls waiting (80%) and hits VWR02.

### Answers to Your Questions

Main Question: Can simulate_demo_tick() change, delete, or reveal any visit with is_demo = false, in any case?

* Change or delete is_demo = false rows: No.
  * There is no DELETE statement in simulate_demo_tick() or its helper functions.
  * Every UPDATE in simulate_demo_tick() either filters directly with is_demo = true (lines 88, 101, 113, 126, 145) or calls record_seen, confirm_on_my_way, or record_still_here using an access_token selected with where is_demo = true (lines 52, 61, 71). Because access_token is unique on public.visits, each helper updates at most that single is_demo = true row.
  * Every INSERT hardcodes is_demo = true (lines 157, 189).
  * (Shared-table side effect only: each INSERT/UPDATE on public.visits still fires the AFTER STATEMENT trigger that updates the single-row change_signal table, prompting active real-patient and staff browsers to poll, without touching any is_demo = false visit row.)
* Reveal is_demo = false rows: No.
  * simulate_demo_tick() returns void (line 21), emits no logs or notices containing visit data, and has EXECUTE revoked from public, anon, authenticated, and service_role (line 205).
  * demo_new_code() and demo_new_token() check not exists across all rows in public.visits so demo values cannot collide with real visits, but they only return newly generated random strings.

1. Does each VWR02 block work as meant? After the exception, is v_paused true and does the rest of that site's step stop? Can any other error now be caught and hidden by mistake?

* Does each VWR02 block work as meant? Yes, for every waiting transition/insert:
  * In Step 4 (lines 141-150), when UPDATE public.visits set status = 'waiting' raises VWR02, PostgreSQL rolls back that subtransaction, sets v_paused := true (line 147), exits the pre_arrival loop via exit when v_paused; (line 149), skips the home-start INSERT at line 153 (if not v_paused and random() < 0.1), and skips all of Step 5 at line 164 (if not v_paused then). On the next iteration of foreach v_site, line 47 reloads v_paused from site_settings for the other site, preserving work already done in the tick.
  * In Step 5 (lines 180-194), when INSERT with v_status = 'waiting' raises VWR02, that insert's subtransaction rolls back, line 192 sets v_paused := true, and line 194 (exit when v_paused;) terminates the while loop (subject only to the minor non-waiting edge case in Problem 6 above).
* After the exception, is v_paused true and does the rest of that site's step stop? Yes: v_paused is set to true immediately in both handlers, and exit when v_paused; plus if not v_paused guards prevent any subsequent Step 4 or Step 5 statements from running for that site.
* Can any other error now be caught and hidden by mistake? No. exception when sqlstate 'VWR02' matches only the exact custom SQLSTATE 'VWR02'. Any other SQLSTATE (23505 unique violation, P0001 generic RAISE EXCEPTION, 23514 check constraint, deadlocks/serialization failures, etc.) is not caught and aborts the transaction normally.

2. Is there any move the 1-minute slack makes too early or makes happen twice?

* Happen twice: No. Every time-gated action either transitions status out of the queried state (on_the_way to arrived at line 87; called to unable_to_reach at line 112; pre_arrival to waiting at line 143), advances phone_attempts out of the queried predicate (0 to 1 at 9m, 1 to 2 at 19m, and >= 2 is excluded at lines 97-98), or resets the timestamp to now() (last_still_here_at = now() via record_still_here at line 76). Within a single tick, newly updated timestamps equal now() and therefore cannot satisfy any <= now() - interval '4/9/19/29 minutes' predicate later in the same tick.
* Happen too early:
  * Under regular 5-minute pg_cron ticks, no: 4, 9, 19, and 29 minutes sit strictly between consecutive 5-minute tick boundaries (0 < 4 < 5, 5 < 9 < 10, 15 < 19 < 20, 25 < 29 < 30), so no move fires on an earlier 5-minute tick.
  * For events triggered off the 5-minute grid (such as a manual staff recall or a human tester tapping "I'm on my way" on a demo visit at 12:00:59), the 12:05:00 cron tick will fire up to 1 minute earlier than the nominal 5/10/20/30-minute mark (e.g., at 4m01s instead of 5m00s), which is the intended trade-off of 1-minute jitter slack.

3. Does demo_tick.sql (rows 0 to 8) prove what each row says?

* Row 0 & Row 1: Only partially. It proves pre-existing is_demo = false rows were not updated or deleted during that run, but passes vacuously if 0 real visits checked is 0, does not seed active real visits if none exist, and does not catch newly inserted is_demo = false rows.
* Row 2 & Row 3: Yes, it counts waiting demo visits per site after 30 ticks (assuming no pre-existing is_demo = true rows were already in public.visits).
* Row 4: No. Because tick 30 only shifted timestamps back 5 minutes (less than the 9-minute home-start threshold) and Site B already had 9 waiting visits (while v_waiting < 9 does not run), Row 4 outputs 0 even if if not v_paused is broken or removed.
* Row 5: Yes, it accurately counts demo visits at Site A with called_at is not null (assuming no pre-existing demo rows).
* Row 6 & Row 7: Only partially. They confirm at least some arrivals and phone_attempts > 0, but Row 7 does not verify that unable_to_reach rows had phone_attempts >= 2.
* Row 8: No. Its LEFT JOIN direction (public.visits v left join demo_before_off b) misses deleted demo rows, and where v.is_demo = true ignores any changes to is_demo = false rows while running = false.

## Check of the response (Claude, 2026-11-18)

I checked each point against the two files as they are now (migration 209 lines, check 126 lines).

Main question: no problem found. My own read agrees: every update has `is_demo = true` (lines 88, 101, 113, 125-126, 145), both inserts set `is_demo` to true (lines 157, 189), there is no delete, and the three patient functions get only demo tokens (lines 52, 61, 71). The change_signal note is known and settled.

Question 1 (VWR02 blocks) and question 2 (slack): no problem found. The answers match the code.

1. Row 8 misses a deleted demo row. Accepted, small. The function has no delete, so this only guards a future mistake, but the fix is cheap: count demo_before_off rows that are gone too. The second half (real rows changed while running is false) is already covered by row 1, which runs after that tick. Only a new real row is not covered; see point 3.
2. Row 4 can pass with the guards removed. Accepted. It is not always empty proof (a pre_arrival visit from tick 29 is 10 minutes old at the pause tick, and a recall at B can drop the count to 8), but in most runs nothing would join anyway. Fix: before the pause, the check makes the case real at site B: one demo pre_arrival visit 10 minutes old, and B's waiting count below 9 (move 2 waiting demo visits to removed). A new row counts every B demo row added or moved to waiting after the pause (expected 0).
3. Row 1 is weak when real visits are closed. Accepted. Our 3 real visits may all be closed. Fix: inside the rollback, the check adds its own real visits (is_demo = false) at site A in active states (pre_arrival, waiting, called, on_the_way) and moves their times back with the demo times, so every time rule in the function sees them. A new row counts real rows that are new at the end (expected 0).
4. Row 7 does not prove the 2-attempt rule. Accepted. New row: unable_to_reach demo visits with fewer than 2 phone attempts (expected 0).
5. Not deterministic; demo rows from before are counted. Determinism rejected: ids come from gen_random_uuid(), so the expected values are already ranges and "in most runs". Demo rows from before: accepted, new row "demo visits before the check" (expected 0), so a run on a database that already has demo visits shows it at once.
6. A pause in the same ms as step 5 can still add a declined or not_eligible row. True. These rows never join the line (declined and not_eligible are closed at once). Recommendation: no fix, write it in decisions.md. Owner question below.

Not changed by this review: the migration. All fixes in points 1 to 5 are in supabase/checks/demo_tick.sql only, which saves nothing (begin ... rollback).

## Result of the fixes (2026-11-18)

Points 1 to 5 are fixed in supabase/checks/demo_tick.sql (commit 761479a); point 6 is a decision (no fix, docs/decisions.md). The owner ran the new check in the SQL Editor. All 13 rows are as expected: 00 demo visits before 0; 01 real visits checked 8 (3 real and 5 test visits); 02 real visits changed 0; 03 real visits added 0; 04 site A waiting 9; 05 site B waiting 9; 06 site B added or waiting after pause 0; 07 call-backs at A 9; 08 demo arrived 12; 09 phone attempts recorded 6; 10 unable_to_reach 2; 11 unable_to_reach with under 2 attempts 0; 12 changes while running is false 0.
