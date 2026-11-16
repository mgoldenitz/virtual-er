# Decisions

One line each: date, decision, who decided, where it is written.

- 2026-11-14: Called-screen sound and vibration are on-page demo alerts after a "Turn on sound" tap: beep and vibrate only while called, sound on and page visible, every 30 seconds; the choice is not saved (a reload needs a new tap). Owner approved the plan. lib/calledAlert.ts, components/patient/SoundSwitch.tsx.
- 2026-11-14: Push notifications go in the demo as a later item with their own plan, SPEC change and Gemini review, not in item A. Owner. docs/progress.md, "Next".
- 2026-11-14: Gemini Hydrogen 4 replaces Gemini 3.1 Pro for every handoff. Owner. CLAUDE.md, "Remind me when another model or agent is due".
- 2026-11-14: Item A (offline banner, text size, sound and vibration) gets one combined Gemini review after all three parts, not one per part, so it can find problems between them. Owner. handoffs/archive/2026-11-14-gemini-review-patient-extras.md.
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
- 2026-11-14: "Issue a new link" replaces the visit's access token (no database change); only while waiting, called or on the way; no confirm step and no undo; the visit code stays the same. Owner. lib/visitActions.ts, components/staff/VisitRow.tsx.
- 2026-11-15: Staff brand colour is teal #0f5e66 (5.1:1 on the darkest backdrop corner); the page body uses `bg-canvas text-ink`. Gemini review b3, checked with the contrast script. app/globals.css, app/layout.tsx.
- 2026-11-15: Beep volume 0.5 (was 0.3). Owner. lib/calledAlert.ts.
- 2026-11-15: The patient wait range uses the long form in all 5 languages once the high end is 60 minutes or more ("45 minutes to 1 hour 20 minutes"); under 60 it stays "20 to 45 minutes". Owner. lib/waitText.ts, lib/text/*.ts.
- 2026-11-15: Arabic uses natural grammar for 1 and 2 hours, with no digit ("ساعة", "ساعتين"). Owner. lib/text/ar.ts.
- 2026-11-15: Staff times keep "1h 35min" on screen; screen readers get "1 hour 35 minutes" from hidden text. Owner. components/staff/Duration.tsx.
- 2026-11-15: happy-dom is a dev dependency for click tests only; those files start with `// @vitest-environment happy-dom`, all other tests stay in Node. Owner.
- 2026-11-15: The sound box has one `role="status"` box that is always on the page, for the failed and sound-off lines; "Sound is on" gets focus and stays out of it. Gemini review b2. components/patient/SoundSwitch.tsx.
- 2026-11-15: Rejected from the Gemini review: filling an unknown pause switch with `{ A: false, B: false }` (unknown stays unknown) and a day unit in `formatMinutes`. Point a4 (late `resume()` rejection) is not a bug: `Promise.race` handles it.
- 2026-11-15: Sound box focus moves to "Turn on sound" only when focus is in the box or on the page body (`focusNearBox`, written by the owner). A beep that fails in the background leaves focus on another button. A new try sets `off` first, so the failed line is read again. Gemini wait-range review 1.4. components/patient/SoundSwitch.tsx.
- 2026-11-15: One wait range line, `waitRangeLong`, for all lengths; under an hour the low end is a bare number and the high end has the minute word, so Arabic takes the plural form of the high number. `waitRange` is gone. Gemini wait-range review 3.1. lib/waitText.ts.
- 2026-11-15: Staff phone and review flags show "10 min" on screen and give screen readers "10 minutes"; the fixed step times stay in the spoken words, the counts that go up stay out. Gemini wait-range review 4.2. components/staff/FollowUpPanel.tsx.
- 2026-11-15: Straight quotes: one cleanup before closing Phase 3, English screen text only, one folder at a time; SPEC.md line 83 changes at the same time with the owner's OK; translations keep their own quote marks. Push the branch at the end of Phase 3. Owner.
