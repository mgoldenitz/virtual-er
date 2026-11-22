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
- `npm run e2e` after step 4: 39 passed (2.0 min), phone and laptop.

## Not checked

- The owner's own look at the screens in a browser.
- A real phone (iPhone or Android) and its system font.
- Windows High Contrast mode and forced colours.
- The focus ring on every control one by one; only the "Real" button was seen.

## Response

Gemini Hydrogen 4, High, 2026-11-21, pasted by the owner:

### 1. Contrast and colour tokens

* Disabled and `aria-disabled` button states fail contrast and still react to hover/active (`components/Button.tsx`, lines 9–11 and 23):
  * `disabled:opacity-50` and `aria-disabled:opacity-50` drop text and border contrast below WCAG 2.2 AA on `bg-card` (`#ffffff`):
    * `primary` (`#ffffff` on 50% `#1d4ed8` over `#ffffff` ≈ `#8ea7ec`): 2.38:1 text contrast.
    * `danger` (`#ffffff` on 50% `#991b1b` over `#ffffff` ≈ `#cc8d8d`): 2.71:1 text contrast.
    * `secondary` (`#111827` at 50% on `#ffffff` ≈ `#888c93`): 3.39:1 text contrast; `border-control` (`#6b7280` at 50% on `#ffffff` ≈ `#b5b9c0`): 1.97:1 border contrast.
  * Because `aria-disabled="true"` does not match CSS `:disabled`, buttons with `aria-disabled` still trigger `hover:` and `active:` colour changes.
  * Fix: If disabled states must meet contrast, replace `opacity-50` with an opaque muted token pair (such as `bg-canvas text-muted border-2 border-control`) and suppress hover/active transitions with `disabled:pointer-events-none aria-disabled:pointer-events-none`.
* `lib/contrast.test.ts` skips active, hover-link, and backdrop pairs (`lib/contrast.test.ts`, lines 31–48):
  * The test checks `canvas` and `card` only; it does not check `ink`/`control` against `line` (`#e5e7eb`, used by `active:bg-line` in `components/Button.tsx` line 10), `brand-strong` as text, or `brand`/`ink` against the darkest corner of `.staff-backdrop` (`#d1dbf4`, where `app/dashboard/page.tsx` line 18 renders `text-brand` outside `.glass-panel`).
  * Fix: Add `"line"` to `backgrounds` for `ink` and `control` checks, and add a test for `#d1dbf4` against `brand`, `muted`, and `ink`.

### 2. Focus rings

* `<summary>` disclosure controls lack an explicit `focus-visible` ring (`components/staff/FollowUpPanel.tsx` line 141, `components/staff/NewLinkPanel.tsx` line 44, `components/staff/VisitRow.tsx` line 147):
  * Each `<summary>` uses `className="cursor-pointer py-2 text-ink underline underline-offset-2"` with no `focus-visible:outline-*` classes, falling back to browser-default focus outlines instead of the app's `4px` `outline-ink` ring.
  * Fix: Add `focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink` to all three `<summary>` elements.
* Links omit `focus-visible:outline-offset-2` (`app/dashboard/page.tsx` line 18, `components/staff/VisitSlip.tsx` line 49):
  * Both links set `focus-visible:outline-4 focus-visible:outline-ink` without `focus-visible:outline-offset-2`, placing the 4 px outline flush against the text (`VisitSlip.tsx` line 49 also omits `min-h-11 py-2`).
  * Fix: Add `focus-visible:outline-offset-2` to both links (and `min-h-11 py-2` to `components/staff/VisitSlip.tsx` line 49).

### 3. Hover and active states

* Missing hover and active states on links, `<summary>` controls, and survey radio labels:
  * `app/dashboard/page.tsx` line 18 (`<Link href="/staff">`) and `components/staff/VisitSlip.tsx` line 49 (`<a href={scanLink}>`): both `text-brand` links have no `hover:` or `active:` colour change.
  * `components/staff/FollowUpPanel.tsx` line 141, `components/staff/NewLinkPanel.tsx` line 44, and `components/staff/VisitRow.tsx` line 147: `<summary>` elements have no `hover:` or `active:` state.
  * `components/patient/SurveyForm.tsx` line 56: the score `<label>` has `bg-card` with no `hover:` or `active:` state.
  * Fix: Add `hover:text-brand-strong active:text-brand-strong` to the links and `<summary>` controls, and `hover:bg-canvas active:bg-line` to the `<label>` in `components/patient/SurveyForm.tsx`.
* Missing `active` state on `StartPageBody` nav links and near-invisible `hover` shift on secondary buttons (`components/start/StartPageBody.tsx` line 19, `components/Button.tsx` line 10):
  * `StartPageBody.tsx` line 19 has `hover:bg-canvas` without `active:bg-line` (unlike `Button.tsx` line 10 `secondary`).
  * On both `StartPageBody.tsx` line 19 and `Button.tsx` line 10, `hover:bg-canvas` (`#f5f5f7`) over `bg-card` (`#ffffff`) is only a 1.09:1 background shift.
  * Fix: Add `active:bg-line` to `linkStyle` in `components/start/StartPageBody.tsx` line 19, and consider `hover:bg-line` or `hover:border-ink` on secondary controls for a clearer hover cue.

### 4. Text sizes and heading hierarchy

* `<h1>` is smaller than `<h2>` on `/patient` (`app/patient/page.tsx` line 115, `components/patient/StillHerePrompt.tsx` line 91):
  * `app/patient/page.tsx` line 115 changed `<h1>` from `text-xl` to `text-lg` (18 px) while `StillHerePrompt.tsx` line 91 changed its `<h2>` to `text-2xl` (24 px) and every other page's `<h1>` (`app/dashboard/page.tsx`, `app/login/page.tsx`, `app/staff/page.tsx`, `components/start/StartPageBody.tsx`) moved to `text-3xl` (30 px).
  * Fix: Change `app/patient/page.tsx` line 115 to `text-3xl` (or `text-2xl` with smaller `<h2>`s) so `<h1>` remains the largest heading on the page.
* Visit code `<p>` matches section `<h2>` size and widens an unbreakable row (`components/staff/VisitRow.tsx` line 119):
  * Changing the visit code `<p>` from `text-xl` (20 px) to `text-2xl` (24 px) makes it the same size as the `<h2>` section heading (`app/staff/page.tsx` line 148) and widens the `font-mono tracking-widest` code + `<DemoTag>` block by 20%.
  * Fix: Use `text-lg` (18 px) on `components/staff/VisitRow.tsx` line 119 to stay on the 12/14/16/18/24/30/36 px scale while keeping it smaller than `<h2>` and narrower on 390 px screens.

### 5. Raw colours left in classes and CSS

* Raw `text-white` left in button and primary link styles (`components/Button.tsx` lines 9 and 11, `components/start/StartVisit.tsx` line 24, `lib/contrast.test.ts` line 41):
  * `Button.tsx` (`primary` and `danger`) and `StartVisit.tsx` (`openLinkStyle`) still use raw `text-white` instead of a token (`lib/contrast.test.ts` line 41 also hardcodes `"#ffffff"`).
  * Fix: Add `--color-on-brand: #ffffff;` to `@theme` in `app/globals.css` (or use `text-card`), update `Button.tsx` and `StartVisit.tsx`, and read `t["on-brand"]` (or `t.card`) in `lib/contrast.test.ts`.
* Raw hex and RGB values in `app/globals.css` (`app/globals.css`, lines 34 and 40–44):
  * `.staff-backdrop` uses raw `#eef2f9`, `rgb(29 78 216 / 0.14)`, `rgb(75 85 99 / 0.1)`, and `rgb(96 165 250 / 0.12)`, while `.clean-card` line 34 retains `rgb(15 23 42 / 0.06)` (the old `slate-900` colour).
  * Fix: Move `.staff-backdrop`'s base/accent colours into `@theme` (or derive the translucent stops from `var(--color-brand)`, `var(--color-muted)`, and `var(--color-ink)`).

### 6. Class / DOM changes

* `.theme-staff` class removed from `StaffShell` (`components/staff/StaffShell.tsx` line 6, `app/globals.css` lines 37–43):
  * The `.theme-staff` class name was deleted from the wrapper `<div>` and stylesheet; any test, Playwright locator, or script querying `.theme-staff` (or `jakarta`'s generated font class) will no longer match.
  * Fix: Check all tests and scripts for `.theme-staff` or font-class selectors, and either update those selectors or retain `theme-staff` as a marker class if needed.

## Claude's check

Checked against the code on 2026-11-21 (commit `6c883ea`).

- 1a, disabled contrast: rejected. WCAG 2.2 SC 1.4.3 and 1.4.11 exempt inactive controls from contrast. `opacity-50` stays.
- 1a, `aria-disabled` buttons still change colour on hover and press: valid. 7 buttons use `aria-disabled` (`PatientStatus.tsx:36`, `StillHerePrompt.tsx:95`, `SurveyForm.tsx:72`, `CheckInPanel.tsx:224`, `:232`, `:236`, `ClearDemoData.tsx:71`). The `pointer-events-none` fix is rejected: it removes the `cursor-not-allowed` cue. Better fix: an `aria-disabled:hover:` and `aria-disabled:active:` class per variant that keeps the normal colour.
- 1b, test gaps: valid. Add `line` as a background for `ink` (pressed secondary button), and the backdrop corner #d1dbf4 for `brand`, `muted` and `ink` (`app/dashboard/page.tsx:18` puts `text-brand` on the backdrop).
- 2, `<summary>` focus rings: valid. `FollowUpPanel.tsx:141`, `NewLinkPanel.tsx:44` and `VisitRow.tsx:147` have no `focus-visible` classes.
- 2, links without `outline-offset-2`: valid, small. `app/dashboard/page.tsx:18` and `VisitSlip.tsx:49`. `VisitSlip.tsx:49` also has no `min-h-11` (project rule: 44 px targets).
- 3, hover and press states on links, `<summary>` and survey labels: not a WCAG need. Owner choice.
- 4a, `/patient` h1 (`text-lg`, 18 px) smaller than the h2 in `StillHerePrompt.tsx:91` (`text-2xl`, 24 px): valid. Size is owner choice.
- 4b, visit code `text-2xl` (`VisitRow.tsx:119`) the same size as the h2 (`app/staff/page.tsx:148`): true. Owner choice; the code is the main thing staff read on a row.
- 5, `text-white` token and raw backdrop colours: low value. Not done unless the owner asks.
- 6, `theme-staff` removed: rejected. A search of `app`, `components`, `lib`, `data`, `e2e` and `scripts` finds no `theme-staff` or `jakarta`. `npm run e2e` passed (39) after the change.

