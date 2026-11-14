# Known issues and gotchas

- Norton re-signs HTTPS. Node in the owner's own terminal fails server-side Supabase calls without --use-system-ca; `npm run dev` adds it (scripts/dev.mjs). Claude's Bash shell already trusts the certificate, which hides the problem.
- Python here: `python -I` ignores PYTHONIOENCODING. Use `python -I -X utf8` for Urdu, Arabic, Chinese or symbols. Long heredoc scripts get mangled; write the script to a file first.
- Claude Code keeps per-project settings (switched-off MCP servers) under the folder path in ~/.claude.json. Moving the project folder loses them.
- The Supabase MCP is read-only and often fails to connect. The owner runs database changes in the SQL Editor.
- Playwright cannot sign in as staff; the owner does the staff half of browser tests.
- The Vercel MCP cannot change firewall settings or list cron jobs; the owner does these in the dashboard.
- Open: Vercel firewall rate-limit rule for GET /api/site-status (owner).
