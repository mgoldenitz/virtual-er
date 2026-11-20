# Plan: two Claude features (dashboard summary, demo day plan)

## Context

Michael asked for Claude features through /claude-api. He chose feature 1 (a staff button on the dashboard that gives 2 or 3 plain sentences about today's numbers) and feature 2 (the demo simulator uses Claude). Feature 3 (wording check) is dropped. Both run local and on Vercel.

Hard rules that shape the design (SPEC.md lines 33-43):
- Rule 1: only totals go to Claude. No codes, tokens, ids, times of single visits, or survey text.
- Rule 2: Claude decides nothing clinical. Claude never picks a CTAS level. The simulator SQL keeps its own random 4 or 5.
- Rule 4: totals only. The route sends the same counts that the dashboard already shows.

The key goes in `.env.local` (line `ANTHROPIC_API_KEY=`, with no value in `.env.example`) and on the Vercel project page Settings > Environment Variables. Michael types it there himself. The secrets hook (`.claude/hooks/check-secrets.mjs` line 7) already stops `sk-ant-` keys in files.

## Before work starts

1. The working tree has changes I did not make: `e2e/helpers/staff.ts`, `e2e/timed-steps.spec.ts`, `.agents/`, `.codex/`. I leave them alone and do not stage them. My save points use `git add` with my own file names only.
2. I stay on `phase5-e2e` and commit only my files, because a new branch would carry the uncommitted e2e files with it. If Michael wants a new branch, he tells me.
3. Save point: commit of the plan file copy in docs/ (`docs/2026-11-20-claude-features-plan.md`).
4. Michael runs, one per line: `npm install @anthropic-ai/sdk`

## Feature 1: dashboard summary (do first, smaller)

Data flow: button (browser) -> `POST /api/dashboard-summary` with the staff sign-in token -> route checks the token is staff -> route reads visits and daily_stats as the caller (same way as `app/api/recall-alert/route.ts`) -> `dashboardNumbers()` from `lib/dashboardNumbers.ts` -> only the counts go to Claude -> 2 or 3 sentences come back.

The route counts the numbers itself. It does not trust numbers sent from the browser, so nobody can make it send other text to Claude.

New files:
- `lib/summaryInput.ts`: one sentence: turns the two `SiteNumbers` into the small object of totals that goes to Claude, with nothing else in it. Test `lib/summaryInput.test.ts`: the output has only number fields with the agreed names, and no field from `DashboardVisit`.
- `lib/summaryPrompt.ts`: one sentence: holds the instruction text for Claude (plain words, 2 or 3 sentences, no advice about patients, no clinical words, say "demo" when the numbers are demo). Learn by Doing: Michael writes the rule lines (TODO(human)).
- `lib/summaryAnswer.ts`: one sentence: decides what the screen shows from Claude's reply: the text, or a fixed message when the reply is empty, cut off (`max_tokens`) or a `refusal`. Test `lib/summaryAnswer.test.ts`.
- `data/claudeClient.ts`: one sentence: makes the one Anthropic client on the server (`import "server-only"`, `new Anthropic()` reads `ANTHROPIC_API_KEY`), the same pattern as `data/supabaseServer.ts`.
- `app/api/dashboard-summary/route.ts`: one sentence: the server route. Steps: no key -> 204; no Bearer token -> 401; `auth.getUser(token)` and `isStaffAccount()` from `lib/staffAccess.ts` -> 403 if not staff; read rows; count; call `claude-opus-5-5`, `max_tokens` 400, `output_config.effort` "low", no `thinking` field (on Opus 5.5 thinking is always on); 20-second timeout; typed errors (`Anthropic.RateLimitError`, `Anthropic.APIError`) -> 502 with a plain result word. Body is `{ isDemo: boolean }` only, checked by a parse function in `lib/summaryInput.ts`.
- `data/dashboardSummary.ts`: one sentence: the browser call to the route with the sign-in token.
- `components/dashboard/SummaryPanel.tsx`: one sentence: the button "Write a short summary", a `role="status"` line while it waits, the text, and the line "Written by an AI model from today's totals. Check the numbers above." The button is off for 30 seconds after a click, so a double click does not pay twice.
- Edit `components/dashboard/DashboardView.tsx`: add `<SummaryPanel isDemo={isDemo} />` under the numbers.
- Edit `.env.example`: add `ANTHROPIC_API_KEY=`.

Tests that must change: none. I searched `lib/*.test.ts` and `components/dashboard/*.test.tsx`; no test covers the area below the site numbers.

## Feature 2: Claude writes the demo day plan

The 5-minute `pg_cron` job stays SQL. Claude does not run every 5 minutes (288 calls a day, and the database cannot call the SDK). Instead, once a day, Claude writes a "day plan": the chances the simulator uses (how often demo patients tap "Seen", "I'm on my way", "I'm still here", how often a visit is declined, starts from home, the recall gap, the language mix). The SQL reads these numbers in place of its fixed ones (0.7, 0.5, 0.1, 12 and 18 minutes...). This gives each day a different evening, and Claude never touches a visit.

New and changed files:
- `lib/demoPlan.ts`: one sentence: checks Claude's day plan and keeps every number in a safe range (for example each chance between 0.05 and 0.95, recall gap between 10 and 20 minutes so the 120 to 190 minute wait range stays true), or returns the default plan. Test `lib/demoPlan.test.ts`: good plan passes, out-of-range number is clamped, missing field gives the default, extra text field is dropped.
- `app/api/demo-plan/route.ts`: one sentence: the daily cron route. `isCronRequest()` from `lib/cronAuth.ts` (CRON_SECRET, as keep-alive). Calls Claude with structured output (`output_config.format` with a JSON schema; I confirm the exact shape in the skill's docs before I write it). Checks with `lib/demoPlan.ts`. Saves with `rpc("set_demo_plan", ...)` through `data/supabaseServer.ts`.
- `vercel.json`: add `{ "path": "/api/demo-plan", "schedule": "0 9 * * *" }`. I check the Vercel plan cron limit first.
- `supabase/migrations/20261120000000_demo_plan.sql`: adds plan columns to `demo_settings` (with today's fixed numbers as defaults, so the simulator acts the same until a plan comes); a function `set_demo_plan(...)` with its own range checks, granted to `service_role` only; `create or replace function simulate_demo_tick()` reading the plan columns. Every statement still filters `is_demo = true`. I show Michael the SQL and wait for his OK; he runs it in the SQL Editor.
- `supabase/checks/demo_tick.sql`: add checks that a plan with extreme values is refused by `set_demo_plan`, and that no real visit changed.
- `data/demoPlanSave.ts`: one sentence: the server call that saves the plan.

Docs that must change (owner approval):
- SPEC.md line 118 says "A scheduled simulator (no AI model)". New text: "A scheduled simulator plays ... Once a day, an AI model sets the simulator's chances (tap rates, recall gap, language mix) within fixed limits; it never sets a CTAS level and never sees a visit."
- docs/decisions.md: new 2026-11-20 line that replaces the "no AI model" part of the 2026-11-18 simulator lines (84, 85), with the reason (Michael chose "Change the simulator").
- docs/2026-11-18-demo-simulator-plan.md "Cost" section: one line that the plan call is once a day.

Tests that must change: none in `lib/`. `supabase/checks/demo_tick.sql` gets new checks; old checks stay, because the default plan keeps today's numbers.

## Order of work

1. Save point (plan in docs/).
2. Feature 1 lib files and tests (builder worker, Haiku), then I run the tests.
3. TODO(human) in `lib/summaryPrompt.ts` for Michael.
4. Feature 1 route, data, component. Run the three checks. Save point.
5. Model handoff: Gemini Hydrogen 4, High, reviews feature 1 (round 1: `handoffs/archive/2026-11-20-gemini-review-dashboard-summary.md`; round 2 on the fixes: `handoffs/2026-11-20-gemini-review-dashboard-summary-fixes.md`).
6. Feature 2 lib file and test, route, `vercel.json`. Save point.
7. Migration SQL shown to Michael; he runs it; I run `supabase/checks/demo_tick.sql` only after his OK.
8. SPEC and decisions lines after his OK. Save point.
9. Model handoff: Gemini Hydrogen 4, High, security review of feature 2 (route, SQL, ranges).

## Verification

- `npm test 2>&1 | grep -E "Test Files|Tests "`, `npm run lint`, `npm run build` after steps 4, 6 and 8.
- Feature 1 by hand: `npm run dev`, sign in as staff, open /dashboard, press the button in Real and Demo. Signed out, `POST /api/dashboard-summary` returns 401. With no key in `.env.local`, it returns 204 and the panel says the summary is off.
- Feature 2: call `/api/demo-plan` locally with the `CRON_SECRET` header (Michael runs the command, I give it with the value left as `$env:CRON_SECRET`); check the `demo_settings` row; wait 10 minutes and check the demo visits still move.
- Never pass on a worker's report without running its "Done when:" check myself.

## Cost note

Feature 1 costs one Claude call per button press. Feature 2 costs one call a day. I do not quote prices from memory; Michael can see the use on the Claude Console usage page.
