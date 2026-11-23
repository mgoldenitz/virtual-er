# Gemini review: flat look

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## What to paste into Gemini

You review a look-only change to a Next.js 16 / Tailwind 4 web app. It is a concept prototype of a virtual ER waiting room, with synthetic data only. Find problems. Do not confirm that it is good. Give each problem a file and a line, and say how sure you are.

Goal of the change: remove the signs that the UI looks AI-made, with no change to text or logic.
1. Staff screens: no frosted glass panels (`backdrop-filter`) and no radial-gradient blob backdrop. Use plain white panels (`clean-card`: white, 1 px `#e5e7eb` edge, a 0 1px 2px shadow) on a flat `#f5f5f7` page.
2. Patient hero card: one solid `#1e40af` with white text. No gradient and no shadow.
3. Boxes have a 0.75rem corner (before: 1rem and 1.25rem). Buttons already use `rounded-xl` (0.75rem).
4. Start page: "How it works" and "Questions" have no card frame. "Start a visit" and the care options keep theirs.
5. Staff list: the empty `role="status"` line under the list heading was `min-h-6` and made a gap. Now it is `sr-only` while it is empty and `font-semibold` when it has a message.

Hard rules: WCAG 2.2 AA (4.5:1 text, 3:1 for control edges, visible focus, Windows forced colors). No text change.

Questions:
- Does anything now fail WCAG 2.2 AA? Think about the panel edge `#e5e7eb` on `#f5f5f7` (decoration only, not a control), forced colors, and the `sr-only` status line (do screen readers still hear each message when the class changes in the same render as the text?).
- Is anything left that still looks AI-made or template-made?
- Did the change lose a visual difference that staff needed, for example a panel that is now hard to see on the page?
- Is the 36 px jump of the staff list, when a status message shows, a problem for staff? Suggest a better option if you have one.

Line counts after the change: `app/globals.css` 86, `app/staff/page.tsx` 188, `components/staff/StaffShell.tsx` 7, `components/start/HowItWorks.tsx` 22, `components/start/StartQuestions.tsx` 35, `lib/flatLook.test.ts` 49. Nine more files change only the class word `glass-panel` to `clean-card` (1 line each).

The diff: run this command and paste its output below this text (the bundle has no keys, no `.env` files and no `.mcp.json`):

```
git diff 9423247 ba6db15 -- app components lib
```

## Checked (output in this session)

- `npm test`: 137 test files, 970 tests pass. `npm run lint`: exit 0. `npm run build`: passed.
- `npm run e2e`: 39 passed (5.0 min).
- The new tests in `5561ca5` failed (18) before the change and pass after it, with no change to the tests.
- axe (WCAG 2.2 AA) on `/` at 390 px, `/staff` at 390 and 1280 px, and `/dashboard` at 1280 px: no violations. No sideways scroll.
- Forced colors on `/staff` at 1280 px: the panel edge is solid 1px.

## Not checked

- A real screen reader (NVDA or VoiceOver) on the staff status line.
- The look on a real phone.
- `prefers-contrast: more` with the hero card (its special block was removed, because the card is now solid).

## What to bring back

Paste Gemini's full answer below, under "Response".

## Response

(Gemini Hydrogen 4, High, 2026-11-22. The diff was not in its sources, so it gave no exact lines.)

The `git diff 9423247 ba6db15 -- app components lib` output referenced in the review prompt is missing from the notebook sources, so exact line numbers inside the newly changed files cannot be verified yet. Based on the change specification and the earlier codebase reviews in the notebook, here are the faults, risks, and the answer to the screen reader check.

### 1. WCAG 2.2 AA Problems and the `sr-only` Screen Reader Check

- Toggling `sr-only` off in the same render that populates `role="status"` can cause screen readers to miss the staff status line.
  - Where: `app/staff/page.tsx` (status line under the list heading, exact line unverified without the diff).
  - Does a screen reader still hear it? Not reliably, Medium-High certainty. Switching an element's CSS between `sr-only` (`position: absolute; width: 1px; height: 1px`) and a visible block box (`font-semibold`) in the same React render commit that inserts the message text can cause iOS VoiceOver / WebKit and some desktop screen readers to reconstruct the accessible object and skip speaking the live-region update (this exact risk was flagged earlier on `components/patient/StillHerePrompt.tsx` line 83, and real NVDA/VoiceOver testing is listed under "Not checked" for this change).
  - Related collision in `app/staff/page.tsx`: Earlier review noted that `onLeftList` and `onUndoResult` in `app/staff/page.tsx` (lines 43-52 in the prior revision) set the `role="status"` confirmation message and synchronously call `.focus()` on `#list-heading` in the same commit, which can interrupt or drop the polite confirmation on VoiceOver and TalkBack.
  - Fix: Keep an always-mounted wrapper `<div role="status" className={message ? undefined : "sr-only"}>` and mount/update the visible `<p className="font-semibold">` inside it (the pattern already used in `OfflineBanner.tsx` and `LanguageSwitch.tsx`), rather than toggling `sr-only` directly on the `role="status"` element.
- Potential `forced-colors: active` boundary loss on `.hero-card` (and `.header-band` / `.status-pill`).
  - Where: `app/globals.css` (previously lines 46-52, 63-67, and 86-92).
  - Medium certainty (depends on whether the diff added a transparent border): Forced colors was checked on `/staff` at 1280 px, not on `/patient`. If `.hero-card` still has no `border: 1px solid transparent`, Windows High Contrast strips the `#1e40af` background and leaves the hero card with no container edge. (White text on `#1e40af` exceeds 4.5:1 and 7:1 in normal mode, so removing the `prefers-contrast: more` color override itself is fine.)
- Card border `#e5e7eb` on `#f5f5f7` (`clean-card` on `bg-canvas`).
  - High certainty: If `.clean-card` is used strictly for non-interactive container panels, `#e5e7eb` on `#f5f5f7` is decorative and does not fail WCAG 1.4.11. However, if any interactive control sits inside or shares `.clean-card` without its own `border-control` (`#6b7280`), it would fail the 3:1 control-edge rule.
- Unframed `HowItWorks` and `StartQuestions` semantics.
  - Low-Medium certainty: In `StartQuestions.tsx`, ensure removing the outer card frame did not alter the `<details>` (`border-control`) and `<summary>` focus-ring radius so the focus outline does not merge with `<details>`'s border in `forced-colors: active`.

### 2. Lost Visual Differences

- White `.clean-card` (`#ffffff`, 1 px `#e5e7eb` edge, `0 1px 2px` shadow) on `#f5f5f7`.
  - High certainty: the luminance difference between `#ffffff` and `#f5f5f7` is only 1.09:1, and a 1 px `#e5e7eb` edge on `#f5f5f7` is barely perceptible. Dropping the frosted glass and tinted `.staff-backdrop` flattens card boundaries into the page, especially under bright hospital lighting, low-contrast clinic monitors, or on a real phone.
  - Smallest fix: Darken the card border slightly (for example `#d1d5db`, Tailwind `gray-300`) or darken the canvas slightly while keeping `#ffffff` cards.
- Uniform `0.75rem` corners across both containers and buttons.
  - High certainty: Giving large outer cards and inner buttons the exact same radius removes the nested visual hierarchy between a container and the controls inside it.
- Hero card without gradient or shadow (`#1e40af` solid).
  - Medium certainty: only the solid fill distinguishes the primary status card from the panels below it. In normal vision it still stands out strongly; in `forced-colors: active` it disappears unless a transparent border is set.

### 3. AI-Look Signs That Are Left

- Generic SaaS/Tailwind `rounded-xl` + `1px #e5e7eb` + `0 1px 2px` card-on-`#f5f5f7` look, High certainty: this swaps one common AI/template cliché (glassmorphism + gradient blobs) for another (default Tailwind/Shadcn card grid). Slightly crisper corners (`0.5rem` on cards, `0.375rem` on buttons/inputs) and stronger 1px borders (`#d1d5db`) without drop shadows look more like institutional clinical software.
- Unverified shadow tint and decorative CSS leftovers, needs diff: `.clean-card` kept a `rgb(15 23 42 / 0.06)` shadow; `.header-band`, `.icon-tile` and `.status-pill` are also in `app/globals.css`.

### 4. The 36 px Jump of the Staff List

- Is it a problem for staff? Yes, High certainty. Every row and action button below the status line jumps down when a message appears and back up when it clears. Staff reaching for the top row's controls right as a status update appears or clears can tap the wrong row or button.
- Better options (text unchanged):
  1. Place the status line inline beside the heading on wide screens (a `flex flex-wrap items-baseline justify-between gap-2` header row), or move it below the list so no rows shift.
  2. Restore reserved height (`min-h-6`) inside a compact header row; pair it with tighter vertical spacing.

## Claude's check (2026-11-22)

Checked against the code at `ba6db15`.

1. Status line and screen readers: partly valid. The line at `app/staff/page.tsx:152` changes its class in the same render that adds the text. Whether NVDA or VoiceOver then skips the message is not proven, but it is a real risk, and no real screen reader was used. The fix that Gemini gives does not fix it: it still changes the class on the `role="status"` element. A safer fix: the `role="status"` element never changes its class, and a `<p className="font-semibold">` inside it shows only when there is a message. `SummaryPanel.tsx:55` has the same pattern and would need the same fix. Recommended.
2. Focus on `#list-heading` in the same render as the message: not new in this change (it was there before), so not part of this review.
3. Hero card in forced colors: not valid. `.hero-card` keeps `border: 1px solid transparent;` (`app/globals.css:49`), and `lib/forcedColorsBorders.test.ts` guards it.
4. `#e5e7eb` edge and the 3:1 rule: not valid. The `clean-card` edge is decoration only; every control has its own `border-control` edge.
5. `StartQuestions` details and focus ring: not valid. Lines 26-27 did not change; only the `<section>` class changed.
6. Weak card edge (`#e5e7eb` on `#f5f5f7`): valid as a look point, not a WCAG fault. A product choice for the owner.
7. Same corners on boxes and buttons: an opinion. The owner chose fewer corner sizes.
8. Card shadow and default Tailwind look: valid as a look point. The `0 1px 2px` shadow on `.clean-card` stays. A product choice for the owner.
9. The 36 px jump: valid. It comes from the owner's choice "Hide when empty". A product choice for the owner.
