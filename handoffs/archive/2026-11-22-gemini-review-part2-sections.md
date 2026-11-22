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

## Response

Gemini Hydrogen 4, High, 2026-11-22, pasted by the owner:

1. Safety text: `questions.holdPlace.a` copies and cuts `patient.fromHomeText[0]`.
   File and line: `lib/text/en.ts:76-79` (and `lib/text/fr.ts:65-68`, `lib/text/ar.ts:65-68`, `lib/text/ur.ts:65-68`, `lib/text/zh.ts:65-68`) and `components/start/StartQuestions.tsx:10`.
   Why it is a fault: `patient.fromHomeText[0]` pairs two sentences: "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.". `questions.holdPlace.a` hardcodes "Starting from home does not hold a place in line. Your place in line starts when a nurse sees you at triage." across all five language files, copying the first sentence instead of referencing `patient.fromHomeText[0]`, and cutting "The most urgent patients are always seen first.". If the triage rule changes, `holdPlace.a` drifts out of sync across every language.
   Smallest fix: Replace the second sentence in `questions.holdPlace.a` with `{triage}` across the five text files (or store only the lead sentence) and pass `fill(q.holdPlace.a, { triage: t.patient.fromHomeText[0] })` in `components/start/StartQuestions.tsx:10`.

2. Tests: `StartQuestions.test.tsx` lets `paused` copy or drop `t.start.paused` and skips 5 answers.
   File and line: `components/start/StartQuestions.test.tsx:26-31`.
   Why it is a fault: Line 31 checks `expect(answers[7]).toContain(t.start.paused)` instead of checking the exact filled string. If someone removed `{message}` from `questions.paused.a` and copied the paused text directly into `questions.paused.a`, or if `t.start.paused` were empty, `toContain` would still pass. Line 27 also extracts the answer with `.replace(item.querySelector("summary")?.textContent ?? "", "")` instead of reading `<p>` directly, and answers 0, 2, 3, 5, and 6 are never checked.
   Smallest fix: Read `item.querySelector("p")?.textContent ?? ""` on line 27, assert `expect(answers[7]).toBe(fill(t.start.questions.paused.a, { message: t.start.paused }))` and `expect(t.start.questions.paused.a).toContain("{message}")` on line 31, and assert the remaining five answers render.

3. Tests: `HowItWorks.test.tsx` leaves steps 3 to 5 unchecked.
   File and line: `components/start/HowItWorks.test.tsx:25-30`.
   Why it is a fault: Lines 27 to 29 assert `steps[0]`, `steps[1]`, and `steps[5]`, while `steps[2]`, `steps[3]`, and `steps[4]` are never compared against `t.start.howSteps`. Slicing or reordering `rest` inside `HowItWorks.tsx:8-9` while keeping 6 `<li>` elements would still pass.
   Smallest fix: Replace lines 27 to 29 with `expect([...steps].map((s) => s.textContent)).toEqual([t.start.howSteps[0], t.patient.fromHomeText[0], ...t.start.howSteps.slice(1)])`.

4. Tests: `lib/beforeYouLeave.test.ts` omits five `VisitStatus` values.
   File and line: `lib/beforeYouLeave.test.ts:29-31`.
   Why it is a fault: Line 29 checks only `["pre_arrival", "called", "on_the_way", "arrived"]`, omitting `"needs_reassessment"`, `"declined"`, `"not_eligible"`, `"unable_to_reach"`, and `"removed"`. If `beforeYouLeaveShows` used a blocklist and missed `"needs_reassessment"` or `"unable_to_reach"`, the test would still pass.
   Smallest fix: Add those five to the `it.each<VisitStatus>(...)` array on line 29.

5. Accessibility: `<summary>` focus outline clashes with `<details>` corners and high-contrast borders, and lacks hover/active cues.
   File and line: `components/start/StartQuestions.tsx:25-27`.
   Why it is a fault: `<details>` has `rounded-xl border-2 border-control`, while `<summary>` has no border radius and sets `focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink`. On keyboard focus, the square outline overlaps the rounded corners and sits on top of the 2 px border, so in Windows High Contrast (`forced-colors: active`) the borders merge into the focus ring. `<summary>` also has `cursor-pointer` with no `hover:` or `active:` feedback.
   Smallest fix: Add `rounded-xl` (and `hover:bg-canvas active:bg-line`) to `<summary>`, or use an inset outline (`focus-visible:outline-offset-[-4px]`).

6. Accessibility / Consistency: `BeforeYouLeave` tells patients to tap "Turn on sound" even after sound is already on.
   File and line: `components/patient/StatusAndSound.tsx:55` and `lib/text/en.ts:139`.
   Why it is a fault: B2 renders whenever `status === "waiting"`, without knowing whether the sound is on (then the "Turn on sound" button is replaced by "Sound is on"). A patient checking the page after enabling sound is told to tap a button that is no longer present.
   Smallest fix: Change B2 so it does not name the disappearing button (for example "Keep your phone charged and sound on."), or pass `soundOn` from `StatusAndSound`.

7. Accessibility / Readability: `role="list"` and its comment in `BeforeYouLeave.tsx` conflict with `HowItWorks.tsx`.
   File and line: `components/patient/BeforeYouLeave.tsx:13-14` and `components/start/HowItWorks.tsx:15`.
   Why it is a fault: `BeforeYouLeave.tsx:14` adds `role="list"` on a `list-disc` `<ul>` with a comment saying Safari drops list semantics without bullets, while `HowItWorks.tsx:15` omits it on the `<ol>`. The mismatch and inaccurate comment confuse beginners.
   Smallest fix: Add `role="list"` to the `<ol>` and fix the comment, or remove `role="list"` from `BeforeYouLeave.tsx:14`.

8. Code quality / Accessibility: `key={item.q}` in `StartQuestions.tsx` unmounts open items on language change.
   File and line: `components/start/StartQuestions.tsx:25`.
   Why it is a fault: Keying by the translated question remounts all 8 `<details>` (closing an open answer) when the language changes, and would collide if a translation repeated a question.
   Smallest fix: A fixed id per item, or `key={index}`.

9. Code quality for a beginner: `howSteps` holds 5 items for a 6-step list.
   File and line: `lib/text/en.ts:65-71` (and the 4 translations), `components/start/HowItWorks.tsx:8-9`, `lib/text/translations.test.ts:60-63`.
   Why it is a fault: `howSteps[1]` to `howSteps[4]` are off by one from the visible step numbers, and the translation files have no comment that says why step 2 is missing.
   Smallest fix: Store `howSteps` as named fields (`{ start, decide, follow, recall, desk }`).

## Check

Claude, 2026-11-22, against the code at `f268395`.

1. Accepted, needs an owner wording choice. `lib/text/en.ts:78` copies the first sentence of `fromHomeText[0]` (`en.ts:154`), so the copy can drift. With `{triage}`, the answer also gets "The most urgent patients are always seen first." (approved SPEC text, already in all 5 languages). Each translation drops its copied sentence for `{triage}`; no new words.
2. Accepted. `StartQuestions.test.tsx:27` reads the text by removing the summary, and line 31 uses `toContain`. Fix as proposed, plus a check that answers 0, 2, 3, 5 and 6 are their own `a` text.
3. Accepted. `HowItWorks.test.tsx:27-29` checks 3 of 6 steps. Fix as proposed.
4. Accepted. `beforeYouLeave.test.ts:31` lists 4 of the other 9 statuses. Add the 5.
5. Accepted. Add `rounded-xl` and a hover color to `<summary>` (`StartQuestions.tsx:26`). I check the color name exists in the theme first, and look at forced colors in the browser.
6. Accepted, needs an owner wording choice. `en.ts:139` names "Turn on sound", and that button becomes "Sound is on" (`en.ts:213-214`).
7. Accepted. The comment at `BeforeYouLeave.tsx:13` is wrong: Safari drops list roles when `list-style: none`, not when bullets show. Remove `role="list"` and the comment, so both lists match.
8. Accepted. Use a fixed id per item (`holdPlace`, `placeChanged`, ...) in `StartQuestions.tsx:25`.
9. Rejected in part. Named fields would change the keys in 5 files and the tests for a small gain; `en.ts:63` already says why step 2 is missing. I add the same comment to the 4 translation files.
