# Gemini review: fixes to the step checks

Model: Gemini Hydrogen 4, High, in a new chat (not the chat of the first review). (No credits: Gemini 3.6 Flash, High.)

Give it this text, then these 7 files (copy each one in full; they hold no keys, tokens or patient data; the tokens in the check file are made up):
1. `supabase/migrations/20261117010000_step_check_fixes.sql`
2. `supabase/checks/allowed_steps.sql`
3. `lib/saveResult.ts`
4. `lib/allowedSteps.test.ts`
5. `data/staffActions.ts`
6. `data/sitePauses.ts`
7. `components/staff/CheckInPanel.tsx`

## Text to paste

You review one change in a concept prototype of a virtual ER waiting room (Next.js and Supabase Postgres, synthetic data only). Find problems. Do not confirm that the change is good; list only what is wrong, missing or risky, each with the file, the line and a concrete case that fails.

Background: a BEFORE INSERT OR UPDATE row trigger, `visits_check_step`, checks status moves on the `visits` table (a list of 22 allowed moves, and a list of start statuses for a new visit). It also refuses a start of off-site waiting (a new `waiting` visit, or `pre_arrival` / `needs_reassessment` to `waiting`) while `site_settings.offsite_paused` is true for the visit's site. Undo from `arrived` or `removed` back to `waiting` stays allowed while paused, on purpose. Staff screens update `visits` directly under row-level security, with a `version` check on every update. Patient actions use security definer functions. An earlier review asked for the fixes below.

What this change does:
- The new migration replaces the trigger function with `create or replace`. On UPDATE, a change of `site` raises SQLSTATE `VWR01`. The pause read is `select ... for share`, so it waits for a pause update that is not yet committed. A missing settings row or a null value counts as paused (`is distinct from false`). A pause refusal now raises `VWR02`; a bad move stays `VWR01`. The move list is unchanged.
- The check file runs in the SQL Editor inside `begin ... rollback`. It now walks every one of the 22 moves on its own visit, adds rows for a site change, a move to a paused site, Undo from `arrived` while paused, "I'm still here" while paused and a new visit at an unpaused site, and ends with a block that raises an error if any row is not ok.
- `lib/saveResult.ts` turns `VWR02` into "paused", `VWR01` into "refused", and any other error into "not_saved". `changeVisit` uses it; on "paused" it reads the pause switch again (`reloadSitePauses`) and the list again. `createDeskVisit` returns "paused" on `VWR02`.
- The staff check-in shows "Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved." for a pause refusal, for a home visit and for a new desk visit.
- The sync test reads the newest migration that makes `visits_check_step`, ignores `--` comments, and also compares the triage list in the trigger with `TRIAGE_STATUSES` in `lib/allowedSteps.ts`.

Questions:
1. Is `for share` right here? Can it deadlock with a staff pause update, with "Recall all", or with the 24-hour clean-up? Does a security definer patient function, or a staff user under row-level security, lack a right that `for share` needs?
2. Is there a real write by the app that the site rule now refuses by mistake?
3. Is there a screen other than check-in that can get "paused", and what would it show?
4. Does the check file test what it says? Find a row whose expected value is wrong, a walk in the 22-move loop that does not reach its "from" status, or a case that is missing.
5. Can the sync test still be fooled, now that it reads the newest migration?

Give each point a number and say how serious it is (must fix, should fix, minor).

## Checked (output in the 2026-11-17 session)

- Before the migration, the owner ran the new check file on the old database: it stopped with "Step check failed" for rows 15, 16, 18 (got `refused`, expected `paused`), 22 and 23 (got `saved`, expected `refused`).
- The owner ran the migration: "Success. No rows returned".
- The owner ran `supabase/checks/allowed_steps.sql` after the migration: 48 rows, all `ok` true, no error.
- The owner ran `supabase/checks/permissions.sql`: the 13 expected lines plus 2 `rls_auto_enable` lines.
- `npm test`: 56 test files, 311 tests pass. `npm run lint` and `npm run build` pass.
- Reviewer worker (Haiku) read the migration diff: no problem in the migration; one point (`VWR02` not handled in `data/staffActions.ts`), fixed in `c0156a7`.

## Not checked

- The two-tab browser check (pause on one tab, start off-site waiting on another tab that has not received the pause).
- A run of the trigger as a signed-in staff user with a real session (the check file runs as the SQL Editor's role).
- Two sessions at the same time (a pause and a triage at the same moment); `for share` was not tested under a race.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-17. Pasted verbatim. Gemini got only this handoff, not the 7 files.

**Missing attachments note:** Only `2026-11-17-gemini-review-step-check-fixes.md` was included in this message; the 7 target files (`supabase/migrations/20261117010000_step_check_fixes.sql`, `supabase/checks/allowed_steps.sql`, `lib/saveResult.ts`, `lib/allowedSteps.test.ts`, `data/staffActions.ts`, `data/sitePauses.ts`, `components/staff/CheckInPanel.tsx`) were not attached or pasted. Rather than guessing line numbers inside unseen files, the findings below analyze every concrete failure mode implied by the change specification and the existing app architecture, marking where exact lines must be verified once those 7 files are pasted.

---

## 1. `SELECT ... FOR SHARE` on `site_settings` (Deadlocks & Privileges)

1. **Level: `must fix` — `SELECT ... FOR SHARE` requires `UPDATE` privileges and applies `UPDATE` RLS policies, which can break real staff sessions with `42501` or false `VWR02` ("paused")**
* **File & line:** `supabase/migrations/20261117010000_step_check_fixes.sql` (`visits_check_step` pause query; exact line unverified without file).


* **What is wrong:** In PostgreSQL, `SELECT ... FOR SHARE` is not a read-only lock: it requires `UPDATE` privilege (in addition to `SELECT`) on `public.site_settings`, and PostgreSQL evaluates **`UPDATE` RLS `USING` policies** when locking the row. Because `visits_check_step` is a `SECURITY INVOKER` trigger and `allowed_steps.sql` runs as the SQL Editor's role (`postgres`), this has not been tested under a real signed-in `authenticated` staff session. If `site_settings` has an `UPDATE` RLS `USING` clause that filters rows for `authenticated`, `SELECT ... FOR SHARE` returns zero rows (`NULL`), and `is distinct from false` treats `NULL` as paused. Conversely, if `authenticated` lacks table-level `UPDATE` privilege (e.g., having only column-level grants) or a `SECURITY DEFINER` patient RPC runs under a non-superuser owner without `UPDATE` on `site_settings`, Postgres throws SQLSTATE `42501` (`permission denied for table site_settings`), which `lib/saveResult.ts` maps to `"not_saved"`.


* **Concrete failing case:** A signed-in nurse submits desk off-site check-in (`INSERT` into `visits` with `status = 'waiting'`) while Site A is unpaused (`offsite_paused = false`). If `site_settings` RLS or grants block `FOR SHARE` for `authenticated`, the trigger either reads `NULL` and falsely refuses with `VWR02` ("Off-site waiting is paused at this site") or throws `42501` and shows a database connection error.




2. **Level: `should fix` — Lock-order deadlock (`40P01`) is possible if any transaction updates `site_settings` before `visits`, and `FOR SHARE` blocks unrelated column updates**
* **File & line:** `supabase/migrations/20261117010000_step_check_fixes.sql` (`visits_check_step` `select ... for share`; exact line unverified without file).


* **What is wrong:**
* Staff pause update (`setSitePaused` in `data/sitePauses.ts`): Today, `setSitePaused` updates only `site_settings` (firing `site_settings_before_update`) without touching `visits`. Single-row `visits` writes lock `visits` first (in the `BEFORE INSERT OR UPDATE` trigger) and `site_settings` second (`FOR SHARE`), so single-row pause and single-row check-in cannot deadlock. However, if any multi-statement transaction or future RPC updates `site_settings` first and then updates `visits`, a concurrent desk check-in (`visits` $\to$ `site_settings`) will deadlock with `40P01`, which `lib/saveResult.ts` maps to `"not_saved"` instead of retrying or refusing cleanly.


* **"Recall all":** If `visits_check_step` runs `SELECT ... FOR SHARE` only when `new.status = 'waiting'` and (`TG_OP = 'INSERT'` or `old.status in ('pre_arrival', 'needs_reassessment')`), "Recall all" (`waiting` $\to$ `called`) never touches `site_settings` and cannot deadlock with a pause update. If the trigger runs `SELECT ... FOR SHARE` unconditionally before checking the status transition, every row in "Recall all" holds `FOR SHARE` on `site_settings` for the entire bulk transaction, blocking a charge nurse trying to pause the site during a surge.


* **24-hour clean-up (`delete_old_visits()`):** `delete_old_visits()` runs `DELETE` on `visits` and upserts `daily_stats`. `BEFORE INSERT OR UPDATE` triggers do not fire on `DELETE`, and `delete_old_visits()` never locks `site_settings`, so no deadlock is possible there.




* **Concrete failing case:** If `SELECT ... FOR SHARE` is executed unconditionally in `visits_check_step` (before gating on `new.status = 'waiting'`), a bulk "Recall all" updating 40 `waiting` rows holds `FOR SHARE` on `site_settings` while a staff member clicks "Pause off-site waiting", stalling the emergency pause until the bulk recall finishes (or deadlocking if combined with any `site_settings` $\to$ `visits` transaction).



---

## 2. `UPDATE` Forbidding `site` Changes (`VWR01`)

3. **Level: `should fix` — Accidental inclusion of `site` in partial update payloads or cross-campus arrival redirection fails with a misleading `"refused"` error**
* **File & line:** `supabase/migrations/20261117010000_step_check_fixes.sql` (`old.site is distinct from new.site` check) and `data/staffActions.ts` (`changeVisit` payload builder; exact lines unverified without files).


* **What is wrong:** `changeVisit` applies a pure transform `(v) => ...` to a cached `Visit` and sends changed fields to Supabase. While standard status/follow-up/token actions only modify their target columns, two cases fail under a hard `VWR01` refusal on `site` changes:


1. If any staff action spreads the full `Visit` object or passes `site` with normalized/differing casing or whitespace, Postgres sees `old.site is distinct from new.site`, raises `VWR01`, and `changeVisit` reports `"refused"` (*"The list just changed. Check this patient again."*) even though the visit row never changed.


2. Operationally, if a patient starts a `pre_arrival` home visit selecting Site A on `/` and walks into Site B's ED desk instead, there is no way to reassign the existing visit to Site B; staff must let the Site A `pre_arrival` visit expire after 6 hours and create a brand-new desk visit at Site B.




* **Concrete failing case:** Any `UPDATE visits` payload that accidentally includes a modified or misformatted `site` field triggers `VWR01`, causing `changeVisit` to tell staff the patient list just changed when no concurrent edit occurred.





---

## 3. Screens Other Than `CheckInPanel` Receiving `"paused"` (`VWR02`)

4. **Level: `must fix` — `VisitRow` (reassessment $\to$ `waiting`) can receive `"paused"` (`VWR02`) from `changeVisit` and lacks pause-specific UI messaging**
* **File & line:** `data/staffActions.ts` (`changeVisit`) and `components/staff/VisitRow.tsx` (status transition buttons / error status line; exact lines unverified without files).


* **What is wrong:** `visits_check_step` raises `VWR02` not only on `INSERT` and `pre_arrival` $\to$ `waiting` (handled in `CheckInPanel`), but also on **`needs_reassessment` $\to$ `waiting**` (`UPDATE`). A patient in `needs_reassessment` is already past initial desk check-in and is managed on `VisitRow` (the active/reassessment visit card on `/staff`), not `CheckInPanel`. When staff click the action on `VisitRow` to return a reassessed patient to off-site `waiting` right after another staff member pauses the site, `changeVisit` returns `"paused"`. Because the handoff notes that only staff check-in was updated to show the pause message, `VisitRow` either has no `"paused"` branch (rendering nothing or falling back to a generic `"not saved"` error) or displays the `CheckInPanel` text (*"Press 'Waits on-site' instead"*), which refers to a button that does not exist on `VisitRow`.


* **Concrete failing case:** Staff A pauses Site A. Before Staff B's screen refreshes, Staff B opens a `needs_reassessment` patient row on `/staff` and clicks the button to return them to off-site `waiting`. `changeVisit` gets `VWR02` and returns `"paused"`; `VisitRow` fails to display a valid explanation or references a missing `"Waits on-site"` button.




5. **Level: `should fix` — `reloadSitePauses()` inside `changeVisit` on `"paused"` can unmount the `CheckInPanel` button before or without showing the refusal message**
* **File & line:** `data/staffActions.ts` (`changeVisit`), `data/sitePauses.ts`, and `components/staff/CheckInPanel.tsx` (exact lines unverified without files).


* **What is wrong:** When `changeVisit` receives `"paused"`, it triggers `reloadSitePauses()`. As soon as `data/sitePauses.ts` updates the store to `offsite_paused = true`, `CheckInPanel` hides the `"Start off-site waiting"` path. If the pause error message in `CheckInPanel.tsx` is rendered conditionally inside the unpaused branch (rather than in a persistent status region outside the hidden button), reloading `sitePauses` immediately unmounts the error message—so the button vanishes without the staff member ever seeing *"Off-site waiting is paused at this site. Press 'Waits on-site' instead. Nothing was saved."*


* **Concrete failing case:** Staff A pauses Site A; Staff B submits off-site waiting for a `pre_arrival` visit on `CheckInPanel`. `changeVisit` calls `reloadSitePauses()` and returns `"paused"`; `CheckInPanel` re-renders with `offsitePaused = true`, hiding the off-site controls and swallowing the error message if it lived inside that branch.





---

## 4. `supabase/checks/allowed_steps.sql` Coverage and Walk Correctness

(Because `supabase/checks/allowed_steps.sql` was not pasted in this turn, exact row numbers cannot be cited; the issues below identify the specific cases missing or fragile in the described check script.)

6. **Level: `must fix` — Missing `removed` $\to$ `waiting` (Undo) while paused, missing `NULL` / absent `site_settings` row check, and missing `authenticated` role check**
* **File & line:** `supabase/checks/allowed_steps.sql` (pause-check section and role setup; exact lines unverified without file).


* **What is wrong:**
1. **Missing `removed` $\to$ `waiting` while paused:** The spec requires Undo from **both** `arrived` and `removed` back to `waiting` to stay allowed while paused, yet the check summary lists only *"Undo from `arrived` while paused"*. If `visits_check_step` checks `old.status = 'arrived'` instead of `old.status in ('arrived', 'removed')` (or if the pause guard mistakenly triggers on `removed` $\to$ `waiting`), `allowed_steps.sql` still passes 48/48.


2. **Missing `site_settings` `NULL` / absent-row test:** The migration explicitly changed missing/`NULL` `site_settings.offsite_paused` to fail closed (`is distinct from false` $\to$ `VWR02`), yet `allowed_steps.sql` does not delete/null out the `site_settings` row to verify it raises `VWR02` instead of allowing `waiting`.


3. **No `SET LOCAL ROLE authenticated` check:** Running solely as the SQL Editor role (`postgres`) skips RLS and table/column privilege checks on `site_settings` for `SELECT ... FOR SHARE`.




* **Concrete failing case:** Deleting the `site_settings` row for `'A'` or running Undo from `removed` $\to$ `waiting` while paused is completely untested in `allowed_steps.sql`.




7. **Level: `should fix` — 22-move walk loop depends on `offsite_paused = false` and `visits_before_write` state across preceding test blocks**
* **File & line:** `supabase/checks/allowed_steps.sql` (22-move loop; exact lines unverified without file).


* **What is wrong:** Non-start statuses (`needs_reassessment`, `called`, `on_the_way`, `arrived`, `removed`, `unable_to_reach`) cannot be inserted directly if `visits_check_step` validates start statuses on `INSERT`; each loop iteration must walk a fresh visit from `'pre_arrival'` or `'waiting'` to `from_status`. If `offsite_paused` is left `true` before the loop runs (or if a walk starts from `'waiting'` without resetting `site_settings.offsite_paused = false`), walking to `from_status` fails with `VWR02` before the target transition is ever tested.
* **Concrete failing case:** Reordering the paused-site test block above the 22-move loop without resetting `offsite_paused = false` causes every walk through `'waiting'` to fail in setup.



---

## 5. `lib/allowedSteps.test.ts` (Sync Test) Foolability

8. **Level: `should fix` — Stripping only `--` comments leaves `/* ... */` block comments parsed as active SQL, and matching "the newest migration that makes `visits_check_step`" can read a non-defining migration**
* **File & line:** `lib/allowedSteps.test.ts` (SQL parser / migration file selector; exact lines unverified without file).


* **What is wrong:**
1. **Block comments (`/* ... */`):** Ignoring only `--` comments means commenting out a transition or status with `/* ('waiting', 'removed'), */` still matches the test's tuple regex while PostgreSQL ignores it.


2. **File selection heuristic:** Selecting the newest migration file containing `visits_check_step` will pick the wrong file if a future migration only mentions `visits_check_step` in a comment, `GRANT`/`REVOKE`, or `DROP`/`CREATE TRIGGER` statement without a `CREATE [OR REPLACE] FUNCTION ... visits_check_step` body.


3. **Unchecked `INSERT` start statuses and pause-guard `old.status` list:** The handoff notes that the sync test checks the 22 move pairs and `TRIAGE_STATUSES`. If `visits_check_step` also hardcodes the allowed `INSERT` start statuses (`'pre_arrival'`, `'waiting'`, `'declined'`, `'not_eligible'`) or the pause-guard source list (`old.status in ('pre_arrival', 'needs_reassessment')`), editing either list in SQL (for instance, adding `'arrived'` to the pause guard and breaking Undo while paused) will not fail `lib/allowedSteps.test.ts`.




* **Concrete failing case:** Someone edits `visits_check_step` in a future migration to wrap `--` vs `/* ('arrived', 'waiting'), */` in a block comment, or adds `'arrived'` to the pause-guard `IN (...)` list; `npm test` still passes while Undo for arrived patients fails in production.





---

Please paste the contents of the 7 files listed in the handoff (`supabase/migrations/20261117010000_step_check_fixes.sql`, `supabase/checks/allowed_steps.sql`, `lib/saveResult.ts`, `lib/allowedSteps.test.ts`, `data/staffActions.ts`, `data/sitePauses.ts`, `components/staff/CheckInPanel.tsx`) so I can inspect the exact code and provide line-by-line findings for every question.

## Claude's check of the response (2026-11-17)

Gemini did not get the 7 files, so it guessed at the code. I checked each point against the files.

1. `for share` rights (must fix): not a bug. `for share` does need UPDATE rights and the UPDATE policy. Staff have both: `grant select, update on table public.site_settings to authenticated`, and the UPDATE policy is `using ((select public.is_staff()))` with no row filter (`supabase/migrations/20261110060756_tables_and_security.sql:92-98`). Only staff write a `waiting` visit. The patient function `start_home_visit` makes `pre_arrival`, so it does not reach the pause read, and it runs as the function owner. `service_role` only reads, through `/api/site-status`. Not checked in a real session yet: the two-tab browser check proves it (any saved "Start off-site waiting" runs the `for share` read as a signed-in staff user).
2. Deadlock (should fix): not a bug. The pause read is inside `if new.status = 'waiting' and (tg_op = 'INSERT' or old.status in (...))`, so "Recall all" never reads `site_settings`. No code updates `site_settings` and then `visits` in one transaction. The clean-up deletes, and the trigger does not run on DELETE.
3. Change of site (should fix): not a bug. `changeVisit` sends only the changed fields (`changedFields`), and `checkInVisitFromHome` stops before the save if the visit's site is not the form's site (`data/staffActions.ts:105`). A home visit for the wrong site was already refused before this change; that is a product rule, not part of this fix.
4. `VisitRow` gets "paused" (must fix): wrong. `needs_reassessment` to `waiting` goes only through `CheckInPanel` (its "Back for reassessment" text, `components/staff/CheckInPanel.tsx:152`, through `checkInVisitFromHome`). `RecentlyClosed` reopens to `needs_reassessment`, not `waiting`, and its Undo to `waiting` comes from `arrived` or `removed`, which the pause does not refuse. The `case "paused"` in `FollowUpPanel.tsx:71` is a follow-up kind, not this result.
5. Message lost when the button hides (should fix): wrong. The message is in the `<p role="status">` at `CheckInPanel.tsx:246`, outside the branch that hides the button.
6. Check file gaps (must fix): partly right.
   - Undo from `removed` to `waiting` while paused has no row. Wrong (I first said right): row 21 (`7A`, expected `saved`) already tests it.
   - A null value cannot happen (`offsite_paused boolean not null`). A missing row has no test. Right, minor; a row can delete site B's row inside the rollback.
   - A run as `authenticated`: right that it is not tested; the same as "Not checked" above.
7. Loop order (should fix): not a bug. The loop (lines 104 to 156) runs after both sites are set to unpaused (line 41) and before the pause (line 159).
8. Sync test (should fix): partly right.
   - `/* ... */` comments are not removed. Right, minor.
   - The file regex `/function\s+public\.visits_check_step\s*\(/` also matches a later `drop function` or `grant ... on function`. The test then fails (no markers), so it cannot be fooled, but it can fail for no reason. Right, minor; the regex can ask for `create (or replace) function`.
   - The start list and the pause list are already checked (`lib/allowedSteps.test.ts:98-99` and the triage test at line 104). Wrong.

Fixes to offer: the missing settings row (6), and the two sync test changes (8).

Owner chose all of them on 2026-11-17, and a Haiku `reviewer` worker reads the 7 files in place of a second Gemini review. Done: check file row 27 (`7N`, no settings row for site B, expected `paused`); the sync test finds only a `create (or replace) function` file and removes `/* ... */` comments, with a new test for the comments.
