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
