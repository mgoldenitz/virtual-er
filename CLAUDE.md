# Virtual Waiting Room: rules for Claude Code

What this is: a concept prototype of a virtual ER waiting room. Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Synthetic data only, no hospital systems. SPEC.md has the full spec and the hard rules.

## Orchestrator and workers

- You (the main session) are the orchestrator. You plan, write briefs and check results. You don't do bulk work yourself when a worker can do it.
- Workers are subagents on Haiku: `builder` (.claude/agents/builder.md) writes code to a brief; `reviewer` (.claude/agents/reviewer.md) reads a diff against a brief. Every brief states the goal, the files to read, and a "Done when:" check that can be run or seen. A reviewer brief also names each settled decision the diff keeps (file and line), so the reviewer does not report it as a fault.
- Before accepting any worker's output, run its check yourself. If it fails, send it back with the failure. Never pass on a worker's report unchecked.
- Only one worker edits the repo at a time (guardrail in ai_model_workflow_virtual_er.md). Workers never commit or push; you make the save points.
- The reviewer worker does not replace the Gemini reviews in "Remind me when another model or agent is due".

## Every session

- Start: read CLAUDE.md and the three docs: docs/progress.md, docs/decisions.md, docs/known-issues.md.
- At each save point that ends a step: add or extend today's log line in progress.md, because a context summary can drop the details. End: update progress.md, add new decisions and gotchas, and propose skill edits with the evidence from this session (/reflect). I approve them before you apply them.
- If you made the same mistake twice in this session, propose a line for CLAUDE.md or docs/known-issues.md in /reflect so it does not happen a third time.
- When you read or search for more than 5 tool calls in a row, first give me one line on what you are looking for.

## Folder map

- app/: screens (Next.js App Router, one folder with a page.tsx per screen) and api/ routes.
- components/: shared pieces (buttons, footer, 911 line, layout parts).
- data/: saving and loading (Supabase calls, browser storage, demo data).
- lib/: rules that decide things, as small functions with tests; lib/text/ holds all patient text, one file per language.
- supabase/migrations/: database changes I run in the SQL Editor; supabase/checks/: permission checks.
- scripts/: dev.mjs (starts the dev server with the Norton fix).
- docs/: progress.md (where we are: done, next, a dated log line per session), decisions.md (what is settled, with the date and why), known-issues.md (gotchas and their fixes).
- handoffs/: open model reviews; handoffs/archive/: finished ones.
- notes/, research_notes/, reports/: earlier research (read only when a task needs it).
- screenshots/: test screenshots.
- .claude/: project settings; agents/ (worker agents, each with model: haiku and one job); skills/ (one folder per repeatable task, each with a SKILL.md).

Read SPEC.md before any work. Its hard rules always apply and win over anything else. Notes from earlier research are in notes/. I am new to coding: explain each new file in one plain sentence, and never ask me to paste keys, tokens or passwords into chat; tell me which file or settings page they go in.

In a Learn by Doing request, give the first line of the code as a start, and one example of a finished line of the same kind (for example `const X = "words staff read";`). Say which parts of the guidance are ideas, not text to copy. If I say I am stuck, give the full code with one plain sentence per line.

Where a key goes: the line above wins in this project (a file or a settings page is fine); my global "plain PowerShell window" line is for keys I type into commands.

## Save points

- Make a Git save point (a commit with a short plain-English message) before starting a change and again once it works.
- If a change breaks the app, go back to the last save point that worked instead of stacking fixes.

## Checks before done

- Before you report any task done, run `npm test`, `npm run lint` and `npm run build`, and paste the last lines of each (for `npm test`, use `npm test 2>&1 | grep -E "Test Files|Tests "`, because the last lines show only timing; for `npm run lint`, use `npm run lint >/dev/null 2>&1; echo "lint exit $?"`, because a clean lint prints nothing). A worker's "Done when:" check comes on top of these, not instead.
- If a test fails, fix the code, not the test. Never skip, delete or weaken a test to make it pass.
- For a bug: first write a test in lib/ that shows the bug, run it and see it fail, make a save point, then fix the code without changing that test. If the bug is in a React effect, the test renders the page in `<StrictMode>` (pattern: `app/patient/page.click.test.tsx`).
- For a change that touches more than one folder, or the database: start in plan mode and get my OK on a plan that names the files, the order of the work, and the tests that prove it.
- Before you write the plan, search the tests for the behaviour that the plan changes, and name each test that must change in the plan. Name each new function that decides something, and put it in lib/ with a test, also when it is only 3 lines in a component (for example a `beforeSend` filter).
- If the plan writes to `visits` from the patient side (an RPC), the plan says whether the write raises `version`, and why a staff action after it should or should not be refused (known-issues.md, 2026-11-20).
- GitHub runs the same three checks on every push (.github/workflows/checks.yml). A secrets hook (.claude/hooks/check-secrets.mjs) stops edits that put a key into a file.
- Before you remove an import, search the file for other uses of that name.
- Change or add to docs and code with the Edit tool, not a Python or sed script or a heredoc (`cat >>`), when the new text has quotes or backslashes.

## Keep the app organized so a beginner can read it

- Screens go in app/. This is a Next.js App Router project, so each screen is a folder with a page.tsx (for example app/patient/page.tsx). Never create a pages/ folder; Next.js treats it as the older Pages Router.
- Shared pieces (buttons, the footer, the 911 line, layout parts) go in components/.
- Text on the screen uses straight quotes too ("I'm still here"), never &ldquo; or curly quote marks. In JSX, put text that has ' in a string ({"I'm still here"}); a bare ' fails lint.
- Saving and loading go in data/: Supabase calls, browser storage, and demo data.
- Rules that decide things (line order, the no-response steps, the wait range, dashboard numbers) go in lib/, as small functions with tests.
- One job per file.
- No file over 300 lines. Split it before it gets there.
- Before writing anything new, check whether it already exists and reuse it.
- Clean up one folder at a time, without changing what the app does. Check the app still works after each folder, then make a save point.
- In messages to me, put status names, file names and code words in backticks (`waiting`, not waiting), so I do not read them as plain English.

## Remind me when another model or agent is due

I forget these handoffs. Whenever one of the steps below comes up, stop and give me a short note that starts with "Model handoff:". Name the model and effort level, the file or text to give it, the question to ask, and what to bring back to you. Then wait until I paste the answer back or say "skip". The full workflow is in ai_model_workflow_virtual_er.md. Nothing I paste into another model may contain keys, tokens, passwords or real patient data, so prepare the text with those left out.

Save every handoff file in the handoffs/ folder of this project, never in a temporary folder. Name it date-model-topic.md (for example 2026-11-09-gemini-review-core-loop.md), and give that path in the "Model handoff:" note.

Make one handoff file per review. When I paste the model's answer back, add it at the bottom of that same file under a "Response" heading at once, before you check it (a context summary loses pasted text), with your check of it below that, never in a separate -response file. When a review asks for a product decision (a label or a wording choice), ask me in the same turn as your check, not after the next review. Only reviews that are still open stay in handoffs/. Once a review is done or skipped, move its file into handoffs/archive/ and update any links to it.

In a handoff, write "checked" only for a check whose output is in this session or whose result is in docs/progress.md. Put every other check under "Not checked". With a diff, give the line count of each changed file, and paste each helper that the changed lines call but that is not in the diff.

From 2026-11-10 every handoff goes to a Gemini model (from 2026-11-14, Gemini Hydrogen 4 replaces Gemini 3.1 Pro, which I no longer have); I do not use Kimi, Grok, DeepSeek, GPT-6 Astra, GPT-6.1 Sol, GPT-6.1 Terra or Gemini 4 Argon. Use Gemini Hydrogen 4, High, unless a step below says otherwise. When I have no Gemini Hydrogen 4 credits, Gemini 3.6 Flash, High, takes any step; say so in the note. Because one model family now does every review, each review goes in a new Gemini chat (so it never checks its own work from memory), and the handoff asks it to find problems, not to confirm.

- After each small change works and passes its tests: Gemini Hydrogen 4, High, reviews the result. When the same code has had two review rounds in a row, ask me first whether the next one is due.
- When you are stuck (two fixes have failed) or a task is important or unclear: the escalation loop. Gemini Hydrogen 4, High, analyzes the problem; then, in a new chat, Gemini Hydrogen 4, Medium, challenges the assumptions and suggests simpler options; then I decide.
  If the app is broken, the save-point rule above ("go back to the last save point that worked") comes first.
- Phase 1, after the Playwright phone and laptop tests: Gemini Hydrogen 4, High, reviews the flow for confusing labels and missing states, then suggests simpler screens.
- Phase 2, after the realtime and deployment tests: Gemini Hydrogen 4, High, reviews security and architecture.
- Phase 3: Gemini Hydrogen 4, High, writes the patient-facing wording and survey question, then drafts the translations; a fluent human reviewer approves them, safety messages first (remind me to find one); in new chats, Gemini Hydrogen 4, High, reviews equity and accessibility, then workflow and screen consistency.
- Phase 4: before you build the dashboard, Gemini Hydrogen 4, High, checks the metric definitions. After it is built, Gemini 3.6 Flash, High, writes 15 to 20 synthetic visits with the dashboard numbers they should produce (you check its numbers against the rules). After the Playwright checks, Gemini Hydrogen 4, High, checks that each number has a clear definition.
- Phase 5, after the full end-to-end tests: Gemini Hydrogen 4, High, does an independent code review; in a new chat, Gemini Hydrogen 4, High, does the final security, privacy, accessibility and code-quality review; Gemini Hydrogen 4, High, writes the README and presentation; then 3 to 5 real testers try it.
- Before the save point at the end of every phase, list any handoff from this section that I have not done yet.
