# Gemini review: fixes after the Phase 5 final review (2026-11-21)

Model: Gemini Hydrogen 4, High, in a new chat. First review round on this code.

## What to give it

1. This file, from "## Prompt" down to "## Response".
2. The bundle `handoffs/2026-11-21-gemini-review-phase5-final-fixes-bundle.txt` (735 lines): the code diff 3225ab1..HEAD (no docs, no handoffs, no package-lock.json), then 2 helpers the changed lines use that are not in the diff (`lib/staffAccess.ts`, `lib/demoPlanReply.ts`). It was searched for keys; it has no `.env` file and no `.mcp.json`.

## Prompt

You review a small set of fixes in a Next.js 16 / React 19 / Supabase concept prototype (a virtual ER waiting room, synthetic data only). Find problems. Do not confirm that the code is good. For each problem give the file and line, what goes wrong, and the smallest fix. Say "no problem found" for a fix only after you checked it.

The fixes:

1. `lib/summaryAnswer.ts`: any `stop_reason` that is not `end_turn` (after the `refusal` check) gives the "cut off" message, as `lib/demoPlanReply.ts` already does.
2. Staff sign-in (`lib/signInError.ts`, `data/staffSignIn.ts`, `components/staff/LoginForm.tsx`): HTTP 429 gives "Too many sign-in tries. Wait a few minutes, then try again."; 408, 500 and up, below 400 and no status give "no connection"; other 4xx give "wrong email or password". A `getClaims` error signs out and gives "no connection". `signOutStaff` returns false when sign-out throws.
3. Accessibility: `components/dashboard/SummaryPanel.tsx` keeps one `role="status"` box on the page at all times; `components/start/StartVisit.tsx` moves focus to the `#start-heading` h2 (tabIndex -1) when "Start a new demo visit" opens the form; `components/staff/CheckInPanel.tsx` moves focus to `#checkin-heading` after Cancel; `components/Footer.tsx` gets `lang="en" dir="ltr"` (the page may be in Arabic or Urdu, the footer text is always English).
4. Comments only: `lib/demoTimes.ts`, `lib/visitActions.ts`, `data/keepFresh.ts`.
5. The patient `unavailableText` (shown when the visit cannot load) is now "We cannot show your visit right now. If you need care, please go to the emergency department desk." The French, Urdu, Arabic and Chinese lines are drafts; a fluent human reviews them later, so do not review the translations.
6. `@vercel/speed-insights` is removed from package.json (it was not used in code).

Questions:

- Is any sign-in status mapped to the wrong message? Can a staff account stay signed in after a failed claims check?
- Does the one live box in SummaryPanel announce each new message once? Does an empty live box cause any problem?
- Can a focus move run at the wrong time (for example on first render, twice in StrictMode, or after the heading is gone)?
- Do the new tests fail if the fix is removed? Name any test that would still pass.
- Anything in the diff that breaks a rule in the shared context below.

Shared context: one job per file, no file over 300 lines, code readable for a beginner, rules that decide things in `lib/` with tests, straight quotes in code and English text. The footer with the 911 line shows on every page.

## Checked (output in this session)

- 121 test files, 776 tests pass; lint exit 0; build exit 0 (after the last fix, `84fff03`).
- `npm run e2e`: 39 passed (4.3 min).
- Each new test failed before its fix: `c4f2511`, `a0394b0`, `330f8ec` (4 failed, 8 passed).

## Not checked

- The new `unavailableText` in a browser (no failed visit read was made).
- The focus moves and the live box with a real screen reader.

## Changed files (line count now)

components/Footer.test.tsx 34, components/Footer.tsx 12, components/dashboard/SummaryPanel.click.test.tsx 51, components/dashboard/SummaryPanel.tsx 67, components/staff/CheckInPanel.click.test.tsx 210, components/staff/CheckInPanel.tsx 263, components/staff/LoginForm.tsx 80, components/start/StartVisit.click.test.tsx 116, components/start/StartVisit.tsx 214, data/keepFresh.ts 54, data/staffSignIn.test.ts 77, data/staffSignIn.ts 40, lib/demoTimes.ts 30, lib/signInError.test.ts 29, lib/signInError.ts 14, lib/summaryAnswer.test.ts 74, lib/summaryAnswer.ts 34, lib/text/ar.ts 172, lib/text/en.ts 202, lib/text/fr.ts 171, lib/text/ur.ts 173, lib/text/zh.ts 171, lib/visitActions.ts 230, package.json 38.

## Response
