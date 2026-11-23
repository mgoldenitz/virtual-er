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
