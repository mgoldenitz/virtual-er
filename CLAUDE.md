# Virtual Waiting Room: rules for Claude Code

Read SPEC.md before any work. Its hard rules always apply and win over anything else. Notes from earlier research are in notes/. I am new to coding: explain each new file in one plain sentence, and never ask me to paste keys, tokens or passwords into chat; tell me which file or settings page they go in.

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

I do not have GPT-6.1 Sol, Gemini 4 Argon or GPT-6.1 Terra. Gemini 3.1 Pro, High, does their work; when I have no Gemini 3.1 Pro credits, Gemini 3.6 Flash, High, does it instead. Kimi K3.1 Pro always runs at Thinking Max; when Kimi is not working, give its step to Gemini 3.1 Pro, High, and say so in the note.

- After each small change works and passes its tests: Gemini 3.1 Pro, High, reviews the result.
- When you are stuck (two fixes have failed) or a task is important or unclear: the escalation loop. Gemini 3.1 Pro, High, analyzes the problem; Kimi K3.1 Pro, Thinking Max, gives a second opinion (skip this step if Kimi is not working); Grok 4.7, Low or Medium, challenges the assumptions; then I decide.
- Phase 1, after the Playwright phone and laptop tests: Gemini 3.1 Pro, High, reviews the flow for confusing labels and missing states, then Grok 4.7, Low, suggests simpler screens.
- Phase 2, after the realtime and deployment tests: Gemini 3.1 Pro, High, reviews security and architecture, then GPT-6 Astra, High, does the security review for the phase.
- Phase 3: Gemini 3.1 Pro, High (or 3.6 Flash, High), writes the patient-facing wording and survey question; DeepSeek V4.1-Flash, Low, drafts the translations; a fluent human reviewer approves them, safety messages first (remind me to find one); Kimi K3.1 Pro, Thinking Max, reviews equity and accessibility; Gemini 3.1 Pro, High, reviews workflow and screen consistency.
- Phase 4: before you build the dashboard, Kimi K3.1 Pro, Thinking Max, checks the metric definitions. After it is built, DeepSeek V4.1-Flash, Low, writes 15 to 20 synthetic visits with the dashboard numbers they should produce. After the Playwright checks, Gemini 3.1 Pro, High, checks that each number has a clear definition.
- Phase 5, after the full end-to-end tests: Gemini 3.1 Pro, High, does an independent code review; GPT-6 Astra, High, does the final security, privacy, accessibility and code-quality review; Gemini 3.1 Pro, High (or 3.6 Flash, High), writes the README and presentation; then 3 to 5 real testers try it.
- Before the save point at the end of every phase, list any handoff from this section that I have not done yet.
