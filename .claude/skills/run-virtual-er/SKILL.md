---
name: run-virtual-er
description: Run, start, screenshot or drive the Virtual Waiting Room app (Next.js) in a headless browser. Use to see a change working in the real app: the start page, the patient screen, a started visit, or the staff list, on a phone or laptop size.
---

# Run the Virtual Waiting Room

All paths are from the project root. The app is a Next.js dev server; the driver is
`.claude/skills/run-virtual-er/driver.mjs`, a small Playwright script (the project already has
`@playwright/test` and its Chromium from `npm run e2e`). It opens a page, saves a screenshot in
`screenshots/run/`, and prints the text of `<main>`. These commands were run in Git Bash on Windows 11.

## Prerequisites

- `npm install` done, and `.env.local` filled in (Supabase keys). Never print or read `.env.local`.
- For the `staff` command: `.auth/staff.json`, which `npm run e2e` saves when it signs in the test staff account.

## Start the server (port 3200, so the owner's 3000 and the e2e 3100 stay free)

```bash
npm run dev -- -p 3200 > "$TEMP/claude-run-dev.log" 2>&1 &
for i in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code}" http://localhost:3200/ | grep -q 200 && break; sleep 2; done
curl -s -o /dev/null -w "home %{http_code}\n" http://localhost:3200/
```

`npm run dev` runs `scripts/dev.mjs`, which adds the Norton certificate fix. Wait for `home 200`.

## Drive it (agent path)

```bash
node .claude/skills/run-virtual-er/driver.mjs shot "" --phone      # start page, 390x844 phone
node .claude/skills/run-virtual-er/driver.mjs start-visit A --phone  # "Start a visit" at Demo Site A, then the patient screen
node .claude/skills/run-virtual-er/driver.mjs staff                # staff list with the saved test session
```

- `shot <path>`: any page. Give the path with no leading `/` (`shot login`, `shot patient`, `shot dashboard`).
- `start-visit A|B`: makes a real synthetic visit in Supabase and adds its code to `.e2e-codes.txt`.
- `--phone` adds `-phone` to the file name. Look at the PNG with the Read tool.
- `RUN_URL=http://localhost:3100` points the driver at another server.

## Stop the server

```bash
pid=$(netstat -ano | grep -E ':3200 .*LISTENING' | awk '{print $NF}' | head -1); taskkill //PID $pid //T //F
```

## Human path

`npm run dev` in PowerShell, then open http://localhost:3000. Ctrl+C stops it.

## Tests

`npm test`, `npm run lint`, `npm run build`, and `npm run e2e` (starts its own server on 3100). See CLAUDE.md for the exact lines to paste.

## Gotchas

- Git Bash turns an argument `/` into `C:/Program Files/Git/`. The driver refuses such a path with a message; drop the leading `/`.
- The staff list holds every visit the e2e runs left behind (180 off-site rows on 2026-11-21), so the staff page was 65885 px tall. The driver takes a full-page shot only when the page is 4000 px or less; else it takes the visible screen. `npm run e2e:cleanup` (after the owner runs its SQL) makes the list short again.
- The round "N" button at the bottom left of each shot is the Next.js dev tools badge, not part of the app.
- Each `start-visit` adds a row to the shared database. Run `npm run e2e:cleanup` later; it reads `.e2e-codes.txt`.
- Claude's Bash shell already trusts Norton's certificate, so a server started here works even if the Norton fix in `scripts/dev.mjs` broke. The owner's own terminal would show the fault (see the local-dev-server-norton memory).
- `staff` with an old `.auth/staff.json` lands on the sign-in page; the driver prints a note. Run `npm run e2e` once to save a new session.
