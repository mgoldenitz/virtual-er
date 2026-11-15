# Decisions

One line each: date, decision, who decided, where it is written.

- 2026-11-14: Called-screen sound and vibration are on-page demo alerts after a "Turn on sound" tap: beep and vibrate only while called, sound on and page visible, every 30 seconds; the choice is not saved (a reload needs a new tap). Owner approved the plan. lib/calledAlert.ts, components/patient/SoundSwitch.tsx.
- 2026-11-14: Push notifications go in the demo as a later item with their own plan, SPEC change and Gemini review, not in item A. Owner. docs/progress.md, "Next".
- 2026-11-14: Gemini Hydrogen 4 replaces Gemini 3.1 Pro for every handoff. Owner. CLAUDE.md, "Remind me when another model or agent is due".
- 2026-11-14: Item A (offline banner, text size, sound and vibration) gets one combined Gemini review after all three parts, not one per part, so it can find problems between them. Owner. handoffs/2026-11-14-gemini-review-patient-extras.md.
- 2026-11-14: Worker agents run at effort medium. Owner. .claude/agents/builder.md and reviewer.md.
- 2026-11-14: 13 more plugins off for this project only, in the git-ignored settings.local.json (/plugin changes all projects). Owner. .claude/settings.local.json.
- 2026-11-14: Permission rules, not hooks, for fixed rules: deny Read(.env.local), ask before git push. A PostToolUse hook warns when a code file is over 300 lines. Owner. .claude/settings.json, .claude/hooks/check-line-limit.mjs.
- 2026-11-14: Text size is set on <html> (100%, 125%, 150%) so every rem size grows; the patient screen resets it when it closes. Claude. lib/textSize.ts.
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
