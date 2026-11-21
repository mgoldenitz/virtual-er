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

Added after this handoff was written (`2dd88a6`): `e2e/declined-switch.spec.ts` (52 lines) checks that no "Thank you." shows after a switch. With the fix removed for a short time it failed on phone and laptop ("Thank you." found 1 time); with the fix, the full `npm run e2e` gave 39 passed (2.1 min). The diff is at the end of the bundle.

## Response

Gemini Hydrogen 4, High, 2026-11-21:

## 1. `lastTapThisWait` (`lib/stillHere.ts`)

* **Millisecond truncation can hide a real tap (or misclassify a sub-millisecond switch)** — `lib/stillHere.ts:33-38`
* `lastTapThisWait` converts `triagedAt`, `lastStillHereAt`, and `offeredAt` with `new Date(...).getTime()`, discarding Postgres microsecond precision.
* **Concrete case:** A visit is switched at `2026-11-21T12:00:00.100100Z` (`offered_at` and `last_still_here_at`) and a `record_still_here` RPC commits in the same millisecond at `2026-11-21T12:00:00.100800Z`. `offered === tapped` evaluates `true`, so `lastTapThisWait` returns `null` and hides the tap. (In normal UI use the `"I'm still here"` prompt does not appear until 30 minutes after the switch, so a UI tap only hits the same millisecond if the server clock steps backward; a direct RPC or sub-millisecond test call triggers it immediately.) Conversely, if a switch occurs within the same millisecond as triage (`2026-11-21T12:00:00.100100Z` vs `.100800Z`), `offered > triaged` is `false` and the switch stamp is treated as a real tap.
* **Normal check-ins:** `applyTriage` (`lib/visitActions.ts:61-76`) clears `last_still_here_at: null` and sets `triaged_at` and `offered_at` to the same `nowIso` (and Postgres `visits_before_write` sets both to `now()`), so `offered > triaged` is `false` and a normal check-in does not match `isSwitchStamp`.

## 2. `20261121000000_patient_view_offered_at.sql`

* **`delete_old_visits` counts `survey_*` metrics on visits whose final status is not `arrived`** — `supabase/migrations/20261121000000_patient_view_offered_at.sql:153-160` (and `lib/dashboardNumbers.ts:102`)
* The `survey_responses`, `survey_score_sum`, and `survey_9_or_10` branches filter only `where survey_score is not null and closed_at is not null` without requiring `status = 'arrived'`.
* **Concrete case:** Staff mark a visit `arrived`, the patient submits `survey_score = 9`, staff click `Undo` (leaving `survey_score = 9` on the row), and the visit later closes as `removed` (`left` or `no_show`) or `unable_to_reach`. At 24 hours, `delete_old_visits` counts that non-`arrived` visit in all three survey columns on the new closure day.
* **`get_patient_visit` and Toronto-date counting:** `get_patient_visit` (`20261121000000_patient_view_offered_at.sql:14-89`) returns all 14 columns expected by `lib/patientViewFromRow.ts:10-48` with `EXECUTE` granted only to `anon` and `authenticated`, and `delete_old_visits` (`lines 123-128, 164`) counts each visit once per metric on `(triaged_at at time zone 'America/Toronto')::date`.

## 3. `VisitScreen.tsx`, `lib/notSavedAlert.ts`, and `app/patient/page.tsx`

* **Alert appears on `arrived`, `removed`, `unable_to_reach`, or `on_the_way` if the status updates while `onOnMyWay` is in flight** — `components/patient/VisitScreen.tsx:48-55`, `app/patient/page.tsx:90-98`
* `onOnMyWay` sets `notSaved = false` at tap start, which resets `failedIn` to `null` in `VisitScreen`. `VisitScreen` then latches `failedIn` to whatever `view.status` happens to be when `notSaved` next becomes `true`.
* **Concrete case:** While `view.status === "called"`, the patient taps `"I'm on my way"`. Before `confirmOnMyWayByToken` finishes, a live update or background poll updates `view.status` to `"arrived"` (or `"removed"` / `"on_the_way"`). Then `confirmOnMyWayByToken` fails with a network/502 error (`"not_saved"`) and calls `setNotSaved(true)`. `VisitScreen` sees `failedIn === null` and sets `failedIn = "arrived"`, so `notSavedAlertShows("arrived", "arrived")` returns `true` and renders `"Your answer did not save. Staff do not know you are on your way."` on the `"Status: Ready at the desk"` (or ended) screen.
* **In-flight `onOnMyWay` failure leaks onto a newly opened visit after `hashchange`** — `app/patient/page.tsx:39-44, 90-98`
* `readLink` clears `setNotSaved(false)` when `#t=TOKEN_B` opens, but `onOnMyWay` does not check whether `token` changed before calling `setNotSaved(result === "not_saved")`.
* **Concrete case:** The patient taps `"I'm on my way"` on Visit A (`#t=TOKEN_A`), then immediately opens Visit B (`#t=TOKEN_B`) in the same tab. When `confirmOnMyWayByToken("TOKEN_A")` resolves `"not_saved"`, `setNotSaved(true)` runs on Visit B, and `VisitScreen` sets `failedIn` to Visit B's current status and displays the failed-save alert on Visit B.
* **Double-tap race while `sending` state has not re-rendered** — `app/patient/page.tsx:25, 90-98`
* `onOnMyWay` guards only with React state `sending` rather than a synchronous `useRef`.
* **Concrete case:** Two taps in the same render frame both enter `onOnMyWay`. Call 1 succeeds (`view.status` updates to `"on_the_way"`), while Call 2 fails with a network error (`"not_saved"`) after `view.status` is already `"on_the_way"`, latching `failedIn = "on_the_way"` and showing the alert on the `"on_the_way"` screen.

## 4. Changed tests that check less than before

* **`lib/queue.test.ts` (`lines 38-67` in diff)**
* Removed `"averages the gaps between the last call-backs"`, `"never gives a gap under 5 minutes, even when call-backs come 1 minute apart"`, and the `averageCallGap([visit("a", 1)], "A")` assertion in `"uses 15 minutes per patient until there is call-back history"` (renamed to `"gives 35 to 60 minutes for place 3 with the 15-minute default gap"`). These covered the deleted `averageCallGap` helper; note that the replacement gap-clamping logic in `lib/patientViewFromRow.ts:30` (`Math.max(row.average_gap_minutes ?? DEFAULT_GAP_MINUTES, MIN_GAP_MINUTES)`) is not tested in any file in this diff.
* **`lib/dashboardNumbers.test.ts` (`lines 98-100`)**
* `"does not count a decline unless the offer was made today"` previously passed `visit({ status: "declined", offered_at: yesterday })` without overriding `triaged_at`, and now sets both `triaged_at: yesterday` and `offered_at: yesterday`. No test in the diff verifies the `v.offered_at !== null` guard on `declined` (`lib/dashboardNumbers.ts:113`) when `triaged_at` is today and `offered_at` is `null`.
* **`lib/dashboardSynthetic.test.ts` (`lines 62-84`)**
* Changing Visit 18's Site B expectation to `offered: 0, accepted: 0` changed `expect(share(B.accepted, B.offered)).toBe(100)` to `.toBeNull()`, which drops the `share(1, 1)` check on Site B (`0 / 0 -> null` was already tested on the preceding `share(B.offered, B.triaged)` line).

## 5. Other faults in the diff

* **`StillHerePrompt` lacks `key={token}`, leaking `notSaved` and `thanksSpoken` across visits** — `components/patient/StatusAndSound.tsx:31`, `components/patient/StillHerePrompt.tsx:32, 63`
* Fix D added `key={token}` to `<SurveyBox>` (`StatusAndSound.tsx:41`), but omitted it on `<StillHerePrompt>` (`StatusAndSound.tsx:31`).
* **Concrete case:** On Visit A (`#t=TOKEN_A`, `status: "waiting"`, prompt due), a tap fails while offline (`notSaved` becomes `true` in `StillHerePrompt`). Opening Visit B (`#t=TOKEN_B`, also `status: "waiting"`, prompt due) via a `#t=` hash link keeps `StillHerePrompt` mounted, so Visit B immediately displays Visit A's red `"Your tap did not save"` alert (and any in-flight `recordStillHere("A")` result lands on Visit B).
* **`StillHerePrompt` retains stale `notSaved` across prompt cycles if the prompt closes without a tap on this phone** — `components/patient/StillHerePrompt.tsx:32, 72-79`
* `notSaved` is stored on `StillHerePrompt` (which stays mounted as long as `view.status === "waiting"`) and is only cleared inside `onTap`.
* **Concrete case:** The patient taps `"I'm still here"` offline (`notSaved` becomes `true`), then confirms from another tab/device (or a background retry succeeds) so `showing` turns `false` and `PromptCard` unmounts. Thirty minutes later, when the next prompt appears (`showing` turns `true`), `notSaved` is still `true` and immediately renders `"Your tap did not save"` before any tap. (Also, `onTap` uses React state `sending` instead of a ref, allowing same-frame double-taps.)
* **`StartVisit` applies an in-flight start error (or navigation) to the newly chosen site** — `components/start/StartVisit.tsx:139-148, 173-184`
* The site radio buttons stay enabled while `starting` is `true`.
* **Concrete case:** The user selects Site A, taps `"Start a visit"` (`starting = true`, `problem = null`), and while `startVisitFromHome("A", language)` is still pending, clicks the Site B radio button (`setSite("B"); setProblem(null);`). When the Site A request fails (`"paused"`, `"busy"`, or `"not_saved"`), `setProblem(result)` displays Site A's error alert below Site B's button (and if it succeeds, navigates to Site A's visit despite Site B being selected).
* **Duplicate paused banner when a site becomes paused after a `"paused"` submit failure** — `components/start/StartVisit.tsx:187-199`
* When `problem === "paused"` and a background `/api/site-status` poll updates `pauses[site]` to `true`, `sitePaused` renders `s.paused` (`data-testid="site-paused"`) right above `problem && <p role="alert">` showing the exact same `s.paused` text a second time.
* **`data/sitePauses.test.ts` still masks `setSitePaused`'s null-store omission with a priming save** — `data/sitePauses.test.ts:87-91`, `data/sitePauses.ts:68`
* `setSitePaused` still only updates `state.pauses` immediately when `state.pauses` is already non-null (`if (result !== "not_saved" && state.pauses)`), and `data/sitePauses.test.ts:87` still runs an initial un-held `setSitePaused("A", true)` before mounting `Probe` and testing the held re-read, so an immediate update from `state.pauses === null` remains untested and broken.

## Claude's check

Checked against the code on 2026-11-21.

1. Millisecond truncation in `lastTapThisWait`: rejected. The switch writes `offered_at` and `last_still_here_at` from the same `now()`, so the two values are equal. A real tap has the same millisecond as the switch only if it comes less than 1 ms after it. That is not possible through the phone.
2. Survey counts not limited to `arrived`: rejected. The owner chose "count every score" on 2026-11-20 (docs/decisions.md line 110, point 4.1).
3a. The "did not save" alert can show on the new status: accepted. `VisitScreen.tsx` lines 48-55 store `view.status` when `notSaved` becomes true, not the status at the tap. If staff change the status while the tap is in flight, the alert shows on the new screen.
3b. A failed save for token A shows on visit B: accepted, low risk. `app/patient/page.tsx` line 42 clears `notSaved` on a new link, but an in-flight `onOnMyWay` for the old token sets it again at line 99.
3c. Double tap in the same frame: probably rejected. React runs the update from a click before the next click event, so the second click sees `sending` as true. No test shows this (a double-tap test is an option).
4a. Gap clamp not tested: rejected. `lib/patientViewFromRow.test.ts` line 53 ("never uses a gap under 5 minutes") tests it.
4b. No test for the `offered_at !== null` guard on `declined`: accepted. Every `declined` test in `lib/dashboardNumbers.test.ts` sets `offered_at`.
4c. `share(1,1)` check lost on site B: rejected. Site B has no offer since the fault 2 decision, so `null` is correct. `lib/dashboardShare.test.ts` line 7 tests a 100% share.
5a and 5b. Stale `notSaved` in `StillHerePrompt`: accepted. If the prompt hides after a failed tap (a tap from another phone) and comes back, the old alert shows again. Also no `key={token}` (`StatusAndSound.tsx` line 33).
5c. Site radios active while a start is in flight: accepted. A failed start for site A shows its alert under site B.
5d. Paused text two times: accepted. With `problem === "paused"` and then `sitePaused` true, `StartVisit.tsx` lines 189-199 show `s.paused` two times.
5e. Null store in `setSitePaused` not tested: rejected. `PauseSwitch.tsx` shows the switch only after the first read (`paused === null` shows "Checking..."), so `setSitePaused` never runs with an empty store.

Not checked: 3b and 5a in a browser.

Fixes (owner OK to all accepted points and to locked site radios, 2026-11-21). Each one: test first, seen to fail, then the fix.

- 4b: `0a2c5f9` (test only; it passed at once, it guards code that was already right).
- 5d and 5c: failing tests `6aff81f`, fix `e432f64`.
- 5a and 5b: failing tests `5cdff19`, fix `bc85469`.
- 3a and 3b: failing tests `84e5f21`, fix `3c034a2`.

Checked after `3c034a2`: 95 test files, 631 tests pass; lint exit 0; build passed; full e2e 39 passed on the second run (the first run had 1 failure in `timed-steps.spec.ts:84`, a known flaky test, see docs/known-issues.md).
