# Virtual Waiting Room: rules for Claude Code

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
