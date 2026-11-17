# Gemini review: step checks in the database

Model: Gemini Hydrogen 4, High, in a new chat. (No credits: Gemini 3.6 Flash, High.)

Give it this text, then these 5 files (copy each one in full; they hold no keys, tokens or patient data; the tokens in the check file are made up):
1. `supabase/migrations/20261117000000_allowed_steps.sql`
2. `supabase/checks/allowed_steps.sql`
3. `lib/allowedSteps.ts`
4. `lib/allowedSteps.test.ts`
5. `data/staffActions.ts`

## Text to paste

You review one change in a concept prototype of a virtual ER waiting room (Next.js and Supabase Postgres, synthetic data only). Find problems. Do not confirm that the change is good; list only what is wrong, missing or risky, each with the file, the line and a concrete case that fails.

What the change does:
- Staff screens save visit changes straight to the `visits` table (row-level security lets signed-in staff update it), with an optimistic `version` check. Until now only the app checked that a status move is allowed.
- A new BEFORE INSERT OR UPDATE row trigger, `visits_check_step`, raises SQLSTATE `VWR01` when: an insert has a status that is not `pre_arrival`, `waiting`, `declined` or `not_eligible`; an update changes the status to one not in the list of 22 allowed moves; or a visit starts waiting off-site (insert as `waiting`, or `pre_arrival` / `needs_reassessment` to `waiting`) while `site_settings.offsite_paused` is true for its site. Undo from `arrived` or `removed` back to `waiting` stays allowed while paused, on purpose.
- An older BEFORE trigger, `visits_before_write`, sets every time column to now() and raises `version`. Postgres runs triggers on the same event in name order, so it runs first.
- Patient actions use security definer functions; `confirm_on_my_way(p_token)` now also fills `seen_at` when it is empty.
- The time rules (phone steps after a recall, in minutes) stay in the app on purpose.
- The app keeps the same move list in `lib/allowedSteps.ts`; a test reads the migration text and fails if the lists differ.
- In `data/staffActions.ts`, `changeVisit` returns "refused" and reloads the list on `VWR01`; `createDeskVisit` returns null on any error.

Questions:
1. Is there a real write by the app (in `data/staffActions.ts`, or the patient functions) that the trigger refuses by mistake? Is there an impossible move that it still allows?
2. Is the trigger safe: `security invoker`, `search_path = ''`, the read of `site_settings` by a signed-in staff user and by security definer functions, and the revoke on the trigger function?
3. Race cases: a site paused between the staff screen's read and the save; two screens that change one visit at the same time; "Recall all" (one update for many rows, filtered on `status = 'waiting'`).
4. Does the check file test what it says? Find a row whose expected value is wrong, or a case that is missing.
5. Is the SQL-to-lib sync test easy to fool (for example, a pair written in a different format, or a comment inside the list)?
6. Is the staff message for a refusal ("The list just changed. Check this patient again.") right for every way `VWR01` can happen?

Give each point a number and say how serious it is (must fix, should fix, minor).

## Checked (output in the 2026-11-16 session)

- `npm test`: 55 test files, 307 tests pass. `npm run lint` and `npm run build` pass.
- The owner ran the migration in the Supabase SQL Editor: "Success. No rows returned".
- The owner ran `supabase/checks/allowed_steps.sql`: 21 rows, all `ok` = true.
- The owner ran both `permissions.sql` queries: the expected list (anon and authenticated rights unchanged; `visits_check_step` not callable by them) and no table without row-level security.
- Browser check by the owner on localhost: desk check-in, Recall patient, Mark arrived and Undo save; while paused the off-site choice is hidden on the staff check-in and the patient start page shows the paused message.
- Reviewer worker (Haiku) read the diff: one real point (a refusal showed "could not be reached"), fixed in `cd70689`.

## Not checked

- Whether `service_role` can run `visits_check_step` directly (the revoke names only public, anon and authenticated; a trigger function cannot be called as a plain function anyway).
- A refused staff save on the real screen (the screen hides the off-site choice, so no refusal was seen in the browser).
- The trigger does not check a change of `site` on update; no screen changes `site`.

## Response

Gemini Hydrogen 4, High, 2026-11-16 (pasted by the owner, unchanged):

(Note: `lib/allowedSteps.ts`, `lib/allowedSteps.test.ts`, and `data/staffActions.ts` were not readable in the prompt attachments, so exact line numbers inside those three TypeScript files are omitted rather than guessed; every SQL line number below refers to `supabase/migrations/20261117000000_allowed_steps.sql` and `supabase/checks/allowed_steps.sql`.)

### 1. The Trigger

1. Level: `should fix` — `NULL` status bypasses both `NOT IN` checks via SQL three-valued logic
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 26 and 31–40.
* What is wrong: `new.status not in ('pre_arrival', 'waiting', 'declined', 'not_eligible')` (line 26) and `(old.status, new.status) not in (...)` (lines 31–40) evaluate to `NULL` (falsy in an `IF` condition) whenever `new.status` is `NULL`.
* Concrete failing case: An `UPDATE visits SET status = NULL WHERE id = ...` passes `new.status is distinct from old.status` (line 29), evaluates `('waiting', NULL) not in (...)` to `NULL`, and exits the trigger without raising `VWR01` (either writing `NULL` or failing with constraint code `23502` instead of `VWR01`, which `changeVisit` fails to classify as `"refused"`).

2. Level: `should fix` — `UPDATE` does not forbid changing `site`
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 29–44 (and noted as unchecked in `2026-11-16-gemini-review-allowed-steps.md`).
* What is wrong: Signed-in staff update `visits` directly via row-level security, and `visits_check_step` never checks `old.site is distinct from new.site`.
* Concrete failing case: A buggy screen or direct PostgREST call runs `UPDATE visits SET site = 'B' WHERE id = ...` on an active visit at site `'A'`; `new.status is distinct from old.status` is `FALSE`, so the row silently moves between hospital sites.

3. Level: `minor` — Undo transitions do not verify prior call or confirmation timestamps
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 38–39.
* What is wrong: `('arrived', 'called')`, `('arrived', 'on_the_way')`, `('removed', 'called')`, and `('removed', 'on_the_way')` check only `(old.status, new.status)` and ignore `called_at` and `confirmed_at`.
* Concrete failing case: A visit that went directly `'waiting' -> 'arrived'` (never recalled, `called_at` empty) can be updated to `'on_the_way'` via `'arrived' -> 'on_the_way'`, skipping both `'called'` and patient confirmation.

4. Level: `minor` — Trigger ordering relies only on alphabetical naming
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 63–65 (`2026-11-16-gemini-review-allowed-steps.md`).
* What is wrong: `visits_before_write` runs before `visits_check_step` only because `'visits_before_write' < 'visits_check_step'` alphabetically.
* Concrete failing case: Any future `BEFORE` trigger named alphabetically after `visits_check_step` (e.g., `visits_sync_status`) that mutates `new.status` will run *after* `visits_check_step` and bypass all step and pause checks.

### 2. The Pause Check

5. Level: `must fix` — Moving a `'waiting'` visit to a paused site via `UPDATE` bypasses the pause check
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 49–55.
* What is wrong: The pause guard only runs when `tg_op = 'INSERT' or old.status in ('pre_arrival', 'needs_reassessment')` (line 50).
* Concrete failing case: Site `'A'` has `offsite_paused = true` and site `'B'` has `offsite_paused = false`. Running `UPDATE visits SET site = 'A' WHERE id = ...` on a `'waiting'` visit at site `'B'` has `old.status = 'waiting'` and `new.status = 'waiting'`, so line 50 evaluates to `FALSE` and adds a new off-site waiting visit to paused site `'A'`.

6. Level: `should fix` — Missing `site_settings` row fails open instead of failing closed
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 51–54.
* What is wrong: `select offsite_paused into site_paused from public.site_settings where site = new.site;` assigns `NULL` when no row matches `new.site`, and `if coalesce(site_paused, false)` treats `NULL` as unpaused.
* Concrete failing case: If a visit is inserted with a `site` code missing from `public.site_settings` (or if an RLS policy ever hides the row from the invoking role), `site_paused` is `NULL` and the trigger allows off-site waiting instead of refusing. Checking `if site_paused is distinct from false` fails closed unless a row explicitly confirms `offsite_paused = false`.

7. Level: `should fix` — `security invoker` ties `visits` writes to caller `SELECT` rights on `site_settings`
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 18 and 51.
* What is wrong: Because `visits_check_step` is `security invoker` (line 18), line 51 reads `public.site_settings` under the caller's role and RLS policies. While current staff (`authenticated`) have `is_staff()` read access and patient functions are `security definer`, any future `security invoker` writer or role allowed to insert/update `visits` without `SELECT` on `site_settings` will fail with PostgreSQL `42501` (`permission denied for table site_settings`) instead of `VWR01`.
* Concrete failing case: A non-staff database role or restricted RPC without `SELECT` on `public.site_settings` tries to insert a `'waiting'` visit; the trigger throws `42501` instead of `VWR01`, breaking app error handling.

### 3. Race Cases

8. Level: `must fix` — Concurrent pause and desk check-in/triage have a `READ COMMITTED` TOCTOU race
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 51–54.
* What is wrong: Line 51 executes a plain `SELECT offsite_paused ... FROM public.site_settings WHERE site = new.site` with no row-level share lock (`FOR KEY SHARE` / `FOR SHARE`).
* Concrete failing case: Transaction 1 (staff pausing site `'A'`) runs `UPDATE site_settings SET offsite_paused = true WHERE site = 'A'`, while Transaction 2 (desk check-in) concurrently inserts a `'waiting'` visit at site `'A'`. Under `READ COMMITTED`, Transaction 2 reads the pre-commit `offsite_paused = false` snapshot before Transaction 1 commits, resulting in site `'A'` being paused *and* a brand-new off-site `'waiting'` visit committing right after. Adding `for key share` on line 51 forces the check to wait for an in-flight `site_settings` update.

9. Level: `should fix` — Stale-read pause race on desk check-in produces generic `"not saved"` instead of a pause explanation
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 11–12 and 53; `data/staffActions.ts` (`createDeskVisit`, described in `2026-11-16-gemini-review-allowed-steps.md`).
* What is wrong: If staff submit desk check-in while their screen still shows the site as unpaused (right after another screen paused it), `visits_check_step` raises `VWR01` (`Off-site waiting is paused at site %`), but `createDeskVisit` returns `null` on every error and renders `"not saved"` without reloading pause state or explaining why.
* Concrete failing case: Staff A pauses site `'A'`; Staff B submits off-site desk check-in before the next poll; Staff B sees `"not saved"` with the off-site option still visible instead of being told off-site waiting is paused.

10. Level: `should fix` — Concurrent two-screen edits rely on client `version` filters; an unversioned write can silently trigger Undo
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 38–39; `data/staffActions.ts` (`2026-11-16-gemini-review-allowed-steps.md`).
* What is wrong: When two staff screens update the same visit with `.eq('version', v)`, the second update matches `0` rows (so `visits_check_step` never fires and `changeVisit` relies on `0` affected rows to return `"refused"`). However, if any update omits `.eq('version', v)`, the trigger checks `(old.status, new.status)` against the newly committed status—and because `('arrived', 'waiting')` and `('removed', 'waiting')` are allowed moves (lines 38–39), a stale write setting `status = 'waiting'` looks identical to an intentional Undo.
* Concrete failing case: Screen 1 marks a `'called'` visit `'arrived'`; a concurrent unversioned update setting `status = 'waiting'` passes `('arrived', 'waiting')` in `visits_check_step` and silently reopens an arrived patient.

11. Level: `should fix` — Bulk "Recall all" rolls back all rows if one row raises `VWR01`, and risks deadlock (`40P01`) misclassification
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 42 and 63–65; `data/staffActions.ts` (`2026-11-16-gemini-review-allowed-steps.md`).
* What is wrong: Because `visits_check_step` is a `FOR EACH ROW` trigger raising an exception, a multi-row `UPDATE` is atomic: if even one targeted row fails `VWR01`, every row in the statement rolls back. Additionally, a multi-row `UPDATE ... WHERE status = 'waiting'` acquires row locks across many rows concurrently with single-row updates, which can trigger PostgreSQL deadlock `40P01`—an error code `staffActions.ts` does not map to `"refused"` (treating it as a connection failure instead).
* Concrete failing case: Two staff tabs trigger "Recall all" and an individual visit update at the same instant, locking rows in opposite orders; Postgres raises `40P01` and the UI tells staff the database could not be reached.

### 4. The Check File

12. Level: `must fix` — `allowed_steps.sql` skips `arrived -> waiting` while paused and omits 12 of the 22 allowed moves
* File and line: `supabase/checks/allowed_steps.sql`, lines 8, 39–40, and 107–113.
* What is wrong: Line 8 claims `7A` tests `arrived, Undo`, and keeping Undo from `arrived` or `removed` back to `waiting` allowed while paused is a core requirement, yet Row 7 only tests `arrived -> on_the_way` while unpaused (lines 39–40) and Row 21 only tests `removed -> waiting` while paused (lines 111–113). In total, 12 of the 22 allowed pairs are never executed: `('pre_arrival', 'waiting')`, `('pre_arrival', 'not_eligible')`, `('needs_reassessment', 'waiting')`, `('needs_reassessment', 'declined')`, `('waiting', 'arrived')`, `('waiting', 'removed')`, `('called', 'arrived')`, `('called', 'removed')`, `('arrived', 'waiting')`, `('arrived', 'called')`, `('removed', 'called')`, and `('removed', 'on_the_way')`.
* Concrete failing case: Deleting `('arrived', 'waiting')` from `20261117000000_allowed_steps.sql` line 38 breaks Undo for arrived patients, yet all 21 rows in `allowed_steps.sql` still return `ok = true`.

13. Level: `should fix` — Check file runs only as SQL Editor superuser (`postgres`), never testing `authenticated` RLS or `REVOKE EXECUTE`
* File and line: `supabase/checks/allowed_steps.sql`, lines 16–117.
* What is wrong: Running the file in the Supabase SQL Editor executes as `postgres` (superuser), which bypasses row-level security on `public.site_settings` and ignores `REVOKE EXECUTE`. The script never switches to `set local role authenticated` (with staff JWT claims) to verify that the `security invoker` trigger can actually read `public.site_settings` during a real staff write.
* Concrete failing case: If `site_settings` lacks `SELECT` grant or RLS policy for `authenticated`, `allowed_steps.sql` passes 21/21 in the SQL Editor while every real staff check-in fails in the browser with `42501`.

14. Level: `should fix` — Missing no-op update while paused, unpaused-site isolation, and automated failure assertion
* File and line: `supabase/checks/allowed_steps.sql`, lines 88–115.
* What is wrong:
  1. Line 115 only runs `select n, what, got, expected, got = expected as ok from results order by n;` without a `DO $$ ... IF EXISTS (SELECT 1 FROM results WHERE got IS DISTINCT FROM expected) THEN RAISE EXCEPTION ...` block, so a failing check still exits cleanly.
  2. It never tests updating a `'waiting'` visit without changing `status` while paused (such as `record_still_here` updating `last_still_here_at`), nor inserting/triaging into `'waiting'` on site `'B'` while site `'A'` is paused.
  3. Line 51 (`alter table public.visits disable trigger visits_before_write;`) takes an `ACCESS EXCLUSIVE` table lock on `public.visits` for the rest of the transaction.
* Concrete failing case: If line 50 of the migration accidentally omitted `old.status in ('pre_arrival', 'needs_reassessment')` (blocking *any* update where `new.status = 'waiting'` while paused), `allowed_steps.sql` still passes 21/21 while patient `"I'm still here"` taps fail during a pause.

### 5. The Sync Test

15. Level: `should fix` — Regex/text sync check against the migration file can be fooled by SQL comments, formatting changes, or newer migrations
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 26, 30–40, and 50; `lib/allowedSteps.test.ts` (`2026-11-16-gemini-review-allowed-steps.md`).
* What is wrong:
  1. Commented-out pairs inside the marker block: `20261117000000_allowed_steps.sql` brackets the list with `-- allowed moves (keep the same as lib/allowedSteps.ts)` (line 30) and `-- end of allowed moves` (line 40). A regex extracting `('a', 'b')` pairs between those markers still matches a commented-out move like `-- ('waiting', 'removed'),`, so the test passes even after PostgreSQL stops allowing that move.
  2. Multi-line or whitespace variations: Splitting a tuple across lines (`(\n  'waiting',\n  'called'\n)`) or using uppercase SQL identifiers breaks single-line tuple regexes.
  3. Unchecked lists in the same trigger: The `INSERT` starting statuses on line 26 (`'pre_arrival', 'waiting', 'declined', 'not_eligible'`) and the pause-check source statuses on line 50 (`'pre_arrival', 'needs_reassessment'`) are not part of the 22-pair list and can drift from `lib/allowedSteps.ts` without failing the test.
  4. Single-file pinning: Reading only `20261117000000_allowed_steps.sql` means any future migration that runs `CREATE OR REPLACE FUNCTION public.visits_check_step()` with a changed move list will pass `lib/allowedSteps.test.ts` while live PostgreSQL behavior diverges.
* Concrete failing case: Someone disables `'waiting' -> 'removed'` in SQL by writing `-- ('waiting', 'removed'),` on line 34 of `20261117000000_allowed_steps.sql`; `npm test` still passes while PostgreSQL rejects removing waiting patients.

### 6. The Refusal Message

16. Level: `must fix` — `"The list just changed. Check this patient again."` is wrong whenever `VWR01` is caused by a site pause or an invalid move
* File and line: `supabase/migrations/20261117000000_allowed_steps.sql`, lines 11–12, 27, 42, and 53; `data/staffActions.ts` (`2026-11-16-gemini-review-allowed-steps.md`).
* What is wrong: `visits_check_step` raises the same SQLSTATE `'VWR01'` for three distinct causes—invalid initial status (line 27), invalid status transition (line 42), and off-site waiting paused (line 53)—and `changeVisit` maps every `VWR01` to `"refused"`, showing `"The list just changed. Check this patient again."`. That wording is only accurate when a concurrent update changed the patient's row (`0` rows matched on `.eq('version', ...)` or another staff member moved the visit first).
* Concrete failing case:
  * Paused site during triage: Staff opens a `pre_arrival` home visit and clicks triage to `"waiting"` right after another staff member pauses off-site waiting for that site. `visits_check_step` raises `VWR01` (`Off-site waiting is paused at site A`, line 53). The patient's row in the list never changed, yet staff see `"The list just changed. Check this patient again."` instead of `"Off-site waiting is paused at this site — offer on-site waiting instead."`
  * Disallowed transition: A buggy screen tries an impossible move (e.g., `pre_arrival -> arrived`, line 42); telling staff the list just changed causes them to retry the same broken action repeatedly instead of reporting an invalid status move. Using a separate error code (e.g., `VWR02` for paused site) or inspecting the `VWR01` error message in `data/staffActions.ts` lets both `changeVisit` and `createDeskVisit` show the true cause.

## Claude's check

Checked against the code on 2026-11-16 (head 2abca74).

1. Minor, not should fix. `status` is `text not null` with a check on the list (20261110060756_tables_and_security.sql line 36). A NULL status is refused by the column with code 23502, so it cannot be saved. Only the error code differs.
2. Accept. Nothing in the trigger stops a change of `site`. No screen changes the site, so a guard costs one line.
5. Accept, the same fix as 2. If the site cannot change, this path is closed.
3. Reject for now. This is a time and field rule. The owner chose "status moves only" on 2026-11-16. The Undo rules in lib/visitActions.ts restore the earlier status from the closure.
4. Minor. The order is written in the migration comment and in docs/decisions.md. No action.
6. Minor. `site` has a check `site in ('A', 'B')` and both rows are made in the first migration. Fail closed (`is distinct from false`) is cheap, so it can go in with 2.
7. Minor. Only staff (`authenticated`, which has SELECT on site_settings through is_staff) and security definer functions write visits. grep of app/, data/ and lib/ found no other writer.
8. Accept, but the suggested fix is wrong. A non-key UPDATE takes FOR NO KEY UPDATE. That lock conflicts with FOR SHARE, but not with FOR KEY SHARE. So `for key share` does not wait for the pause. The fix is `for share`.
9 and 16. Accept. A separate code for the pause (VWR02) lets changeVisit and createDeskVisit show "Off-site waiting is paused" and reload the pause state. VWR01 stays for a bad move, with its own message.
10. Not applicable. Every changeVisit write has `.eq("version", ...)`, and recallAll filters on `status = 'waiting'`. There is no unversioned write.
11. Reject. Recall all moves waiting to called, which is always in the list and has no pause check, so one row cannot raise VWR01. A deadlock is possible in theory but the current text ("not saved, try again") is a safe answer.
12. Accept. Loop all 22 pairs, and add arrived to waiting while paused.
13. Partly covered: the owner's browser check on 2026-11-16 ran real staff writes while paused. A `set local role authenticated` run is possible but needs a staff JWT claim in the check. Optional.
14. Accept 1 and 2 (a final assert, a still-here update while paused, site B while A is paused). Point 3 (ACCESS EXCLUSIVE lock) is true, but the check runs in one short transaction that rolls back, on a demo database. No action.
15. Accept 1 and 3 (strip SQL comments before the regex; also check the pause-source list and the start list). Point 2 is minor. Point 4 is real: a note in the migration and a test that no later migration redefines visits_check_step.
