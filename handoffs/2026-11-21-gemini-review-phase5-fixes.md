# Gemini review: the Phase 5 review fixes

Model: Gemini Hydrogen 4, High, in a new chat (if no credits: Gemini 3.6 Flash, High).

Give it two things: the prompt below (from "Context" to "Not checked"), and the file `handoffs/2026-11-21-gemini-review-phase5-fixes-bundle.txt` as an attachment. The bundle is not in git.

## Context

This is a concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19, Supabase, Vitest). Low-acuity patients wait off-site and follow their place in line on their phone. Synthetic data only.

Two earlier reviews (code and database) found faults. This diff fixes them. Find problems in the fixes. Do not confirm that they are correct; list each fault you find, with the file and line, and a concrete case that breaks.

The fixes, in commit order:
- A. `applyTriage` (`lib/visitActions.ts`) clears old `offered_at` and `last_still_here_at` stamps when a visit from home is triaged.
- B. The patient phone does not show "Thank you." for a switch stamp. A switch from "offered, declined" to off-site waiting sets `offered_at` and `last_still_here_at` to the same moment, after `triaged_at`. `lastTapThisWait` (`lib/stillHere.ts`) now ignores that stamp. `get_patient_visit` returns `offered_at` (migration `20261121000000_patient_view_offered_at.sql`).
- C. The dashboard and the clean-up job count "offered" and "declined" on the triage day (`triaged_at`), not on the day of the switch, so the share of offers accepted cannot go over 100%. Same migration, `delete_old_visits`. `supabase/checks/daily_stats.sql` gets visit 5W (triaged on day 1, switched on day 2).
- D. Five screen faults: the survey state is reset for a new token (`key={token}` on `SurveyBox`); a new tap clears the old "did not save" alert (`StillHerePrompt.tsx`, `app/patient/page.tsx`); the "did not save" alert shows only in the status where the save failed, and does not come back after an Undo to that status (`lib/notSavedAlert.ts`, `VisitScreen.tsx`); the desk check-in resets the language to English after each visit (`CheckInPanel.tsx`); a new site clears the start problem (`StartVisit.tsx`).
- E. Unused `averageCallGap` and `pauseStateNow` removed; `data/sitePauses.test.ts` reads through `useSitePauses`.
- F. `lib/switchToOffsite.ts` uses `byTriage` from `lib/queue.ts` instead of its own copy.
- G. Stale comments in 6 files, and the staff text after a Reopen now says "Triage the patient again in the check-in panel."

Settled decisions, do not report them as faults:
- Offered and declined count on `triaged_at` (owner, 2026-11-21).
- Demo and real visits at one site share one line (owner, 2026-11-21).
- No full Content-Security-Policy (owner, 2026-11-21).
- `VisitScreen.tsx` sets state during render (not in an effect) to follow the `notSaved` prop. This is the React pattern for state that follows a prop.
- Old migrations are not changed; a new migration replaces a function.

## Questions

1. Can a real tap after a switch ever have the same moment as `offered_at`, so `lastTapThisWait` hides a real tap? Can a normal check-in ever look like a switch stamp?
2. In `20261121000000_patient_view_offered_at.sql`: does `get_patient_visit` still return every column the app reads, with the same rights for `anon` and `authenticated`? Does `delete_old_visits` count each visit once, on the right day, in Toronto time?
3. In `VisitScreen.tsx` and `lib/notSavedAlert.ts`: is there a sequence of status changes and taps where the "did not save" alert shows when it should not, or is missing when a save failed?
4. Do any changed tests check less than before? Name the test and the check that was lost.
5. Any other fault in the diff.

## Checked (in this session)

- `npm test`: 93 test files, 615 tests pass.
- `npm run lint`: exit 0.
- `npm run build`: passed.
- The owner ran migration `20261121000000` in the Supabase SQL Editor.
- The owner ran `supabase/checks/daily_stats.sql`: all 5 rows match the expected lines. The first run failed with VWR01, because the check was older than the `visits_check_step` trigger; the check now pauses that trigger too.

## Not checked

- `npm run e2e` was not run after these fixes.
- The owner has not yet looked at the patient screen after a switch on the staff screen (expected: no "Thank you." until a tap).
- The F5 test in `VisitScreen.click.test.tsx` goes from `waiting` to `called`. In real use the failed save happens in `called`.

## Files

Bundle: `handoffs/2026-11-21-gemini-review-phase5-fixes-bundle.txt` (4762 lines, about 216 KB). It has the diff from `b2446fe^` to `b5cbbff` (docs and handoffs left out, 1386 lines), then the full current text of each changed file that is not a test, so the helpers that the changed lines call are in it. It also has the old `get_patient_visit` (`20261120000000_survey.sql`), the old `delete_old_visits` (`20261116110000_lock_key_and_cron_log_fix.sql`), the step-check trigger (`20261117000000`) and `lib/visit.ts`.

Line counts of the changed files: app/patient/page.click.test.tsx 131, app/patient/page.tsx 126, components/Footer.tsx 12, components/patient/PatientStatus.click.test.tsx 112, components/patient/PatientStatus.sound.click.test.tsx 86, components/patient/PatientStatus.test.tsx 43, components/patient/StatusAndSound.click.test.tsx 107, components/patient/StatusAndSound.tsx 61, components/patient/StillHerePrompt.click.test.tsx 168, components/patient/StillHerePrompt.tsx 131, components/patient/SurveyBox.click.test.tsx 212, components/patient/VisitScreen.click.test.tsx 223, components/patient/VisitScreen.tsx 116, components/staff/CheckInPanel.click.test.tsx 197, components/staff/CheckInPanel.tsx 259, components/staff/FollowUpPanel.tsx 166, components/staff/RecentlyClosed.tsx 105, components/start/StartVisit.click.test.tsx 53, components/start/StartVisit.tsx 206, data/patientVisit.ts 172, data/sitePauses.test.ts 104, data/sitePauses.ts 80, lib/dashboardNumbers.test.ts 293, lib/dashboardNumbers.ts 171, lib/dashboardSynthetic.test.ts 95, lib/deadToken.test.ts 44, lib/followUp.ts 89, lib/notSavedAlert.test.ts 26, lib/notSavedAlert.ts 12, lib/patientView.ts 27, lib/patientViewFromRow.test.ts 84, lib/patientViewFromRow.ts 54, lib/queue.test.ts 98, lib/queue.ts 59, lib/startPage.test.ts 51, lib/stillHere.test.ts 66, lib/stillHere.ts 50, lib/survey.test.ts 72, lib/switchToOffsite.ts 71, lib/text/en.ts 202, lib/visitActions.test.ts 185, lib/visitActions.ts 230, supabase/checks/daily_stats.sql 236, supabase/checks/permissions.sql 74, supabase/migrations/20261121000000_patient_view_offered_at.sql 220.
