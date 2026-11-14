# Gemini review: context trim and rule conflicts (2026-11-13)

Model: Gemini 3.1 Pro, High, in a new chat. If there are no 3.1 Pro credits: Gemini 3.6 Flash, High.

## What to give Gemini

This whole file. It holds no keys, tokens, passwords or patient data.

## Question

Find problems. Do not confirm. The change is on branch `context-trim` (9 commits). It cuts what Claude Code loads at the start of each session and settles 12 rule conflicts. The owner chose each answer. Check:

1. Does any pointer line below change what a rule means, or make two rules disagree in a new way?
2. Can any change make Claude Code skip a safety rule from SPEC.md, the handoff reminders, or the save-point rules?
3. Is anything lost that a new session needs? Text moved word for word (a script checked that 0 lines were lost): finished Phase 1 and 2 notes from PROGRESS.md to PROGRESS-archive.md; the old model plan (Kimi, Grok, GPT-6 Astra, GPT-6.1 Terra, DeepSeek, and the stage-by-stage steps) from ai_model_workflow_virtual_er.md to handoffs/archive/2026-11-13-old-model-plan.md. The Phase 3 to 5 Gemini steps stay in CLAUDE.md lines 38 to 40.
4. The project settings switch off 15 plugins. Is any of them one the SPEC or CLAUDE.md needs (Playwright, Supabase, Vercel, context7, /security-review and /code-review must stay)?

Answer as a numbered list: file, line, problem, suggested fix. Write "Nothing found" for a point with no problem.

## Changes outside git (described only)

- ~/.claude/CLAUDE.md (global): one added line, "When a project's CLAUDE.md names the models I use, that list wins over the names above."
- Claude memory index: the Norton line now reads "how npm run dev handles Norton (read the note before starting the dev server another way)". The `npm run dev` script already adds the certificate setting.
- Claude Code's per-project settings: the list of 20 switched-off MCP servers moves from the old project path to the new one (lost when the project moved on 2026-11-10).

## Results so far (measured by Claude)

- Start-up load (`claude -p "/context"`): 24.2k tokens before, 22.8k after. The skills listed went from 261 to 175, and the skills shown with a name only from 182 to 74. MCP server instructions went from 2.1k to 888.
- 148 tests, type check and lint pass.
- 6 of 6 past requests, asked again in fresh read-only sessions, picked the same skill. 11 of 11 rule questions in fresh sessions gave the owner's answer.

## Diff of the small files

```diff
diff --git a/.claude/settings.json b/.claude/settings.json
new file mode 100644
index 0000000..d394d35
--- /dev/null
+++ b/.claude/settings.json
@@ -0,0 +1,19 @@
+{
+  "enabledPlugins": {
+    "huggingface-skills@claude-plugins-official": false,
+    "hf-cli@huggingface-skills": false,
+    "manim-skill@manim-skill": false,
+    "imagegen-skills@imagegen-skills": false,
+    "yylo-skills@yylo-skills": false,
+    "autoresearch@autoresearch": false,
+    "academy-guide@anthropic-agent-skills": false,
+    "planning-with-files@planning-with-files": false,
+    "code-craftsmanship@wondelai-skills": false,
+    "mattpocock-skills@claude-plugins-official": false,
+    "example-skills@anthropic-agent-skills": false,
+    "document-skills@anthropic-agent-skills": false,
+    "humanizer@humanizer": false,
+    "feature-dev@claude-plugins-official": false,
+    "code-simplifier@anthropic-plugin-directory": false
+  }
+}
diff --git a/AGENTS.md b/AGENTS.md
index 1231110..b3c0d2c 100644
--- a/AGENTS.md
+++ b/AGENTS.md
@@ -8,17 +8,6 @@ This block is written and re-added by `next dev` — verify at `node_modules/nex
 
 <!-- END:nextjs-agent-rules -->
 
-## Rules for this project (same as CLAUDE.md)
+## Rules for this project
 
-Read SPEC.md and CLAUDE.md before any work. SPEC.md's hard rules win over anything else. The owner is new to coding: explain each new file in one plain sentence, and never ask for keys, tokens or passwords in chat.
-
-Keep the app organized so a beginner can read it:
-
-- Screens go in app/ (Next.js App Router: each screen is a folder with a page.tsx). Never create a pages/ folder.
-- Shared pieces (buttons, the footer, the 911 line, layout parts) go in components/.
-- Saving and loading go in data/: Supabase calls, browser storage, and demo data.
-- Rules that decide things go in lib/, as small functions with tests.
-- One job per file.
-- No file over 300 lines. Split it before it gets there.
-- Before writing anything new, check whether it already exists and reuse it.
-- Clean up one folder at a time, without changing what the app does. Check the app still works after each folder, then make a save point (a Git commit with a short plain-English message).
+Rules for this project: read CLAUDE.md (it tells you to read SPEC.md first).
diff --git a/CLAUDE.md b/CLAUDE.md
index 2b5aa74..6fab746 100644
--- a/CLAUDE.md
+++ b/CLAUDE.md
@@ -2,6 +2,8 @@
 
 Read SPEC.md before any work. Its hard rules always apply and win over anything else. Notes from earlier research are in notes/. I am new to coding: explain each new file in one plain sentence, and never ask me to paste keys, tokens or passwords into chat; tell me which file or settings page they go in.
 
+Where a key goes: the line above wins in this project (a file or a settings page is fine); my global "plain PowerShell window" line is for keys I type into commands.
+
 ## Save points
 
 - Make a Git save point (a commit with a short plain-English message) before starting a change and again once it works.
@@ -30,6 +32,7 @@ From 2026-11-10 every handoff goes to a Gemini model; I do not use Kimi, Grok, D
 
 - After each small change works and passes its tests: Gemini 3.1 Pro, High, reviews the result.
 - When you are stuck (two fixes have failed) or a task is important or unclear: the escalation loop. Gemini 3.1 Pro, High, analyzes the problem; then, in a new chat, Gemini 3.1 Pro, Medium, challenges the assumptions and suggests simpler options; then I decide.
+  If the app is broken, the save-point rule above ("go back to the last save point that worked") comes first.
 - Phase 1, after the Playwright phone and laptop tests: Gemini 3.1 Pro, High, reviews the flow for confusing labels and missing states, then suggests simpler screens.
 - Phase 2, after the realtime and deployment tests: Gemini 3.1 Pro, High, reviews security and architecture.
 - Phase 3: Gemini 3.1 Pro, High, writes the patient-facing wording and survey question, then drafts the translations; a fluent human reviewer approves them, safety messages first (remind me to find one); in new chats, Gemini 3.1 Pro, High, reviews equity and accessibility, then workflow and screen consistency.
diff --git a/SPEC.md b/SPEC.md
index 60d7828..98b6905 100644
--- a/SPEC.md
+++ b/SPEC.md
@@ -22,6 +22,7 @@ App name: TBD (I will choose it). Use "Virtual Waiting Room" as a placeholder.
 ## Tools for the agent
 
 - Use context7 for current Next.js, Tailwind and Supabase documentation before writing code that depends on a library version.
+  - Next.js: read the local docs in node_modules/next/dist/docs/ first (AGENTS.md), because they match the installed version; use context7 for Tailwind and Supabase (owner, 2026-11-13).
 - Supabase MCP: use it to create tables, row-level security policies and to read logs, but show me the SQL and wait for my approval before running anything that changes or deletes data. It must be scoped to this project (project_ref). After Phase 2 it runs read_only.
 - Vercel MCP: use it to read build logs and check deployments. Ask before changing any project setting.
 - Playwright MCP: after each phase, open the app at phone size (390 x 844) and at laptop size, run the test checklist, and show me screenshots of anything that fails.
@@ -86,6 +87,7 @@ App name: TBD (I will choose it). Use "Virtual Waiting Room" as a placeholder.
 - The app never contacts anyone other than the patient. No emergency contacts are stored.
 - Mark arrived, mark removed (left, no-show). Actions that end virtual waiting (arrived, removed, unable_to_reach confirmed, declined, not_eligible) set closed_at in the same update. Closed means virtual waiting ended, not that care is finished.
 - "Call everyone back" button for a surge or a system problem, with a confirmation step.
+  - (owner, 2026-11-12: the button is "Recall all off-site patients"; see components/staff/RecallAllPanel.tsx.)
 
 ### /dashboard (staff login required)
 
```

## Lines added to ai_model_workflow_virtual_er.md

The earlier model plan, and the stage-by-stage steps that came from it, moved word for word to `handoffs/archive/2026-11-13-old-model-plan.md` on 2026-11-13. Which model does each step today: CLAUDE.md, section "Remind me when another model or agent is due".
Order: CLAUDE.md wins. The save point comes once the change works ("Save points"), and the Gemini review comes after it ("After each small change works and passes its tests").

