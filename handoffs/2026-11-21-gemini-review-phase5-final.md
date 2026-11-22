# Gemini review: Phase 5 final security, privacy, accessibility and code-quality review

Model: Gemini Hydrogen 4, High. Use 3 new chats, one for each part below, so that no chat checks its own work from memory. Find problems; do not confirm. (If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.)

Why 3 chats: the first Phase 5 code review upload stopped after about half of a 10527-line bundle. The database review bundle (5383 lines) came through complete. Each bundle here is 5700 lines or less.

For each chat, give it two things: the "Shared context" section plus that part's section (from its "Questions" to its "Not checked"), and that part's bundle file as an attachment. The bundles are not in git.

## Shared context

A concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19, Supabase with row-level security, Vercel). Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Patients have no account: a long random token in the link (`#t=...`) opens one visit. Staff sign in. Synthetic data only, no hospital systems. The owner is new to coding, so the code must stay readable for a beginner.

Each file in the bundle starts with a line `===== FILE: path =====`. `SPEC.md` is first: its "hard rules" always win.

Settled, please do not report:

- Anything that `docs/decisions.md` lists as decided, or that `docs/known-issues.md` lists as a known limit, unless you show that the decision or the note is wrong in the code. (The accessibility bundle has no `decisions.md`; there, only `known-issues.md` applies.)
- Hosting limits that the owner chose: Vercel Hobby (no firewall rule), Supabase free plan.
- The French, Urdu, Arabic and Mandarin text: a fluent human reviews those.

Before your list, say which files you could not read or that stop early in the attachment. Put the faults in order, most serious first. For each fault, give the file and line, the steps or data that cause it, and the wrong result. If you are not sure of a fault, say so and say what would prove it.

## Part 1: security and privacy

Bundle: `handoffs/2026-11-21-gemini-review-phase5-final-1-security-bundle.txt` (87 files, 5700 lines, about 344 KB): `SPEC.md`, `docs/decisions.md`, `docs/known-issues.md`, `.env.example`, `package.json`, `next.config.ts`, `vercel.json`, `proxy.ts`, `supabase/checks/permissions.sql`, all of `supabase/migrations/`, `app/api/`, `data/`, `scripts/`, and the `lib/` files that check callers, tokens, staff access, the cron secret, analytics privacy and the AI summary.

### Questions

1. Access: can a patient (the `anon` role, with or without a token) read or change a visit that is not theirs, read any staff-only data, or call a function that is meant for staff? Can a signed-in user who is not staff do a staff action? Follow each RPC and policy in the migrations, in order, to its final form.
2. Tokens and codes: is any token or visit code guessable, logged, sent to a third party (Vercel Analytics, Pushover, the AI summary), kept in a page address that is sent in a `Referer`, or kept longer than SPEC.md allows?
3. API routes (`app/api/`): for each route, who can call it, what it checks first, and what it gives back on a fault. Is there a route that leaks a database error, a key, or patient data?
4. Privacy: does any data leave the app (analytics, Pushover, logs, the AI summary prompt) with more than SPEC.md allows? Does the old-visit delete remove everything it should?
5. A SPEC hard rule that the code breaks: give the rule number and the line.

Mark each fault "access", "token", "api", "privacy" or "rule". Report a hardening idea only after the faults, under its own heading, and say how much it helps.

### Checked (in this session or in docs/progress.md)

- `npm test`: 95 test files, 631 tests pass. `npm run lint`: exit 0. `npm run build`: passed (2026-11-21, after `3c034a2`; later commits change only docs and the run skill).
- GitHub checks (test, lint, build) passed on `ca9cf88` (run 44944146594).
- `supabase/checks/permissions.sql` ran live in the Supabase SQL Editor (owner, 2026-11-20): 17 rows plus `rls_auto_enable` for 2 roles, no table without RLS.
- Earlier reviews: Phase 2 security and architecture (2026-11-10), the Phase 5 code review and the Phase 5 database review (2026-11-21). Their fixes are in the code.

### Not checked

- No test with a signed-in user who is not staff against the live database in this session.
- `/api/keep-alive` on Vercel: the owner has not confirmed a 200 in the Vercel logs yet.
- No load test of the start route (rate limits).

## Part 2: accessibility

Bundle: `handoffs/2026-11-21-gemini-review-phase5-final-2-access-bundle.txt` (75 files, 5358 lines, about 263 KB): `SPEC.md`, `docs/known-issues.md`, the English text (`lib/text/en.ts` and the language helpers), `lib/contrast.ts`, `lib/textSize.ts`, `lib/rowFocus.ts`, all screens in `app/` (not `app/api/`) and all of `components/`.

### Questions

1. WCAG 2.2 AA: for each screen (start page, patient screen, staff list, staff sign-in, dashboard), what fails? Look at focus order and focus after a screen change, live regions (`role="alert"`, `aria-live`), labels and names for controls, target size (24 by 24 px at least), text size and zoom to 200%, colour contrast, and motion.
2. A screen reader user on a phone: is there a state where a status change, an alert or the "I'm still here" prompt is not announced, or is announced two times?
3. Right-to-left (Arabic, Urdu): does any part of the layout or the text order break when `dir="rtl"`?
4. Plain language: is any English patient text in `lib/text/en.ts` hard to understand, or does it say something that the screen does not do?
5. Code quality in `app/` and `components/`: a file with more than one job, a file over 300 lines, a name that does not say what the thing does, or a comment that no longer matches the code.

Mark each fault "wcag", "screen reader", "rtl", "wording" or "readability". For a WCAG fault, give the success criterion number.

### Checked (in this session or in docs/progress.md)

- `npm test`: 95 test files, 631 tests pass, including click tests for focus after a screen change and a contrast test (`lib/contrast.ts`). Lint exit 0, build passed.
- `npm run e2e` (Playwright, phone 390 x 844 and laptop 1280 x 800): 39 passed on the last run (2026-11-21); one check is flaky (`e2e/timed-steps.spec.ts:84`, in known-issues.md).
- A WCAG 2.2 AA pass was done in Phase 3 (2026-11-17).

### Not checked

- Not tried with a real screen reader (VoiceOver or TalkBack), and not on a real Android phone.
- Zoom to 200% and 400% not tried in a browser in this session.

## Part 3: code quality

Bundle: `handoffs/2026-11-21-gemini-review-phase5-final-3-quality-bundle.txt` (99 files, 4535 lines, about 278 KB): `SPEC.md`, `docs/decisions.md`, `docs/known-issues.md`, `eslint.config.mjs`, `tsconfig.json`, all of `lib/` (English text only) and all of `data/`.

### Questions

1. Correctness: a function in `lib/` or `data/` that gives a wrong result for some input (an empty list, a time across midnight in Toronto, a `null` field, a status that the function does not expect).
2. Dead code and copies: code that nothing in these files calls (say if the caller may be in `app/` or `components/`, which are not in this bundle), or two pieces of code that do the same job.
3. Error handling: a Supabase call in `data/` whose fault is lost, or turned into the wrong answer (for example "not saved" in place of "refused").
4. Readability for a beginner: a file with more than one job, a file over 300 lines, a name that does not say what the thing does, a comment that no longer matches the code, or a type that is wider than it needs to be.

Mark each fault "bug", "dead code", "error handling" or "readability".

### Checked (in this session or in docs/progress.md)

- `npm test`: 95 test files, 631 tests pass; each rule in `lib/` has its own test file (not in the bundle). Lint exit 0, build passed.
- GitHub checks passed on `ca9cf88` (run 44944146594).

### Not checked

- No test coverage report was made.

## Bundles

- Made from the files at `ca9cf88` with `git ls-files`. Left out: the tests, `.mcp.json`, and every `.env` file except `.env.example` (it has only the names of the settings, with empty values). `.env.local` is not in git.
- Searched for keys before saving: no key, token, password, project ID or real patient data. The only long strings are the code and token alphabets. The only addresses are the live app, the Pushover API, two public health links, `localhost` and placeholders.
