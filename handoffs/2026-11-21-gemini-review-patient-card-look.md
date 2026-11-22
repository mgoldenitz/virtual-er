# Gemini review: patient card look, Part 1

Model: Gemini Hydrogen 4, High, in a new chat. If no Hydrogen 4 credits: Gemini 3.6 Flash, High.

Give it: this file, then `handoffs/2026-11-21-gemini-review-patient-card-look-bundle.diff` (1114 lines), then the 2 screenshots `screenshots/2026-11-21-start-en-390.png` (shows French, the saved language) and `screenshots/2026-11-21-start-ar-390.png`, and `screenshots/run/home-phone.png` (English, after the icon fix).

## Prompt

You review a change to a concept prototype: a virtual ER waiting room. Low-acuity patients wait off-site after triage and follow their place in line on a phone. Synthetic data only. Next.js App Router, Tailwind 4, React. Find problems. Do not confirm that the work is good; list only faults, each with file, line, the rule it breaks, and a fix.

The change is visual only. The patient start page (`/`) and patient status page (`/patient`) get a card look: a pale blue header band, a blue gradient hero card that shows the place in line, site choice cards, small icon tiles beside care options, and red safety cards for the 911 line. Staff screens get only small status pills. No patient text changed and no text keys were added.

Hard rules that apply:
- The 911 line ("call 911") shows on every patient screen, in every state and language, and can never be closed or hidden.
- WCAG 2.2 AA: text 4.5:1, non-text and borders 3:1, no meaning by colour only, works at larger text sizes (the page has Normal, Large and Extra large text choices).
- 5 languages; Urdu and Arabic are right-to-left, so layouts use logical classes (`ps-`, `ms-`, `border-s-`), never left or right.
- No file over 300 lines; one job per file; code readable for a beginner.

Settled decisions; do not report these:
- The 911 card has a 4 px red border on all sides (owner chose it over a thick start-side border).
- Staff pill words are English only (staff screens are English only by design).
- The start page shows no "Open" pill for a site, because no short patient text for it exists in 5 languages; new text waits for a translation review.
- `lib/statusPill.ts` holds the pill decisions so they have tests.
- The `prefers-contrast: more` block for `.hero-card` is in the approved plan.
- `.hero-card`, `.header-band` and `.status-pill` stay plain CSS outside a Tailwind layer; no utility changes their colours now (known gotcha).

Questions:
1. Contrast: does any text or border sit on a background without a test in `lib/contrast.test.ts`? Check the hero card (white text on a gradient from #1d4ed8 to #1e40af), the header band (#e8eefc), the pills, the 911 card (#7f1d1d on #fef2f2, border #b91c1c), the chosen site card (#e8eefc with a #1d4ed8 border), and the paused message (#7f1d1d on #fee2e2, border #b91c1c).
2. Right-to-left: does anything not mirror in Urdu or Arabic?
3. Larger text: can the header band, the hero card number (`text-5xl`), the site cards or the pills overflow or clip at Extra large text on a 390 px phone?
4. The 911 rule: is there any state of `/patient` or `/` where the 911 card does not render or can be hidden?
5. Screen readers: are the icons hidden correctly, and does the new layout change reading order or headings?
6. CSS cascade: does any utility class in the diff have no effect because of a plain CSS class?
7. Anything else that breaks a rule above.

## Facts for the reviewer

Line counts of each changed file now: `app/globals.css` 131, `app/patient/page.tsx` 131, `components/EmergencyLine.tsx` 8, `components/PatientHeader.tsx` 15 (new), `components/SafetyCard.tsx` 16 (new), `components/patient/PatientStatus.tsx` 176, `components/staff/PauseSwitch.tsx` 166, `components/staff/VisitRow.tsx` 172, `components/start/CareIcon.tsx` 26 (new), `components/start/CareOptions.tsx` 79, `components/start/StartPageBody.tsx` 47, `components/start/StartVisit.tsx` 215, `lib/contrast.test.ts` 106, `lib/iconTileLayer.test.ts` 33 (new), `lib/statusPill.test.ts` 44 (new), `lib/statusPill.ts` 27 (new).

The bundle is `git diff 4e47011..d565f3c` without docs, then the full text of helpers the changed lines call or sit in: `lib/contrast.ts`, `components/LanguageSwitch.tsx`, `components/patient/TextSizeSwitch.tsx`, `components/patient/PatientStatus.tsx`, `components/start/StartVisit.tsx`. No `.env` file or `.mcp.json` is in it.

Checked (output in this session, 2026-11-21):
- `npm test`: 125 test files, 819 tests pass. `npm run lint`: exit 0. `npm run build`: passed.
- `npm run e2e` (Playwright with axe, phone 390 px and laptop 1280 px): 39 passed. This run was before the icon fix `82e5fe4`; the fix changes only the icon colour.
- The build CSS has the `has-checked:border-brand` and `has-checked:bg-band` rules, and `.icon-tile` inside `@layer components`.
- Start page at 390 px in English after the fix: both 911 icons are red on white.
- Start page at 390 px in Arabic: the layout mirrors, no sideways scroll.
- A Haiku reviewer worker read the diff: one fault (the 911 icon was blue), now fixed.

Not checked:
- The `/patient` hero card by eye (the e2e tests open it, but nobody looked at it).
- Extra large text on `/patient` and `/` at 390 px.
- The staff pills in a browser.
- A real screen reader.
- Windows high contrast mode (`forced-colors`).
