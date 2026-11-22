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

Gemini Hydrogen 4, High, pasted by the owner on 2026-11-21 (text kept as given; formatting marks removed).

Fix 1, lib/summaryAnswer.ts: No problem found. Checking reply.stop_reason !== "end_turn" after "refusal" matches lib/demoPlanReply.ts, and the two new tests in lib/summaryAnswer.test.ts (lines 21-27) fail if that check is reverted to "max_tokens".

Fix 2, staff sign-in:
1. A thrown getClaims() error leaves the account signed in. data/staffSignIn.ts lines 14-29. signInWithPassword (line 14) persists the session before getClaims() (line 16) runs. If getClaims() throws (for example a network failure fetching JWKS) instead of returning { error }, execution jumps to catch on line 27 (return "no_connection"), bypassing signOut() on line 19 and leaving the session active. Smallest fix: wrap getClaims() in its own try/catch, or call await supabase.auth.signOut({ scope: "local" }).catch(() => {}) in the catch block on line 27 after sign-in has succeeded.
2. signOut() in claimsError (and not_staff) ignores the returned { error } and uses global sign-out while offline. Lines 18-25. Line 19 ignores a resolved { error }. Because claimsError commonly happens when the connection is down, a global signOut() can fail to clear the browser session. On line 23 (!isStaffAccount), await supabase.auth.signOut() is unguarded; if it throws, the outer catch returns "no_connection" instead of "not_staff". Smallest fix: on line 19 (and as a fallback on line 23), call signOut({ scope: "local" }).catch(() => {}) if global signOut() returns { error } or throws.
3. NaN status falls through to "wrong" instead of "no_connection". lib/signInError.ts lines 11-13. Smallest fix: if (typeof status !== "number" || !Number.isFinite(status) || status === 408 || status >= 500 || status < 400) return "no_connection".
4. status < 400 in lib/signInError.ts and TOO_MANY in LoginForm.tsx have no unit tests. Removing || status < 400 or the result === "too_many" branch leaves all unit tests green. Smallest fix: expect(signInErrorResult(0)).toBe("no_connection"), and a LoginForm test that "too_many" renders TOO_MANY.

Fix 3, accessibility:
1. StartVisit drops focus when both sites are paused (pauses?.A && pauses?.B), and #start-heading has no focus-outline styling. When a closed visit is saved and both sites are paused when the user taps "Start a new demo visit", wantsNew becomes true and StartVisit renders the start-paused section, whose h2 id="start-heading" has no ref and no tabIndex -1, so focus drops to body. Line 169 also omits the app's focus-visible:outline-* classes. Smallest fix: ref={startHeading} and tabIndex={-1} (plus focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink) on the start-paused h2 as well as line 169.
2. CheckInPanel cancelHome focuses #checkin-heading before onHomeDone() updates the heading text. Lines 77-80 and 159. focus() runs while homeVisit is still non-null, so the heading still reads "Check in visit <CODE> after triage" and screen readers can announce the old title. Line 159 lacks focus-visible:outline-* classes. In CheckInPanel.click.test.tsx lines 201-209, onHomeDone is a no-op vi.fn(), so the test never re-renders with homeVisit={null}. Smallest fix: focus in a useEffect after homeVisit goes from non-null to null, and add focus-visible:outline-* classes to line 159.
3. SummaryPanel empty live container: with no message it is an empty block; if the parent section uses space-y-*, it adds blank space below the button. It omits aria-atomic="true". Smallest fix: keep <div role="status" aria-atomic="true"> mounted, with className={waiting || message ? "space-y-3" : "sr-only"}.
4. Footer.tsx and Footer.test.tsx: No problem found.

Fix 4, comments: No problem found.

Fix 5, unavailableText (en.ts line 75): No problem found. Translations not reviewed per instructions.

Fix 6, speed-insights: No code problem found in package.json. package-lock.json is not in the changed-files list; if it was not regenerated, npm ci will fail because it still lists @vercel/speed-insights.

Questions:
- Sign-in statuses: all normal HTTP statuses map as specified; only NaN falls through to "wrong". Yes, an account can stay signed in after a failed claims check if getClaims() throws; and with claimsError returned, line 19 calls global signOut() without checking { error } or falling back to { scope: "local" }.
- Live box: kept mounted, "Writing the summary..." is announced once, and the summary or note once when it replaces it. aria-atomic="true" makes the two p nodes in kind "text" read together. An empty role="status" box does not speak on load; without sr-only it adds blank margin if the parent uses space-y-*.
- Focus timing: neither component moves focus on first render. In StrictMode StartVisit focuses twice, harmless. CheckInPanel uses an event handler. Focus is lost in the both-sites-paused case; CheckInPanel focuses the heading while it shows the old title.
- Tests: Footer, SummaryPanel, the new CheckInPanel and StartVisit focus tests and both new summaryAnswer tests fail if their fixes are removed. Still pass with the Fix 2 changes removed: signInError.test.ts "gives wrong for a bad password or account status" (lines 7-11); staffSignIn.test.ts "gives wrong when the sign-in error status is 400" (42-45), "gives not_staff when the account is not marked staff" (55-60), "resolves to true when signOut gives no error" (73-76). Removing || status < 400 or the "too_many" branch in LoginForm.tsx (line 40) leaves all tests passing.
- Rules: the 4-branch nested ternary in LoginForm.tsx lines 39-41 is harder for a beginner than a lookup object (Record<Exclude<SignInResult, "signed_in">, string>), like SUMMARY_NONE_TEXT in lib/summaryAnswer.ts. No other violations.

## Claude's check

Checked in the code on 2026-11-21.

- Fix 6, package-lock: wrong. `package-lock.json` has 0 `speed-insights` lines; it changed in `8565eb0` (left out of the bundle on purpose).
- 2.1, a thrown `getClaims` leaves the session: right. The outer `catch` in `data/staffSignIn.ts` returns `no_connection` with no sign-out.
- 2.2, global sign-out while offline: right. A failed network call to sign out returns an error and keeps the browser session. The `not_staff` sign-out has no `.catch`, so a throw there gives `no_connection`. Fix: the two clean-up sign-outs use `{ scope: "local" }` and `.catch(() => {})`.
- 2.3, NaN status: rejected. `status` comes from the Supabase error as a number or `undefined`; no path gives NaN.
- 2.4, test gaps: right. No test for a status below 400, and no LoginForm test for `too_many`.
- 3.1, StartVisit paused branch: right. `components/start/StartVisit.tsx:143` has `id="start-heading"` with no ref and no `tabIndex`, and line 119 lets `wantsNew` reach that branch. The focus-outline part is rejected: no heading with `tabIndex={-1}` in the app has outline classes (13 headings), and a heading is not a control.
- 3.2, CheckInPanel focus before the title changes: right. `focus()` runs before React renders the new title, so a screen reader can read "Check in visit CODE after triage". The test passes because `onHomeDone` is a mock. Outline part rejected, as in 3.1.
- 3.3, SummaryPanel empty box: right on the gap (the section is `space-y-3`, so the empty box adds a margin). `aria-atomic` rejected: `role="status"` is atomic by default.
- LoginForm ternary: right, a lookup object is easier to read.
- Fixes 1, 4, 5 and the Footer: no problem found, agreed.

Proposed fixes: A (2.1 and 2.2 sign-out clean-up, with tests), B (2.4 tests), C (3.1 paused heading), D (3.2 focus after the new title, test re-renders with `homeVisit={null}`), E (3.3 no gap when empty), F (LoginForm lookup object).

## What was done

Owner said yes to A to F. A: `9f545f8` (tests, failed), `ad8ed89`. B: `c17ec28`. C: `24198a5` (test, failed), `15949d6`. D: `7615702` (tests, failed), `adb0200`. E: `68a7c48` (test, failed), `f7f4e4e`. F: `66eddc6`. Checks: 123 test files, 790 tests pass; lint exit 0; build exit 0; e2e 39 passed. Round 2 review: `handoffs/archive/2026-11-21-gemini-review-phase5-final-fixes-2.md`.
