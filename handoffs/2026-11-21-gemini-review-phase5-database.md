# Gemini review: Phase 5 database and the rest of lib/

Model: Gemini Hydrogen 4, High, in a new chat. Date: 2026-11-21.

## Context

The Phase 5 independent code review (handoffs/2026-11-21-gemini-review-phase5-code.md) could not answer Question 3, because the upload stopped inside `lib/text/en.ts`. This review covers the files it did not see: the rest of `lib/`, all of `supabase/migrations/`, `supabase/checks/`, `proxy.ts`, `scripts/` and the config files. `SPEC.md` and the `data/` files (the app's database calls) are in the bundle again so the calls can be matched to the database.

Synthetic data only. The bundle leaves out `.mcp.json` and every `.env` file except `.env.example`. No keys, tokens, passwords or project IDs.

## Questions

Find problems; do not confirm that things work. For each fault give the file and line, the steps or data that show it, and the wrong result.

1. The database: run the migrations in name order in your head. Is any function, policy, trigger or column dropped, changed or used before it exists? Does each RPC and table call in `data/` match a function or policy in the migrations (name, arguments, return shape)?
2. SPEC.md hard rules 4 and 5: can the browser key read or change anything the rules forbid? Is the 24-hour cleanup complete?
3. Bugs in `lib/visit.ts`, `lib/visitActions.ts`, `lib/waitText.ts`, `lib/torontoDay.ts`, `lib/visitCount.ts`, `lib/textSize.ts` and `lib/text/`.
4. `proxy.ts`, `next.config.ts`, `vercel.json`: security headers, routes left open, wrong settings.
5. Dead code and stale comments in these files.

## Checked (in this session or in docs/progress.md)

- The first review's findings were checked against the code at commit 20cdcf3 (see "Claude's check" in handoffs/2026-11-21-gemini-review-phase5-code.md).
- The bundle was scanned for key-like text (JWT start `eyJ`, `sk_`, `service_role_key`, `supabase.co`, `password =`): no match.

## Not checked

- `npm test`, `npm run lint` and `npm run build` were not run for this handoff (no code changed since commit 20cdcf3).
- Whether the live database matches the migration files.

## Bundle

handoffs/2026-11-21-gemini-review-phase5-database-bundle.txt (69 files, 5383 lines, about 272 KB). Do not commit the bundle.
