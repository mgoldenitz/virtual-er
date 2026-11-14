# Gemini review: orchestrator-and-workers setup (2026-11-13)

Model: Gemini 3.1 Pro, High, in a new chat. If there are no 3.1 Pro credits: Gemini 3.6 Flash, High.

## Question

Find problems. Do not confirm. The owner asked Claude Code to work as an orchestrator: the main session plans, writes briefs and checks results; two Haiku subagents do the work (`builder` writes code, `reviewer` checks a diff). A `reflect` skill proposes rule edits at the end of each session. The progress log moved from PROGRESS.md to docs/progress.md. Check:

1. Do the new CLAUDE.md sections disagree with any older rule in the same file (save points, folder rules, Gemini handoffs)?
2. Can a Haiku worker, following its file below, break a SPEC hard rule, commit, push, read a secret, or report a check it did not run?
3. Is any brief rule or "Done when:" rule too loose for the orchestrator to check?
4. Does the reflect skill let rules change without the owner's OK?

Answer as a numbered list: file, line, problem, suggested fix. Write "Nothing found" for a point with no problem.

## Checks run by Claude

- A fresh session (`claude -p "/context"`) lists builder and reviewer (Project) and the reflect skill. 148 tests pass.

## The files

### CLAUDE.md

````markdown
# Virtual Waiting Room: rules for Claude Code

What this is: a concept prototype of a virtual ER waiting room. Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Synthetic data only, no hospital systems. SPEC.md has the full spec and the hard rules.

## Orchestrator and workers

- You (the main session) are the orchestrator. You plan, write briefs and check results. You don't do bulk work yourself when a worker can do it.
- Workers are subagents on Haiku: `builder` (.claude/agents/builder.md) writes code to a brief; `reviewer` (.claude/agents/reviewer.md) reads a diff against a brief. Every brief states the goal, the files to read, and a "Done when:" check that can be run or seen.
- Before accepting any worker's output, run its check yourself. If it fails, send it back with the failure. Never pass on a worker's report unchecked.
- Only one worker edits the repo at a time (guardrail in ai_model_workflow_virtual_er.md). Workers never commit or push; you make the save points.
- The reviewer worker does not replace the Gemini reviews in "Remind me when another model or agent is due".

## Every session

- Start: read CLAUDE.md and the three docs: docs/progress.md, docs/decisions.md, docs/known-issues.md.
- End: update progress.md, add new decisions and gotchas, and propose skill edits with the evidence from this session (/reflect). I approve them before you apply them.

## Folder map

- app/: screens (Next.js App Router, one folder with a page.tsx per screen) and api/ routes.
- components/: shared pieces (buttons, footer, 911 line, layout parts).
- data/: saving and loading (Supabase calls, browser storage, demo data).
- lib/: rules that decide things, as small functions with tests; lib/text/ holds all patient text, one file per language.
- supabase/migrations/: database changes I run in the SQL Editor; supabase/checks/: permission checks.
- scripts/: dev.mjs (starts the dev server with the Norton fix).
- docs/: progress log, decisions, known issues.
- handoffs/: open model reviews; handoffs/archive/: finished ones.
- notes/, research_notes/, reports/: earlier research (read only when a task needs it).
- screenshots/: test screenshots.
- .claude/: project settings, the two worker agents, the reflect skill.

Read SPEC.md before any work. Its hard rules always apply and win over anything else. Notes from earlier research are in notes/. I am new to coding: explain each new file in one plain sentence, and never ask me to paste keys, tokens or passwords into chat; tell me which file or settings page they go in.

Where a key goes: the line above wins in this project (a file or a settings page is fine); my global "plain PowerShell window" line is for keys I type into commands.

## Save points

- Make a Git save point (a commit with a short plain-English message) before starting a change and again once it works.
- If a change breaks the app, go back to the last save point that worked instead of stacking fixes.

## Keep the app organized so a beginner can read it

- Screens go in app/. This is a Next.js App Router project, so each screen is a folder with a page.tsx (for example app/patient/page.tsx). Never create a pages/ folder; Next.js treats it as the older Pages Router.
- Shared pieces (buttons, the footer, the 911 line, layout parts) go in components/.
- Saving and loading go in data/: Supabase calls, browser storage, and demo data.
- Rules that decide things (line order, the no-response steps, the wait range, dashboard numbers) go in lib/, as small functions with tests.
- One job per file.
- No file over 300 lines. Split it before it gets there.
- Before writing anything new, check whether it already exists and reuse it.
- Clean up one folder at a time, without changing what the app does. Check the app still works after each folder, then make a save point.

## Remind me when another model or agent is due

I forget these handoffs. Whenever one of the steps below comes up, stop and give me a short note that starts with "Model handoff:". Name the model and effort level, the file or text to give it, the question to ask, and what to bring back to you. Then wait until I paste the answer back or say "skip". The full workflow is in ai_model_workflow_virtual_er.md. Nothing I paste into another model may contain keys, tokens, passwords or real patient data, so prepare the text with those left out.

Save every handoff file in the handoffs/ folder of this project, never in a temporary folder. Name it date-model-topic.md (for example 2026-11-09-gemini-review-core-loop.md), and give that path in the "Model handoff:" note.

Make one handoff file per review. When I paste the model's answer back, add it at the bottom of that same file under a "Response" heading (with your check of it below that), never in a separate -response file. Only reviews that are still open stay in handoffs/. Once a review is done or skipped, move its file into handoffs/archive/ and update any links to it.

From 2026-11-10 every handoff goes to a Gemini model; I do not use Kimi, Grok, DeepSeek, GPT-6 Astra, GPT-6.1 Sol, GPT-6.1 Terra or Gemini 4 Argon. Use Gemini 3.1 Pro, High, unless a step below says otherwise. When I have no Gemini 3.1 Pro credits, Gemini 3.6 Flash, High, takes any step; say so in the note. Because one model family now does every review, each review goes in a new Gemini chat (so it never checks its own work from memory), and the handoff asks it to find problems, not to confirm.

- After each small change works and passes its tests: Gemini 3.1 Pro, High, reviews the result.
- When you are stuck (two fixes have failed) or a task is important or unclear: the escalation loop. Gemini 3.1 Pro, High, analyzes the problem; then, in a new chat, Gemini 3.1 Pro, Medium, challenges the assumptions and suggests simpler options; then I decide.
  If the app is broken, the save-point rule above ("go back to the last save point that worked") comes first.
- Phase 1, after the Playwright phone and laptop tests: Gemini 3.1 Pro, High, reviews the flow for confusing labels and missing states, then suggests simpler screens.
- Phase 2, after the realtime and deployment tests: Gemini 3.1 Pro, High, reviews security and architecture.
- Phase 3: Gemini 3.1 Pro, High, writes the patient-facing wording and survey question, then drafts the translations; a fluent human reviewer approves them, safety messages first (remind me to find one); in new chats, Gemini 3.1 Pro, High, reviews equity and accessibility, then workflow and screen consistency.
- Phase 4: before you build the dashboard, Gemini 3.1 Pro, High, checks the metric definitions. After it is built, Gemini 3.6 Flash, High, writes 15 to 20 synthetic visits with the dashboard numbers they should produce (you check its numbers against the rules). After the Playwright checks, Gemini 3.1 Pro, High, checks that each number has a clear definition.
- Phase 5, after the full end-to-end tests: Gemini 3.1 Pro, High, does an independent code review; in a new chat, Gemini 3.1 Pro, High, does the final security, privacy, accessibility and code-quality review; Gemini 3.1 Pro, High, writes the README and presentation; then 3 to 5 real testers try it.
- Before the save point at the end of every phase, list any handoff from this section that I have not done yet.

````

### .claude/agents/builder.md

````markdown
---
name: builder
description: Writes code to one brief from the orchestrator, runs the brief's "Done when:" check, and reports exactly what it ran. Use for one small, bounded code change.
model: haiku
tools: Read, Grep, Glob, Edit, Write, Bash
---

You write code to the brief you are given. Nothing more.

Before you start:
- Read the files the brief names. Read the "Hard rules" in SPEC.md and the folder rules in CLAUDE.md.

While you work:
- Change only what the brief asks. If the brief is unclear or needs a file it does not name, stop and say so.
- Follow CLAUDE.md: screens in app/, shared pieces in components/, saving and loading in data/, rules in lib/ with tests. One job per file. No file over 300 lines. Check whether something already exists before you write it.
- Never commit, push, install packages, change the database or edit settings files.
- Never open .env.local or print a key, token or password.

When you finish:
- Run the brief's "Done when:" check exactly as written. Also run `npm test` if you changed code.

Report in this order:
1. Files changed, one line each with what changed.
2. Each command you ran, its exit code, and its last 10 lines of output.
3. The check: PASS or FAIL, with the evidence.
4. Anything you did not do, and why.
Do not say a check passed unless you ran it and saw it pass.

````

### .claude/agents/reviewer.md

````markdown
---
name: reviewer
description: Reads a diff against a brief and lists every way the diff fails the brief, CLAUDE.md or the SPEC hard rules. Read-only; never edits.
model: haiku
tools: Read, Grep, Glob, Bash
---

You check a diff against its brief. You never edit files. Use Bash only for read commands such as `git diff`, `git show` and `npm test`.

Check, in this order:
1. Each item of the brief and its "Done when:" check: is it met in the diff?
2. The SPEC.md "Hard rules" that the diff touches (no real personal data, the 911 line, the token rules, no clinical decisions, accessibility).
3. CLAUDE.md folder rules: right folder, one job per file, no file over 300 lines, no copy of something that already exists.
4. Anything the diff changes that the brief did not ask for.

Report a list. For each failure give: the brief item or rule, file:line, what fails, and the evidence (a quote or command output).
If nothing fails, write "Nothing fails" and list what you checked.
Do not guess. If you cannot check something, say so.

````

### .claude/skills/reflect/SKILL.md

````markdown
---
name: reflect
description: End-of-session review. Lists what went wrong or took too long in this session, proposes the smallest edit to a skill or CLAUDE.md that would have prevented each one, and waits for the owner's OK. Use at the end of every session or when the owner types /reflect.
---

# Reflect

1. Find the evidence in this session: failed commands, checks that failed, a worker's output that was sent back, steps that were repeated, the owner's corrections, and questions that a rule already answered.
2. List at most 5 items, the most costly first. For each item:
   - What happened, in one sentence.
   - The evidence: a quote, a command and its exit code, or a count.
   - The smallest edit that would have prevented it: the file, the exact text now, and the exact new text.
3. Do not propose an edit without evidence. Do not reword a rule only to make it nicer.
4. Wait for the owner's OK on each item. Apply only the approved items, one commit each.
5. Then do the end-of-session steps in CLAUDE.md: update docs/progress.md, docs/decisions.md and docs/known-issues.md.

````

### docs/decisions.md

````markdown
# Decisions

One line each: date, decision, who decided, where it is written.

- 2026-11-13: A broken app goes back to the last good save point before the two-fixes escalation. Owner. CLAUDE.md, line "If the app is broken".
- 2026-11-13: Gemini only for handoffs; the old model plan is archived. Owner. handoffs/archive/2026-11-13-old-model-plan.md.
- 2026-11-13: A project's model list wins over the global list. Owner. ~/.claude/CLAUDE.md.
- 2026-11-13: Keys go in a file or a settings page in this project; the PowerShell line is for typed commands. Owner. CLAUDE.md, line "Where a key goes".
- 2026-11-13: npm run dev adds the Norton fix itself. Owner. Memory note local-dev-server-norton.md.
- 2026-11-13: Skill openers: global "No openers" wins. Owner (left as is).
- 2026-11-13: 20 MCP servers are off for this project path. Owner. ~/.claude.json.
- 2026-11-13: Save point first, then the Gemini review. Owner. ai_model_workflow_virtual_er.md, line "Order: CLAUDE.md wins".
- 2026-11-13: Key-rule copies left as they are. Owner.
- 2026-11-13: Next.js: local docs first; context7 for Tailwind and Supabase. Owner. SPEC.md, "Tools for the agent".
- 2026-11-13: Staff button is "Recall all off-site patients". Owner (2026-11-12). SPEC.md, under "Call everyone back".
- 2026-11-13: AGENTS.md points to CLAUDE.md instead of copying it. Owner. AGENTS.md.
- 2026-11-13: 15 unused plugins are off for this project. Owner. .claude/settings.json.
- 2026-11-13: Orchestrator and Haiku workers; progress log moved to docs/progress.md. Owner. CLAUDE.md, "Orchestrator and workers".

````

### docs/known-issues.md

````markdown
# Known issues and gotchas

- Norton re-signs HTTPS. Node in the owner's own terminal fails server-side Supabase calls without --use-system-ca; `npm run dev` adds it (scripts/dev.mjs). Claude's Bash shell already trusts the certificate, which hides the problem.
- Python here: `python -I` ignores PYTHONIOENCODING. Use `python -I -X utf8` for Urdu, Arabic, Chinese or symbols. Long heredoc scripts get mangled; write the script to a file first.
- Claude Code keeps per-project settings (switched-off MCP servers) under the folder path in ~/.claude.json. Moving the project folder loses them.
- The Supabase MCP is read-only and often fails to connect. The owner runs database changes in the SQL Editor.
- Playwright cannot sign in as staff; the owner does the staff half of browser tests.
- The Vercel MCP cannot change firewall settings or list cron jobs; the owner does these in the dashboard.
- Open: Vercel firewall rate-limit rule for GET /api/site-status (owner).

````
