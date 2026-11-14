<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Rules for this project (same as CLAUDE.md)

Read SPEC.md and CLAUDE.md before any work. SPEC.md's hard rules win over anything else. The owner is new to coding: explain each new file in one plain sentence, and never ask for keys, tokens or passwords in chat.

Keep the app organized so a beginner can read it:

- Screens go in app/ (Next.js App Router: each screen is a folder with a page.tsx). Never create a pages/ folder.
- Shared pieces (buttons, the footer, the 911 line, layout parts) go in components/.
- Saving and loading go in data/: Supabase calls, browser storage, and demo data.
- Rules that decide things go in lib/, as small functions with tests.
- One job per file.
- No file over 300 lines. Split it before it gets there.
- Before writing anything new, check whether it already exists and reuse it.
- Clean up one folder at a time, without changing what the app does. Check the app still works after each folder, then make a save point (a Git commit with a short plain-English message).
