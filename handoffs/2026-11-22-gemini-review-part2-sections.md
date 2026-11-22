# Gemini review: patient card look, Part 2 (How it works, Questions, Before you leave)

Model: Gemini Hydrogen 4, High, in a new chat. Give it this file and `handoffs/2026-11-22-gemini-review-part2-sections-bundle.diff`.

## Question to ask

You are reviewing a change to a concept prototype of a virtual ER waiting room (Next.js App Router, Tailwind 4, Vitest, Playwright). Synthetic data only. Find problems; do not confirm. List each fault with the file and line, why it is a fault, and the smallest fix. Look for:

1. Accessibility: heading levels, `<details>`/`<summary>` use, list roles, focus, right-to-left (Arabic, Urdu) layout, text at 200 percent size, high contrast mode.
2. Logic: `beforeYouLeaveShows` (only `waiting` and not expired). A state where "Before you leave" shows but should not, or the reverse.
3. Safety text: the 911 line and fixed sentences must never be copied or changed. Step 2 of "How it works" reuses `patient.fromHomeText[0]`; 3 answers reuse `placeCanChange`, `emergencyLine` and `start.paused` (filled into `{message}`). Any place where a fixed sentence is copied, cut, or can be lost.
4. Tests: a test that passes when the code is wrong, or a gap.
5. Code quality for a beginner: one job per file, no file over 300 lines.

Do not review the wording of the translations (a fluent human reviewer does that).

## What changed

Commits on branch `phase5-e2e`: `4aa0132` (tests first), `6343495` (text and components), `6b5a87f` (checklist label), `ff010e6` (docs and one e2e check). Diff base `4b6c286`.

Changed files (lines added, removed; file length now):
- SPEC.md: 1, 1 (checklist words: "has a smartphone with internet")
- components/patient/BeforeYouLeave.tsx: 21, 0 (new, 21 lines)
- components/patient/BeforeYouLeave.test.tsx: 18, 0 (new)
- components/patient/StatusAndSound.tsx: 5, 0 (67 lines)
- components/staff/eligibility.ts: 1, 1
- components/start/HowItWorks.tsx: 22, 0 (new, 22 lines)
- components/start/HowItWorks.test.tsx: 31, 0 (new)
- components/start/StartPageBody.tsx: 5, 1 (51 lines)
- components/start/StartQuestions.tsx: 34, 0 (new, 34 lines)
- components/start/StartQuestions.test.tsx: 33, 0 (new)
- components/start/StartVisit.tsx: 1, 0 (216 lines)
- e2e/declined-switch.spec.ts: 1, 1
- e2e/helpers/flows.ts: 1, 1
- e2e/recall-arrive.spec.ts: 3, 0
- lib/beforeYouLeave.ts: 8, 0 (new, 8 lines)
- lib/beforeYouLeave.test.ts: 38, 0 (new)
- lib/text/en.ts: 48, 0 (250 lines)
- lib/text/fr.ts, ar.ts, ur.ts, zh.ts: 42, 0 each (213 to 215 lines)
- lib/text/translations.test.ts: 19, 0

## Helpers the changed lines call (not in the diff)

From `lib/text/index.ts`:

```ts
export function fill(sentence: string, values: Record<string, string | number>): string {
  return sentence.replace(/\{(\w+)\}/g, (whole, name: string) => (name in values ? String(values[name]) : whole));
}

export function textFor(language: string | null | undefined): PatientText {
  return (language && TEXT[language]) || en;
}
```

From `lib/patientView.ts` (the field `beforeYouLeaveShows` reads):

```ts
  /** Started from home, never triaged, and past the 6 hours staff keep expecting it. */
  expired: boolean;
```

`PatientText = typeof en`, so every translation has the same keys; `lib/text/translations.test.ts` checks the same paths, the same `{fill-in}` words, and that 911 and 811 stay.

## Checked (output in this session)

- `npm test`: 131 test files, 868 tests pass.
- `npm run lint`: exit 0.
- `npm run build`: passed.
- `npm run e2e`: 39 passed (4.5 min), with axe on phone and laptop.
- `npx playwright test e2e/recall-arrive.spec.ts`: 3 passed, with the new check that "Before you leave" shows while `waiting` and is gone when called.
- Browser at 390 px: English Normal and Extra large, Arabic Extra large (right to left): 6 steps, 8 questions, page 375 px wide, first question opens with Enter.

## Not checked

- Arabic and Urdu at Normal size; Urdu and Chinese in the browser.
- The patient screen by eye (only the e2e check).
- High contrast mode for the new sections.
- A real screen reader.
