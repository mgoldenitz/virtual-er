# Gemini review: Phase 5 database and the rest of lib/

Model: Gemini Hydrogen 4, High, in a new chat. Date: 2026-11-21.

## Context

The Phase 5 independent code review (handoffs/archive/2026-11-21-gemini-review-phase5-code.md) could not answer Question 3, because the upload stopped inside `lib/text/en.ts`. This review covers the files it did not see: the rest of `lib/`, all of `supabase/migrations/`, `supabase/checks/`, `proxy.ts`, `scripts/` and the config files. `SPEC.md` and the `data/` files (the app's database calls) are in the bundle again so the calls can be matched to the database.

Synthetic data only. The bundle leaves out `.mcp.json` and every `.env` file except `.env.example`. No keys, tokens, passwords or project IDs.

## Questions

Find problems; do not confirm that things work. For each fault give the file and line, the steps or data that show it, and the wrong result.

1. The database: run the migrations in name order in your head. Is any function, policy, trigger or column dropped, changed or used before it exists? Does each RPC and table call in `data/` match a function or policy in the migrations (name, arguments, return shape)?
2. SPEC.md hard rules 4 and 5: can the browser key read or change anything the rules forbid? Is the 24-hour cleanup complete?
3. Bugs in `lib/visit.ts`, `lib/visitActions.ts`, `lib/waitText.ts`, `lib/torontoDay.ts`, `lib/visitCount.ts`, `lib/textSize.ts` and `lib/text/`.
4. `proxy.ts`, `next.config.ts`, `vercel.json`: security headers, routes left open, wrong settings.
5. Dead code and stale comments in these files.

## Checked (in this session or in docs/progress.md)

- The first review's findings were checked against the code at commit 20cdcf3 (see "Claude's check" in handoffs/archive/2026-11-21-gemini-review-phase5-code.md).
- The bundle was scanned for key-like text (JWT start `eyJ`, `sk_`, `service_role_key`, `supabase.co`, `password =`): no match.

## Not checked

- `npm test`, `npm run lint` and `npm run build` were not run for this handoff (no code changed since commit 20cdcf3).
- Whether the live database matches the migration files.

## Bundle

handoffs/2026-11-21-gemini-review-phase5-database-bundle.txt (69 files, 5383 lines, about 272 KB). Do not commit the bundle.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-21. Pasted by the owner, unchanged in content (list marks tidied).

### 1. Migrations, trigger order, and `data/` calls

1.1 Before-update version check runs before timestamp normalization (`20261120010000_survey_keeps_version.sql`, lines 32-46). Steps: `UPDATE public.visits SET created_at = '2000-01-01T00:00:00Z' WHERE id = ...` (or update a `*_at` column to a different timestamp inside a transaction where `old.*_at` already equals `now()`), every other column unchanged. Wrong result: line 32 compares `(to_jsonb(new) - 'survey_score' - 'version') = (to_jsonb(old) - 'survey_score' - 'version')` before line 37 resets `new.created_at := old.created_at` and lines 38-46 overwrite changed `*_at` columns with `now()`. `new.version` goes up by 1 though the stored row did not change, so a staff screen with the old `version` gets "refused".

1.2 `get_patient_visit` mixes `is_demo = true` and `is_demo = false` visits in place and wait gap (`20261120000000_survey.sql`, lines 66-87; also `20261110061049`, `20261111050000`, `20261116000000`). Steps: demo mode with 9 demo waiting visits and recent demo `called_at` at Site A; a real patient checks in at Site A before `clear_demo_data()`. Wrong result: neither `place_in_line` (68-71) nor `average_gap_minutes` (80-83) filters `other.is_demo = me.is_demo`. The real patient sees place 10 instead of 1, and a wait range from demo recalls.

1.3 `start_home_visit` fails open if a `site_settings` row is missing, and counts demo home visits in the real site cap (`20261110061049_patient_functions.sql`, lines 123-129). Steps: no `site_settings` row (unlike `visits_check_step` in `20261117010000_step_check_fixes.sql` line 55, which treats missing as paused), or `simulate_demo_tick()` inserts a `source = 'home', is_demo = true` row just before 9 real home starts in the same minute. Wrong result: `exists (... where site = p_site and offsite_paused)` is false with no row, so home starts are allowed; `count(*)` on line 127 counts demo home visits toward the 10-per-minute cap.

1.4 `visits_check_step` lets `NULL` status bypass `VWR01` and allows `waiting -> declined` after an undone arrival (`20261119010000_declined_switch_checks.sql`, lines 24, 34, 53-57). Steps: (a) send `status: null`; (b) switch a `declined` visit to `waiting`, mark it `arrived`, undo the arrival (`arrived -> waiting`), then `undoSwitch` (`waiting -> declined`). Wrong result: (a) the `not in` checks give NULL, so Postgres raises `23502` instead of `VWR01`, which `changeVisit` maps to "not_saved" not "refused"; (b) `called_at` is null and `offered_at > triaged_at` still holds, so `waiting -> declined` succeeds though the visit had arrived.

1.5 `demo_new_token` uses `extensions.gen_random_bytes` with no `pgcrypto` in the migrations (`20261118000000_demo_settings.sql`, line 40). On a clean database without `pgcrypto` in `extensions`, `demo_new_token()` and `simulate_demo_tick()` fail.

1.6 `issueNewVisitLink` does not retry on a token collision (`data/staffActions.ts`, lines 138-142). Unlike `createDeskVisit` (line 79) and `startHomeVisit` (`data/startHomeVisit.ts`, line 17), a `23505` maps to "not_saved" instead of a retry with a fresh token.

1.7 `data/dashboardRead.ts` (line 56) and `data/visitCache.ts` (line 49) read with an unsynced or local clock. On `/dashboard`, `serverNow()` returns `Date.now()` before the first sync, so `daily_stats` is read for the wrong Toronto day until the next 15-second poll. On `/staff`, `loadVisits()` uses `Date.now() - LIST_HOURS * 3_600_000`, so a fast laptop clock hides visits from 23-24 hours ago.

1.8 `submitSurvey` returns "not_saved" instead of "refused" for a non-integer score (`data/patientVisit.ts`, lines 159-168). `submitSurvey(token, 7.5)`: PostgREST rejects it with `22P02` rather than returning false.

### 2. SPEC.md hard rules 4 and 5

2.1 A declined-to-off-site switch across midnight breaks rule 4's daily totals (`20261116110000_lock_key_and_cron_log_fix.sql`, lines 31-36). `delete_old_visits()` counts `triaged_ctas_4_5` on `triaged_at` (Day 1) and `offered` on `offered_at` (Day 2), so Day 2's share can go over 100% (or divide by 0).

2.2 Reassessed visits marked `not_eligible` still count as `offered` in `delete_old_visits()` (same file, lines 33-36, with `lib/visitActions.ts` lines 53-64). A visit offered, then `unable_to_reach`, reopened, re-triaged `not_eligible` keeps `offered_at`, so it adds to `not_eligible`, `offered` and (by subtraction) `accepted`.

2.3 Visits can stay up to 24 hours 15 minutes, and missing event times are dropped from `daily_stats` (`20261116100000_daily_stats_and_cleanup.sql` line 138; `20261116110000` lines 31-76). A visit made just after a `*/15` cron tick stays about 24h 15m. A row with status `arrived`, `removed` or `unable_to_reach` and a NULL `arrived_at` or `closed_at` (not enforced by a constraint) is deleted without adding to its counter (no `coalesce(..., created_at)`). `is_demo = true` rows in `daily_stats` stay until `clear_demo_data()`.

2.4 Browser key / rule 5: nothing lets `anon` (or non-staff `authenticated`) read or change tables directly, call `start_home_visit`, or get past the 5 patient actions, except the demo/real mixing in 1.2.

### 3. Bugs in `lib/`

3.1 `applyTriage` (`lib/visitActions.ts`, 53-64) keeps old `offered_at` and `last_still_here_at` after reassessment. A reopened visit re-triaged `not_eligible` keeps `offered_at` (counts as offered); re-triaged to `waiting` keeps the old `last_still_here_at`.

3.2 `formatWaitRange` (`lib/waitText.ts`, line 40) does not normalize `low` when `high < 60`: `formatWaitRange(-5, 20, "en")` gives "-5 to 20 minutes", `(15.7, 30)` gives "15.7 to 30 minutes"; `(10, NaN)` gives "0 minutes to 0 minutes".

3.3 Unguarded prototype lookups (`lib/waitText.ts` line 39, `lib/text/index.ts` lines 17 and 21): `textFor("constructor")`, `formatWaitRange(10, 20, "toString")`, `fill("{toString}", {})` find `Object.prototype` members instead of falling back to `en`; `textFor("constructor").patient` is undefined and callers throw.

3.4 `lib/textSize.ts` line 35: `startsWith("/patient")` also matches `/patients`, so the patient's 150% size applies there.

3.5 `lib/textSize.ts` line 42: the parameterless `catch {` in the inline head script is a syntax error in browsers before 2019 (iOS Safari < 12.1), so the saved text size is not applied.

3.6 `lib/torontoDay.ts` line 13: `torontoDay("")` or `torontoDay("not-a-date")` throws `RangeError: Invalid time value`.

No bugs found in `lib/visit.ts`, `lib/visitCount.ts`, `lib/text/languages.ts` or the `lib/text/en.ts` strings.

### 4. `proxy.ts`, `next.config.ts`, `vercel.json`

4.1 `proxy.ts` line 27: no error handling around `supabase.auth.getClaims()`, so an Auth or network failure gives HTTP 500 on `/login`, `/staff` and `/dashboard`.

4.2 `proxy.ts` lines 34-44: `/login` is in `matcher` with no guard against a redirect to itself; if `staffAccess("/login", claims)` ever returns something other than "allow" (for example "not_staff"), `/login` redirects to `/login?next=/login&reason=not_staff` in a loop.

4.3 `proxy.ts` lines 24, 36, 40: the redirect drops the query string (`next` is only `pathname`) and copies cookies but not other headers set by `setAll`.

4.4 `next.config.ts` lines 7-19: CSP has only `frame-ancestors 'none'`; no `Strict-Transport-Security` or `Permissions-Policy`; no `Cache-Control: private, no-store` for `/staff`, `/dashboard`, `/login` or `/patient` while `cacheComponents` and `partialPrefetching` are on.

No issues in `vercel.json`; `/api/keep-alive` and `/api/recall-alert` are outside the proxy matcher, so their access control is in their route handlers (not in the bundle).

### 5. Dead code and stale comments

5.1 `pauseStateNow` (`data/sitePauses.ts`, 48-50) has no callers.
5.2 `lib/text/en.ts` line 145: "Phase 3 features still being built" is stale.
5.3 `lib/text/en.ts` lines 6-7: the draft note on `enDuration` while `en` is `approved: true` (`lib/text/languages.ts` line 16).
5.4 `data/patientVisit.ts` line 2: "the two patient steps" is stale.
5.5 `20261110060756_tables_and_security.sql` line 61: "visits are deleted only by the 24-hour clean-up" is stale since `clear_demo_data()`.
5.6 `20261118000000_demo_settings.sql` line 25: says 128 bits; 26 x 5 = 130 (fixed in `20261118000200` lines 16-18).
5.7 `20261118000100_demo_simulator.sql` line 98: "see the TODO below", but there is no TODO.
5.8 `supabase/checks/permissions.sql` line 55: "no migration here gives column rights" is wrong; `20261112010000_site_pause_read.sql` line 11 grants column select to `service_role`.
5.9 `supabase/checks/daily_stats.sql` line 1: names only `20261116100000`, not `20261116110000`, which replaced `delete_old_visits()`.

## Claude's check

Checked against the latest version of each function (the last migration that defines it) on branch `phase5-e2e`, 2026-11-21.

Valid, to fix:
- 3.1 and 2.2: valid and important. `applyTriage` (`lib/visitActions.ts:61-77`) keeps the old `offered_at` on the `not_eligible` path, and `delete_old_visits()` and `lib/dashboardNumbers.ts:109` both count any `offered_at`. It also keeps `last_still_here_at`, which is the side case of fault 1 in the code review. Fix: add `offered_at: null` and `last_still_here_at: null` to `fresh`. Plan mode: the database trigger rules for these columns must allow the change.
- 2.1: the same fault as code review fault 2, in the database count. The owner's choice (count on the triage day) must also change `delete_old_visits()` in a new migration.
- 1.7: the dashboard part is code review fault 8. The `visitCache.ts` part is valid but small: the database deletes at 24 hours anyway.
- 5.2, 5.4, 5.5, 5.7, 5.8, 5.9: valid (seen in the files). 5.1 is code review fault 9. 5.6 is valid; the comment is in an old migration, which does not change, so it stays.

Valid, needs an owner decision:
- 1.2: true, `get_patient_visit` (`20261120000000_survey.sql:70-90`) does not filter on `is_demo`. But the staff line (`lib/queue.ts`) does not either, so the staff list and the phone agree. The decision of 2026-11-18 says "Clear demo data before real testers start".
- 4.4: true that the CSP has only `frame-ancestors`. A full CSP with Next.js needs nonces and is a large change. Vercel adds HSTS on its own domains.
- 5.3: only the owner knows if the hour words are approved now.

Valid but low (no change proposed):
- 1.3: the `site_settings` rows for A and B are made in a migration, and staff cannot delete them. The demo count in the cap is small.
- 1.5: Supabase has `pgcrypto` in `extensions`; it matters only on a plain Postgres.
- 1.6: a collision of two 128-bit tokens is not a real risk.
- 4.1: `getClaims()` gives an error value in normal failures; only a throw gives a 500.
- 4.3: true; a lost `?tab=` after sign-in is small.
- 3.2, 3.6: the inputs come from the database as whole numbers and real times.

Not valid:
- 1.1: the app never sends `created_at`, and a different value inside the same transaction cannot come from the app.
- 1.4 (a): `status` is `not null` and the app never sends null. (b): after an undone arrival the visit is again a switched visit that is not recalled, so undo of the switch is correct.
- 1.8: the survey is a radio group 0 to 10; the app cannot send 7.5.
- 3.3: the table has `check (language ~ '^[a-z]{2,3}$')` (`20261110060756_tables_and_security.sql:35`), so "constructor" cannot be a language.
- 3.4: there is no `/patients` route.
- 3.5: Next.js 16 does not support browsers from before 2019.
- 4.2: `/login` is not a staff path (`lib/staffAccess.ts:24`), so it always gives "allow" and cannot loop.
- 2.3: the 15-minute cron gap is small. Not checked: whether the database stops a closed status without its time (`arrived_at`, `closed_at`); the app always sets them in `lib/visitActions.ts`.
