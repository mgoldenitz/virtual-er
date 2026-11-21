# Gemini review: Phase 5 independent code review

Model: Gemini Hydrogen 4, High, in a new chat. Find problems; do not confirm.

Give it two things: the prompt below (from "Context" to "Not checked"), and the file `handoffs/2026-11-21-gemini-review-phase5-code-bundle.txt` as an attachment.

## Context

A concept prototype of a virtual ER waiting room (Next.js 16 App Router, React 19, Supabase with row-level security, Vercel). Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Synthetic data only, no hospital systems. The owner is new to coding, so the code must stay readable for a beginner.

The attached bundle has, in this order:

- `SPEC.md`: the spec. Its "hard rules" always win.
- `docs/decisions.md`: settled decisions, with the date and why.
- `docs/known-issues.md`: known gotchas and known limits.
- The source: `app/`, `components/`, `data/`, `lib/` (English text only, `lib/text/en.ts`), `supabase/migrations/`, `scripts/`, `proxy.ts` and the config files. Each file starts with a line `===== FILE: path =====`.

Not in the bundle: the tests (91 unit test files, 17 e2e files), the SQL check files in `supabase/checks/`, and the French, Urdu, Arabic and Mandarin text (a fluent human reviews those).

Settled, please do not report:

- Anything that `docs/decisions.md` lists as decided, or that `docs/known-issues.md` lists as a known limit, unless you show that the decision or the note is wrong in the code.
- The final security, privacy and accessibility review is a separate chat after this one. Report a security fault only when it is a plain bug (wrong code), not a hardening idea.

## Questions

1. Correctness: where can the app give a wrong result? Look at visit status changes, the line order, the wait range, the no-response steps (10, 20 and 30 minutes), the dashboard numbers, Undo, the survey, and two staff screens or a staff screen and a patient phone that change the same visit at the same time. For each fault, give the file and line, the steps or data that cause it, and the wrong result.
2. SPEC hard rules: does any code break a hard rule in `SPEC.md`? Give the rule number and the line.
3. The database: do the migrations, in order, give the functions and policies that the app code calls? Is there a function or policy that the app needs but that a later migration drops or changes?
4. Dead code and copies: code that nothing calls, or two pieces of code that do the same job.
5. Readability for a beginner: a file with more than one job, a file over 300 lines, a name that does not say what the thing does, or a comment that no longer matches the code.

Put the faults in order, most serious first. Mark each one "bug", "rule", "database", "dead code" or "readability". If you are not sure of a fault, say so and say what would prove it.

## Checked (in this session or in docs/progress.md)

- `npm test`: 91 test files, 600 tests pass. `npm run lint`: exit 0. `npm run build`: passed (2026-11-21, after `a230faa`).
- `npm run e2e` (Playwright, phone 390 x 844 and laptop 1280 x 800): 39 passed on the last run (2026-11-21); one other run had 1 flaky failure in `e2e/timed-steps.spec.ts:84`, noted in known-issues.md.
- GitHub checks (test, lint, build) passed on `c821646` (run 44884225059).
- Earlier Gemini reviews of single fixes: listed in `docs/progress.md` (not in the bundle).

## Not checked

- No e2e test with two staff screens open at the same time.
- The start route's "paused" and "busy" answers were not tried on purpose in a running app.
- Not tried with a real screen reader, and not on a real Android phone.
- The SQL check files ran in the Supabase SQL Editor (owner), not in this session.

## Bundle

- File: `handoffs/2026-11-21-gemini-review-phase5-code-bundle.txt` (166 code files plus the 3 docs, 10527 lines, about 523 KB).
- Made from `git ls-files` at `a230faa`. Left out: `.mcp.json` (project settings), `.env.local` (not in git). `.env.example` is in it: it has only the names of the settings, with empty values.
- Searched for keys before saving: no key, token, password or real patient data in the bundle.
