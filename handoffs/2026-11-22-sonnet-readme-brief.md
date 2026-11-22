# Brief for the readme-writer worker (Sonnet)

Owner decision 2026-11-22 (docs/decisions.md): Sonnet writes the README, Opus writes the presentation, Gemini Hydrogen 4, High, reviews each. Start the `readme-writer` agent (.claude/agents/readme-writer.md) with the brief below. After it reports, Claude runs the "Done when:" check and checks each command and fact against the code.

## Brief

Goal: write a new README.md at the repo root (C:\Users\mgold\projects\virtual-er). There is no README now.

Readers: a course instructor, classmates and outside guests who want to understand and run this concept prototype. Many are new to coding.

Read first: SPEC.md, CLAUDE.md, package.json, .env.example, docs/decisions.md (skim), docs/known-issues.md (skim), docs/progress.md (the "State on 2026-11-22" part only), supabase/migrations/ (file names only), scripts/dev.mjs, playwright.config.ts, .github/workflows/checks.yml, the folder tree (app/, components/, data/, lib/, lib/text/, e2e/).

Sections, in this order:
1. Title and one paragraph: what the Virtual Waiting Room is (low-acuity CTAS 4 or 5 patients wait off-site after triage, follow their place in line on a phone, come back when staff recall them). Say clearly: concept prototype, synthetic data only, no hospital systems, not for real patients.
2. What it does: the patient screens, the staff screens, the dashboard, the 5 languages (en, fr, ur, ar, zh), accessibility features. Only features you can see in the code or SPEC.
3. Safety rules: the hard rules from SPEC.md in short plain words (for example the 911 line on every patient screen). Quote, do not invent.
4. Tech stack: from package.json (Next.js App Router, Supabase, Tailwind, Vitest, Playwright, Vercel). Versions only if package.json gives them.
5. Run it on your computer: prerequisites, `npm install`, copy .env.example to .env.local and which settings page each value comes from (names only, never values), run the migrations in supabase/migrations/ in the Supabase SQL Editor in number order, `npm run dev`. Say that scripts/dev.mjs starts the dev server (read it to say what it does).
6. Checks: `npm test`, `npm run lint`, `npm run build`, `npm run e2e`, `npm run e2e:cleanup` (read scripts/e2e-cleanup.mjs to say what it does), and that GitHub runs checks on each push.
7. Folder map: one line per top-level folder, from CLAUDE.md and the tree.
8. Status and limits: Phase 5, translations wait for a fluent human reviewer, the wait range is simulated. Take these from docs/progress.md.
9. Credits: built with AI help (Claude Code, Gemini reviews), from docs. No personal names, emails or school names.

Do not include: any URL of the live site or Supabase project, any project ID, keys, emails, personal names.

Done when: run this exact command and paste its output:

```
cd /c/Users/mgold/projects/virtual-er && wc -l README.md && grep -c "911" README.md && grep -oE "npm run [a-z:]+" README.md | sort -u && grep -nE "eyJ|sk-|supabase\.co|vercel\.app|@" README.md; echo "secret-grep exit $?"
```

PASS means: README.md is 80 to 250 lines, "911" appears at least once, every `npm run X` printed is a script in package.json, and the last grep prints nothing (exit 1).
