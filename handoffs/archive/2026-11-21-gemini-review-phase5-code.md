# Gemini review: Phase 5 independent code review

Model: Gemini Hydrogen 4, High, in a new chat. Find problems; do not confirm.

Give it two things: the prompt below (from "Context" to "Not checked"), and the file `handoffs/2026-11-21-gemini-review-phase5-code-bundle.txt` as an attachment.

## Context

A concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19, Supabase with row-level security, Vercel). Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Synthetic data only, no hospital systems. The owner is new to coding, so the code must stay readable for a beginner.

The attached bundle has, in this order:

- `SPEC.md`: the spec. Its "hard rules" always win.
- `docs/decisions.md`: settled decisions, with the date and why.
- `docs/known-issues.md`: known gotchas and known limits.
- The source: `app/`, `components/`, `data/`, `lib/` (English text only, `lib/text/en.ts`), `supabase/migrations/`, `scripts/`, `proxy.ts` and the config files. Each file starts with a line `===== FILE: path =====`.

Not in the bundle: the tests (91 unit test files, 17 e2e files), the SQL check files in `supabase/checks/`, and the French, Urdu, Arabic and Mandarin text (a fluent human reviews those).

Settled, please do not report:

- Anything that `docs/decisions.md` lists as decided, or that `docs/known-issues.md` lists as a known limit, unless you show that the decision or the note is wrong in the code.
- The final security, privacy and accessibility review is a separate chat after this one. Report a security fault only when it is a plain bug (wrong code), not a hardening idea.

## Questions

1. Correctness: where can the app give a wrong result? Look at visit status changes, the line order, the wait range, the no-response steps (10, 20 and 30 minutes), the dashboard numbers, Undo, the survey, and two staff screens or a staff screen and a patient phone that change the same visit at the same time. For each fault, give the file and line, the steps or data that cause it, and the wrong result.
2. SPEC hard rules: does any code break a hard rule in `SPEC.md`? Give the rule number and the line.
3. The database: do the migrations, in order, give the functions and policies that the app code calls? Is there a function or policy that the app needs but that a later migration drops or changes?
4. Dead code and copies: code that nothing calls, or two pieces of code that do the same job.
5. Readability for a beginner: a file with more than one job, a file over 300 lines, a name that does not say what the thing does, or a comment that no longer matches the code.

Put the faults in order, most serious first. Mark each one "bug", "rule", "database", "dead code" or "readability". If you are not sure of a fault, say so and say what would prove it.

## Checked (in this session or in docs/progress.md)

- `npm test`: 91 test files, 600 tests pass. `npm run lint`: exit 0. `npm run build`: passed (2026-11-21, after `a230faa`).
- `npm run e2e` (Playwright, phone 390 x 844 and laptop 1280 x 800): 39 passed on the last run (2026-11-21); one other run had 1 flaky failure in `e2e/timed-steps.spec.ts:84`, noted in known-issues.md.
- GitHub checks (test, lint, build) passed on `c821646` (run 44884225059).
- Earlier Gemini reviews of single fixes: listed in `docs/progress.md` (not in the bundle).

## Not checked

- No e2e test with two staff screens open at the same time.
- The start route's "paused" and "busy" answers were not tried on purpose in a running app.
- Not tried with a real screen reader, and not on a real Android phone.
- The SQL check files ran in the Supabase SQL Editor (owner), not in this session.

## Bundle

- File: `handoffs/2026-11-21-gemini-review-phase5-code-bundle.txt` (166 code files plus the 3 docs, 10527 lines, about 523 KB).
- Made from `git ls-files` at `a230faa`. Left out: `.mcp.json` (project settings), `.env.local` (not in git). `.env.example` is in it: it has only the names of the settings, with empty values.
- Searched for keys before saving: no key, token, password or real patient data in the bundle.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-21. Pasted by the owner, unchanged in content (list marks tidied).

Bundle gap (what could not be checked): The attached bundle stops inside `lib/text/en.ts`. Everything after that point (the rest of `lib/` (`visit.ts`, `visitActions.ts`, `waitText.ts`, `torontoDay.ts`, `text/languages.ts`, `textSize.ts`), all of `supabase/migrations/`, `scripts/`, `proxy.ts`, and config files) is missing from the attachment. Because of this truncation:

- Question 3 (Database): Cannot be answered from this bundle, because none of the `supabase/migrations/` files are present.
- Questions 1, 2, 4, and 5: Findings below cover `app/`, `components/`, `data/`, `eslint.config.mjs`, and `lib/allowedSteps.ts` through `lib/text/durationWords.ts`. Anything inside the unseen files (such as `lib/visitActions.ts`, `lib/waitText.ts`, `proxy.ts`, or SQL triggers/RPCs) could not be checked.

### Faults, ordered most serious first

1. bug: Switching a declined patient to off-site waiting shows a false "Thank you" for "I'm still here" on the patient screen
   - Where: `lib/switchToOffsite.ts:33` and `components/patient/StillHerePrompt.tsx:52-53`
   - Steps / data: A patient declines at triage, changes their mind within 6 hours, and staff click "Start off-site waiting" in `WaitingOnSite`. `switchToOffsite` sets `last_still_here_at` to `nowIso` to reset the 30-minute timer. The patient opens `/patient` within 5 minutes (`THANKS_MS`).
   - Wrong result: `StillHerePrompt` treats `view.lastStillHereAt` within the last 5 minutes as a patient tap (`thanking = true`), so the patient's phone immediately displays "Thank you. This tells staff you are still waiting. It is not a check of your health." (`still-here-card`) and announces it to screen readers (`still-here-thanks`) even though the patient never saw or tapped "I'm still here". (`VisitRow.tsx` avoids this mistake on the staff side by checking `switchedAt(visit)`, whereas `PatientView` does not expose `offeredAt` and `StillHerePrompt` checks `view.lastStillHereAt` directly.)
   - Uncertain side-case: On a reopened visit (`unable_to_reach` -> `needs_reassessment` -> `waiting`) within 5 minutes of a prior tap, `StillHerePrompt.tsx:52` also lacks the `lastStillHereAt >= triagedAt` check used by `lastTapThisWait` in `VisitRow.tsx`. Inspecting `reopenUnableToReach` and `checkInHomeVisit` in `lib/visitActions.ts` (not in bundle) would prove whether `last_still_here_at` is already cleared there.
2. bug: Dashboard "Offered off-site waiting" can go over 100% (or divide by 0) when a declined patient switches across midnight
   - Where: `lib/dashboardNumbers.ts:109, 120-122` and `lib/switchToOffsite.ts:33`
   - Steps / data: A patient is triaged (CTAS 4 or 5) and declines at 11:30 PM Toronto time (`triaged_at` and `closed_at` = yesterday). At 12:30 AM (within the 6-hour switch window), the patient changes their mind and switches to off-site waiting. `switchToOffsite` updates `offered_at` to today while keeping `triaged_at` yesterday.
   - Wrong result: `dashboardNumbers` counts `offered` on `offered_at` (today) and `triaged` on `triaged_at` (yesterday). Before any new patient is triaged today, "Offered off-site waiting" shows "1 of 0 triaged (-)"; once 1 new patient is triaged and offered today, it shows "2 of 1 triaged (200%)", contradicting `SPEC.md` ("Triage and offer are saved in the same step, so the share cannot go over 100%") and `docs/decisions.md` (2026-11-18).
3. bug: Survey "Thank you" state leaks to a second visit opened in the same tab (`SurveyBox`)
   - Where: `components/patient/SurveyBox.tsx:23` and `components/patient/StatusAndSound.tsx:32`
   - Steps / data: On `/patient`, a patient opens an `arrived`, closed visit (`#t=TOKEN_A`) and submits the survey (`savedHere` becomes `true` in `SurveyBox`). In the same browser tab, another `arrived`, closed visit with `surveyDone: false` is opened via a hash link (`#t=TOKEN_B`, handled by `hashchange` in `app/patient/page.tsx`).
   - Wrong result: Because `SurveyBox` has no `key={token}` (unlike `StatusAnnouncer` in `VisitScreen.tsx`), it stays mounted with `savedHere === true` from the first visit and immediately displays "Thank you for your feedback." instead of the survey form for the second visit.
4. bug: "Your tap did not save" alert in "I'm still here" reappears on the next prompt 30 minutes later
   - Where: `components/patient/StillHerePrompt.tsx:32, 64-70`
   - Steps / data: The "I'm still here" prompt appears (`showing = true`), the patient taps it while offline (`notSaved` becomes `true`), then reconnects and taps again so it saves (`showing` becomes `false` and `PromptCard` unmounts). Thirty minutes later, the next prompt opens.
   - Wrong result: `notSaved` is never cleared when `PromptCard` closes or when `onTap()` starts, so the new prompt immediately renders the red "Your tap did not save" alert before the patient taps anything. Also, tapping repeatedly while offline does not clear `notSaved` before retrying, so screen readers may not re-announce the `role="alert"`.
5. bug: "Your answer did not save" alert for "I'm on my way" stays on screen after staff close the visit
   - Where: `app/patient/page.tsx:29, 86-95` and `components/patient/VisitScreen.tsx:83-87`
   - Steps / data: While `called`, the patient taps "I'm on my way" offline (`notSaved` becomes `true`). Before a successful retry, staff mark the visit "arrived" or "removed".
   - Wrong result: `notSaved` is only reset on link read (`readLink`), not when `view?.status` changes away from "called" or when `onOnMyWay()` starts. The "Ready at the desk" (or ended) screen keeps showing the red "Your answer did not save" error for the "I'm on my way" button that is no longer there.
6. bug: Checking in a home/reassessment visit leaves its language selected for the next new desk patient
   - Where: `components/staff/CheckInPanel.tsx:54-73, 86-91, 134-142`
   - Steps / data: Staff open a non-English home visit (for example `language = "fr"`) from Expected arrivals, which sets `CheckInPanel`'s `language` state to "fr", and submit "Start off-site waiting".
   - Wrong result: `cancelHome()` resets `setLanguage("en")`, but `finish()` calls `onHomeDone()` (via `save()`) without resetting `language`. The next new desk patient starts with "fr" selected in the Language dropdown unless staff notice and change it back.
7. bug: Start page keeps the previous site's error alert after switching sites
   - Where: `components/start/StartVisit.tsx:27, 127`
   - Steps / data: With `/api/site-status` not yet loaded or failing, Site A is paused (or rate-limited) while Site B is open. User picks Site A and taps "Start a visit", getting "paused", "busy", or "not_saved" (`problem` is set). User then clicks the Site B radio button.
   - Wrong result: `onChange={() => setSite(option)}` does not call `setProblem(null)`, so the red error alert from Site A stays visible beneath Site B's active "Start a visit" button.
8. bug: First `/dashboard` read uses the laptop's clock before `/api/time` finishes syncing
   - Where: `data/serverClock.ts:36-39` and `data/dashboardRead.ts:56`
   - Steps / data: Staff open `/dashboard` on a device whose clock is skewed across midnight (Toronto time).
   - Wrong result: `serverNow()` triggers `syncClock()` asynchronously (`offsetMs` is still `0`) and immediately returns the device's clock. For the first 15 seconds (until the next poll), `loadDashboard` queries `daily_stats` and filters today's events using the wrong Toronto date.
9. dead code: `averageCallGap` in `lib/queue.ts` and `pauseStateNow` in `data/sitePauses.ts` (unverified against test files)
   - Where: `lib/queue.ts:43-53` and `data/sitePauses.ts:48-50`
   - What it is: Nothing in `app/`, `components/`, `data/`, or the visible `lib/` files calls `averageCallGap` or `pauseStateNow`. The patient wait range uses `average_gap_minutes` from the database (`lib/patientViewFromRow.ts:27`), and `averageCallGap` still holds the pre-2026-11-16 logic (no deduplication of distinct `called_at` timestamps and no 3-hour window).
   - What would prove it: Searching the omitted unit test files (such as `lib/queue.test.ts` and `data/sitePauses.test.ts`) would show whether tests are the only callers left.
10. dead code: Duplicate `byTriage` sort comparator
    - Where: `lib/queue.ts:11-20` and `lib/switchToOffsite.ts:58-64`
    - What it is: Both files define identical private `byTriage(a, b)` functions to sort visits by `triaged_at` and `id`, even though `lib/switchToOffsite.ts` already imports `placeInLine` from `./queue`.
11. readability: Misleading "homeVisit" names also handle desk visits returning for reassessment
    - Where: `app/staff/page.tsx:28, 63`, `components/staff/CheckInPanel.tsx:25`, `data/staffActions.ts:103`, `lib/homeCheckIn.ts:24`
    - Why it hurts a beginner: Reopened `unable_to_reach` visits (`needs_reassessment`), including visits originally created at the desk (`source: "desk"`), are stored in `homeVisit`, checked by `homeCheckInProblem()`, and saved by `checkInVisitFromHome()`.
12. readability: `ExpectedArrivals.tsx` has multiple jobs
    - Where: `components/staff/ExpectedArrivals.tsx`
    - Why it hurts a beginner: One component renders the expected-arrivals list, the "Back for reassessment" list, and the staff short-code lookup form (which also looks up reassessment visits).
13. readability: Stale comments that no longer match the code
    - `components/Footer.tsx:2`: Says "English until the patient's chosen language is remembered on the phone (Phase 3 language switch)." The Phase 3 language switch (`data/savedLanguage.ts`) is built, yet `Footer.tsx` still hardcodes `textFor("en").footer`.
    - `data/patientVisit.ts:2-3`: Says "the two patient steps go to the database functions", while the file now calls four patient RPCs (`record_seen`, `confirm_on_my_way`, `record_still_here`, `submit_survey`).
    - `lib/followUp.ts:19-21` and `components/staff/FollowUpPanel.tsx:3`: Comments still quote the old labels "Phone this patient." and "Phone a second time." instead of the current wording in `FollowUpPanel.tsx`.
    - `components/staff/RecentlyClosed.tsx:66`: Announcement tells staff "Triage the patient again below", while on laptop screens (`lg:grid-cols-2` in `app/staff/page.tsx:100`) `CheckInPanel` sits in the left column beside the list rather than below it.

### Question 2 (SPEC.md hard rules)

- Rules 1, 2, 3, 6, 7, 8, and 9 (in the visible files): No hard-rule violations found in the inspected code.
  - Rule 1: `lib/codes.ts` uses 6-character look-alike-free display codes and 128-bit (26-character) access tokens; `lib/recallAlert.ts` sends only code and site; `lib/analyticsPrivacy.ts` strips query/hash before analytics; `data/dashboardRead.ts` excludes `code` and `access_token`.
  - Rule 3: `EmergencyLine` renders unconditionally on `/` (`StartPageBody.tsx`) and `/patient` (`app/patient/page.tsx`). (The brief hide via `data-lang-wait` is settled in `docs/decisions.md`.)
  - Rule 7 & 8: `lib/queue.ts` orders by `triaged_at`; `CareOptions.tsx` links to THP's own page without copying wait numbers.
- Rules 4 and 5 (server/database enforcement): Browser/route calls match Rule 5 (`app/api/start-visit/route.ts`, `data/patientVisit.ts`, `data/changeSignal.ts`), and `lib/dashboardNumbers.ts` adds `visits` + `daily_stats` per Rule 4; however, the database RPCs, RLS policies, and 24-hour cleanup trigger could not be verified because `supabase/migrations/` is omitted from the truncated bundle.

### Question 3 (The database)

Cannot be answered without the `supabase/migrations/` files, which were cut off after `lib/text/en.ts` in this bundle. To check migration order, dropped/altered functions, triggers, and RLS policies against the app's RPC and table calls (`get_patient_visit`, `start_home_visit`, `record_seen`, `confirm_on_my_way`, `record_still_here`, `submit_survey`, `clear_demo_data`, `visits`, `site_settings`, `daily_stats`, `change_signal`), please paste the `supabase/migrations/` files and the remainder of `lib/`.

## Claude's check

Checked against the code on branch `phase5-e2e` at commit 20cdcf3, 2026-11-21.

1. Valid. `lib/switchToOffsite.ts:33` sets `last_still_here_at` to now, and `StillHerePrompt.tsx:52-53` shows the thanks for any value under 5 minutes old. The side case is also valid: `applyTriage` and `reopenUnableToReach` in `lib/visitActions.ts` do not clear `last_still_here_at`, and `StillHerePrompt` has no `lastTapThisWait` check. A fix that changes what the switch writes touches `lib/` and the database RPC, so it needs a plan.
2. Valid. `lib/dashboardNumbers.ts:109` counts on `offered_at`, triaged counts on `triaged_at` (120-122). Needs an owner decision on how to count.
3. Valid, but only when the second link opens in the same tab after the first survey was sent. Fix: `key={token}` on `SurveyBox` in `StatusAndSound.tsx:40`.
4. Main claim wrong: `StillHerePrompt.tsx:71` sets `notSaved` from each result, so a tap that saves clears it, and the next prompt opens clean. Sub-claim valid: a second offline tap keeps `notSaved` true, so the alert is not announced again. Fix: `setNotSaved(false)` at the start of the tap.
5. Valid. `VisitScreen.tsx` shows the alert in every status; only `readLink` resets it.
6. Valid. `CheckInPanel.tsx:138-139` resets `ctas` and `ticked` but not `language`, and the reset block at 60-68 runs only when a new home visit is chosen.
7. Valid. `StartVisit.tsx:179` `onChange={() => setSite(option)}` does not clear `problem`.
8. Valid but small. `serverNow()` (`data/serverClock.ts:45-48`) returns the device clock until the first `/api/time` answer comes back. It matters only on a device with a wrong clock near midnight, for the first read.
9. Valid. `averageCallGap` is used only by `lib/queue.test.ts`, and `pauseStateNow` only by `data/sitePauses.test.ts`. Removal also removes those tests, so it needs the owner's OK.
10. Valid. `lib/queue.ts:11-20` and `lib/switchToOffsite.ts:59-64` give the same order. Fix: export one from `lib/queue.ts`.
11. Valid as a naming point. A rename crosses `app/`, `components/`, `data/` and `lib/`; low value now.
12. Partly valid. `ExpectedArrivals.tsx` is 124 lines and holds two lists and the code lookup. Under the 300-line limit; a split is optional.
13. Valid, all five. `Footer.tsx:9` still uses `textFor("en")` though `data/savedLanguage.ts` exists; `data/patientVisit.ts` calls `get_patient_visit`, `submit_survey` and three steps through `patientStep`; `FollowUpPanel.tsx:68` now says "Phone the patient now." and "Phone the patient again."; `RecentlyClosed.tsx:63` says "below".

Question 2: no fault found in the files seen. Question 3: not answered, because the upload stopped in `lib/text/en.ts`. A second handoff with the rest of `lib/` and `supabase/migrations/` is due.
