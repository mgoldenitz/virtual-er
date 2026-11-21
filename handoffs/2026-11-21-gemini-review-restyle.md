# Gemini review: restyle to blue tokens (2026-11-21)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Hydrogen 4 credits, use Gemini 3.6 Flash, High.

Give it: this file and `handoffs/2026-11-21-gemini-review-restyle-bundle.diff` (824 lines, `git diff 0291f74^ 9fb746f` for app/, components/, lib/ and docs/decisions.md; screenshots left out; no keys, no `.env`, no `.mcp.json`).

## Question to ask

You review a restyle of a Next.js 16 and Tailwind v4 app for a virtual ER waiting room. Find problems. Do not confirm what is correct. List each fault with file, line and a fix.

The hard rule is WCAG 2.2 AA: text needs 4.5:1, large text 3:1, and the edge of a control (button, input, radio, switch) needs 3:1 against what is next to it. The focus ring must show on every control that can take focus.

Look for:

1. A text colour on a background that is below 4.5:1, from the tokens in `app/globals.css` `@theme`.
2. A control whose only visible edge is `border-line` (#e5e7eb, decoration only) and so is below 3:1.
3. A control with no visible focus state, or a focus ring that is hidden by `overflow` or has low contrast.
4. Hover, active or disabled states that are missing or that fail contrast.
5. A text size that is not on the 12/14/16/18/24/30/36 px scale.
6. A raw colour (`slate-`, `gray-`, `white`, hex) left in a class where a token is meant.
7. Any change in what the app does (a class name a test or a script reads, a removed element).

## What changed

- Tokens in `app/globals.css` `@theme`: brand #1d4ed8, brand-strong #1e40af, ink #111827, muted #4b5563, canvas #f5f5f7, card #ffffff, line #e5e7eb, control #6b7280. Blue replaces teal (decisions.md, 2026-11-21).
- `components/Button.tsx`: primary `bg-brand text-white hover:bg-brand-strong active:bg-brand-strong`; secondary `border-2 border-control bg-card text-ink hover:bg-canvas`; danger keeps `bg-red-800`, adds `active:bg-red-900`; focus `outline-ink`.
- `components/staff/StaffShell.tsx`: Plus Jakarta Sans removed; every screen uses the device font (system-ui).
- Patient, start, staff and dashboard screens: `bg-white` to `bg-card`, `text-slate-700` to `text-muted`, `text-slate-800/900` to `text-ink`, card borders to `border-line`, table header border to `border-control`, `bg-slate-100` to `bg-canvas`, `outline-slate-950` to `outline-ink`, `text-xl` to `text-2xl` or `text-lg`. Red and amber safety colours stay.
- New `lib/contrast.ts` (WCAG ratio of 2 hex colours) and `lib/contrast.test.ts` (reads `@theme` and checks the pairs).

## Settled decisions (do not report)

- Blue #1d4ed8, not the skill's #3b82f6: white on #3b82f6 is 3.68:1 (decisions.md, 2026-11-21).
- `border-line` on cards and table cells is decoration; the card is not a control.
- Red and amber safety colours (911 line, alerts) stay as they were.

## Line count of each changed file

app/dashboard/page.tsx 24; app/globals.css 74; app/login/page.tsx 25; app/patient/page.tsx 136; app/staff/page.tsx 187; components/Button.tsx 27; components/Footer.tsx 12; components/dashboard/DashboardView.tsx 55; components/dashboard/FunnelView.tsx 42; components/dashboard/NumberParts.tsx 33; components/dashboard/SiteNumbers.tsx 68; components/dashboard/SummaryPanel.tsx 64; components/dashboard/TrendTable.tsx 98; components/patient/CallReminder.tsx 46; components/patient/PatientStatus.tsx 175; components/patient/StatusAndSound.tsx 62; components/patient/StillHerePrompt.tsx 134; components/patient/SurveyForm.tsx 83; components/staff/CheckInPanel.tsx 259; components/staff/ClearDemoData.tsx 85; components/staff/DemoTag.tsx 13; components/staff/ExpectedArrivals.tsx 124; components/staff/FollowUpPanel.tsx 166; components/staff/NewLinkPanel.tsx 70; components/staff/PauseSwitch.tsx 161; components/staff/RecallAllPanel.tsx 85; components/staff/RecentlyClosed.tsx 105; components/staff/StaffShell.tsx 7; components/staff/VisitRow.tsx 167; components/staff/VisitSlip.tsx 60; components/staff/WaitingOnSite.tsx 234; components/start/CareOptions.tsx 65; components/start/StartPageBody.tsx 51; components/start/StartVisit.tsx 208; docs/decisions.md 121; lib/contrast.ts 17; lib/contrast.test.ts 49.

Commits: `0291f74` (contrast test), `cbd0b57` (step 1), `905a3dd` (step 2), `d8abb05` (step 3), `9fb746f` (step 4).

## Checked (output in this session)

- `lib/contrast.test.ts` passed on the old teal tokens, then on the new blue tokens.
- After step 4: 116 test files, 749 tests pass; lint exit 0; build passed.
- Playwright screenshots at 390 px: `/`, `/patient`, `/staff`, `/login`, `/dashboard`; at 1280 px: `/staff`, `/dashboard`. The ink focus ring shows on the dashboard "Real" button after Tab.
- No `text-xl`, `bg-white`, `slate-`, `gray-` or `teal-` is left in app/ or components/ (search).

## Not checked

- The owner's own look at the screens in a browser.
- A real phone (iPhone or Android) and its system font.
- Windows High Contrast mode and forced colours.
- The focus ring on every control one by one; only the "Real" button was seen.
- `npm run e2e` after the restyle.

## Response

