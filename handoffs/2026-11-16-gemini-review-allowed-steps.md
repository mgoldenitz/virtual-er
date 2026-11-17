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

(Paste Gemini's answer here.)
