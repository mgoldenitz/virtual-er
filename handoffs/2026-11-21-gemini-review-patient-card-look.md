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

Owner, 2026-11-21: ran the e2e cleanup SQL, and checked the staff pills in a browser: as planned.

## Response

Gemini Hydrogen 4, High, 2026-11-21 (pasted by the owner):

**1. Contrast (`lib/contrast.test.ts` gaps)**

* `lib/contrast.test.ts` lines 74-76 and 95-98; `components/SafetyCard.tsx` lines 5-6; `components/start/StartVisit.tsx` line 199. Fault (WCAG 2.2 AA 1.4.11 non-text contrast / missing test coverage): `t["alert-edge"]` (`#b91c1c`) is tested against `t.canvas` (`#f5f5f7`) and `t["stop-tint"]` (`#fee2e2`), but never against `t["alert-tint"]` (`#fef2f2`, the inside edge of the 4 px border on `SafetyCard`) or against `#ffffff` / `t.card` (used both by the `bg-white text-alert-edge` 911 icon in `SafetyCard.tsx:6` and by the outer edge of the paused message in `StartVisit.tsx:199` inside `.clean-card`). Fix: add assertions in `lib/contrast.test.ts` checking `contrastRatio(t["alert-edge"], t["alert-tint"]) >= 3`, `contrastRatio(t["alert-edge"], t.card) >= 3`, and `contrastRatio(t["alert-edge"], t.card) >= 4.5` (or >= 3 for non-text icon strokes if using `bg-card`).
* `lib/contrast.test.ts` lines 99-103; `components/PatientHeader.tsx` lines 9-12; `components/LanguageSwitch.tsx` lines 24 and 35; `components/patient/TextSizeSwitch.tsx` line 25. Fault (1.4.11 / missing test coverage): moving `LanguageSwitch` and `TextSizeSwitch` inside `.header-band` (`#e8eefc`) places `border-control` (`#6b7280`) on the `<select>` and text-size radio labels, and `border-amber-700` on the draft notice, directly against `t.band` (`#e8eefc`). `lib/contrast.test.ts:99-103` only checks `t.control` on `canvas` (`#f5f5f7`) and `card` (`#ffffff`), not on `t.band`. Fix: add `t.band` to the backgrounds checked against `t.control` in `lib/contrast.test.ts`.
* `lib/contrast.test.ts` lines 91-93; `components/start/StartVisit.tsx` line 181. Fault (1.4.11 / missing test coverage): the chosen site card (`has-checked:border-brand has-checked:bg-band`) sits inside `.clean-card` (`bg-card`, `#ffffff`), so its border (`#1d4ed8`) borders `t.band` inside and `t.card` outside. The new test in `lib/contrast.test.ts:91-93` checks `t.brand` on `t.band` only, not on `t.card`. Fix: assert `contrastRatio(t.brand, t.card) >= 3` alongside the `t.band` check.

**2. Right-to-left (Urdu and Arabic)**: no fault found in the diff.

**3. Larger text (Extra large text on a 390 px phone)**

* `components/start/StartVisit.tsx` lines 181 and 186. Fault (1.4.4 / works at larger text sizes on 390 px): even at Normal text size on a 390 px viewport (the 3 screenshots), "Demo Site A" and "Demo Site B" wrap onto two lines inside the two `flex-1` cards. At Extra large text (150%+ root size), `px-4` (2rem horizontal padding), `gap-3` (0.75rem), and `size-5` (1.25rem) leave a narrow text column per card before `flex-wrap` wraps them, and `<input type="radio" className="size-5">` omits `shrink-0` (unlike `TextSizeSwitch.tsx:33`), allowing flexbox to squash the radio circle horizontally when space is tight. Fix: add `shrink-0` to the radio on line 186, and give the `<label>` a minimum width (for example `min-w-44` or `basis-44`) on line 181 so the two site cards stack cleanly to full width instead of squeezing into narrow multi-line columns at Extra large text.

**4. The 911 rule**: no fault found.

**5. Screen readers**

* `components/start/CareOptions.tsx` line 39. Fault (1.3.1 Info and Relationships): replacing `className="list-disc space-y-2 ps-6 text-base"` with `className="space-y-3 text-base"` leaves Tailwind Preflight's `list-style: none` active on `<ul>`. Safari and iOS VoiceOver strip `list` and `listitem` semantics from `<ul>` elements when `list-style` is `none`, so the four care options are no longer announced as a list of 4 items. Fix: add `role="list"` to the `<ul>`.

**6. CSS cascade**: no fault found.

**7. Other rule faults**

* `app/globals.css` lines 46-52, 63-67 and 86-92. Fault (1.4.11 / `forced-colors` mode noted as unchecked): `.hero-card`, `.header-band` and `.status-pill` rely solely on `background` and `box-shadow` with no `border`. In Windows High Contrast mode (`forced-colors: active`), browsers strip background colours, gradients and box shadows, leaving the hero card, header band and staff status pills without visible container boundaries. Fix: add `border: 1px solid transparent;` (or 2px) to `.hero-card`, `.header-band` and `.status-pill`, so they stay unchanged in standard mode while gaining visible system-coloured borders under `forced-colors: active`.
* `components/SafetyCard.tsx` line 6. Fault (readability / token consistency): uses the raw colour utility `bg-white` on `.icon-tile` instead of the semantic `--color-card` token (`bg-card`) used across the rest of the app and referenced by `lib/contrast.test.ts` (`t.card`). Fix: change `bg-white` to `bg-card` (and update the comment in `app/globals.css:70`).
