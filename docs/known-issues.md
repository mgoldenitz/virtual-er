# Known issues and gotchas

- Norton re-signs HTTPS. Node in the owner's own terminal fails server-side Supabase calls without --use-system-ca; `npm run dev` adds it (scripts/dev.mjs). Claude's Bash shell already trusts the certificate, which hides the problem.
- Python here: `python -I` ignores PYTHONIOENCODING. Use `python -I -X utf8` for Urdu, Arabic, Chinese or symbols. Long heredoc scripts get mangled; write the script to a file first. Put code text that holds a backslash (a regex such as \bmin\b) in a raw string (r'''...'''), or Python changes \b into a backspace.
- Claude Code keeps per-project settings (switched-off MCP servers) under the folder path in ~/.claude.json. Moving the project folder loses them.
- The Supabase MCP is read-only and often fails to connect. The owner runs database changes in the SQL Editor.
- Playwright cannot sign in as staff; the owner does the staff half of browser tests.
- Playwright MCP: `target` takes a ref from the last snapshot (for example `e73`), a CSS selector or a locator, never the role text from the snapshot (`combobox "Select language"` fails). Load the tool schema with ToolSearch before the first call.
- The Vercel MCP cannot change firewall settings or list cron jobs; the owner does these in the dashboard.
- Hook scripts: text piped from PowerShell starts with an invisible byte-order mark, so JSON.parse fails and the script exits silently. Strip `\uFEFF` first. In Git Bash, Node does not read paths like /c/Users; test with C:/Users paths.
- navigator.onLine says "online" on Wi-Fi with no internet or behind a hotel or hospital sign-in page (captive portal), so the offline banner does not show there. Accepted for the demo (Gemini review 2026-11-14): the app does not test a real connection. It asks again when the page comes back on screen (`data/useOnline.ts`).
- Open: Vercel firewall rate-limit rule for GET /api/site-status (owner).
- Not done: when another staff screen pauses or resumes a site, the pause banner appears but is not announced to screen readers on this screen (Gemini pause review, point 4b, 2026-11-14).
- TaskStop does not always end a Next dev server that Claude started; the node process can stay on port 3000. Check with `netstat -ano | findstr :3000` and ask the owner before stopping it.
- Some files have CRLF line ends, and multi-line Edit calls can miss on them. Use a small Python edit script in the job's tmp folder that keeps the line ends.
- `formatMinutes` has no day unit: 25 hours shows "25h". Accepted, because no demo visit stays open for a day (Gemini review c2, 2026-11-15).
- happy-dom's `click()` does not move focus to the button. Click tests call `target.focus()` first, as a mouse click or the Enter key does, or focus checks pass or fail for the wrong reason. To test a phone tap (focus stays on the page body), click without `focus()`.
- React puts two state updates from one event into one commit. When the state ends with no change, a `[state]` effect does not run, so a value kept in a ref for that effect can stay and decide a later change. Clear such a ref in the part that sets the next state (as `turnOn` and `turnOff` clear `backgroundFocus`).
- A test that passes before a fix is not proof. Check each new test with a small temporary code change that must make it fail, then put the code back from a copy in the job's tmp folder (not `git checkout`).
