# Plan: four analysis views on the staff dashboard (2026-11-20)

Branch `claude-features`, worktree `.claude/worktrees/claude-features`. Ideas chosen by the owner on 2026-11-20 (docs/progress.md, "Next" item 2). Not pushed. The merge into `phase5-e2e` still waits for the other session.

## Context

The dashboard (`/dashboard`) shows only today. Staff cannot see past days, the time patients wait off-site, where patients drop out, or take the numbers away. The 4 ideas:

1. Trend view: the 7 days before today, per site.
2. Off-site wait time: `offered_at` to `called_at`, as an average and 4 time bands.
4. Funnel view: the steps from home start to survey, for today.
6. CSV download of the day totals for staff.

Owner choices (2026-11-20): 7 days; 4 bands (under 30, 30 to 59, 60 to 119, 120 or more minutes); each funnel step counts on the date of its own event (same rule as every other dashboard number, SPEC hard rule 4); the CSV holds the day totals as the screen counts them (daily_stats plus the visits still in the table), not raw daily_stats.

## New metric definitions (go into SPEC lines 104-114)

Checked by Gemini Hydrogen 4, High, on 2026-11-20 (handoffs/archive/2026-11-20-gemini-review-analysis-definitions.md); the owner decisions are at the end of that file.

- Recalled: `called_at` and `offered_at` set, on the `called_at` date. A visit is called only once (no step from `called` back to `waiting` in `20261119010000_declined_switch_checks.sql`), so each visit counts once. All recalled visits count, also when they later became `needs_reassessment`, `no_show` or `unable_to_reach`.
- Average off-site wait: `called_at` minus `offered_at`, over the Recalled visits, on the `called_at` date. It starts at `offered_at`, not `triaged_at`, because a declined-to-waiting switch moves `offered_at` to the switch moment (`lib/switchToOffsite.ts:33`). Label: "Average minutes from offer to recall: 52 (7 visits)", in whole minutes; "-" with "no data yet" when the count is 0. Patients still waiting are not in it.
- Wait bands: the same visits, by whole minutes rounded the same way as the average: "Under 30 minutes", "30 to 59 minutes", "60 to 119 minutes", "120 minutes or more".
- Start date: the date the new migration runs is kept as one constant in lib/. A day before it shows "-" for the new numbers, with one note line: "Wait numbers start on <date>."
- Funnel (today): Started from home, Reached triage (from home), Triaged CTAS 4 or 5 (home and desk), Offered, Accepted, Recalled, Arrived after recall, Answered survey. Each step shows its count only, with no percent (owner, 2026-11-20). One line on screen: "Each row counts what happened today. Desk patients join at Triaged, and some patients come back before a recall, so a lower row can be larger."
- Past 7 days: the 7 Toronto dates before today, each counted by the same rule as "Today". A share shows its count, as on Today ("8 of 10 (80%)"); an average shows its count in brackets. The header is "Triaged CTAS 4 or 5". One note line: "Each number counts on the date of its own event."
- CSV: one row per past day and site, for the mode on screen (Real or Demo), the same numbers as the trend view, with the raw count columns next to each share and average. Empty cells, not "-", for a day before the start date. Today is left out, because it is not complete. With no past days, the button is replaced by "No past days to download yet." No codes, tokens or visit times.
- Known limit (owner, 2026-11-20): the 2 reads can count a visit twice for up to 15 seconds when the cleanup runs between them (docs/known-issues.md). Not fixed in this plan.

## Files and order of work

Each step: a `builder` brief with a "Done when:" check, my own run of that check, a `reviewer` read of the diff, then a save point.

0. Save point: commit this plan.
1. Model handoff (Phase 4 rule, before the build): Gemini Hydrogen 4, High, in a new chat, checks the definitions above for gaps (owner chose to do it, 2026-11-20). Done: `handoffs/archive/2026-11-20-gemini-review-analysis-definitions.md`.
2. Docs: SPEC lines 104-114 get the definitions (owner OK on the words); one line in docs/decisions.md. Save point.
3. Database: new migration `supabase/migrations/20261120030000_wait_and_recall_stats.sql` (highest on any open branch is `20261120020000` on `claude-features`; `phase5-e2e` has `20261120010000`, `main` has `20261118120000`). It adds 6 columns to `daily_stats` (`called`, `offer_to_call_seconds`, `wait_under_30`, `wait_30_to_59`, `wait_60_to_119`, `wait_120_plus`, all default 0) and replaces `delete_old_visits()` with the latest body from `20261116110000_lock_key_and_cron_log_fix.sql` plus 6 new event lines, same two-key lock, same revoke. No grant change: `20261118120000_daily_stats_staff_read.sql` grants the whole table. No patient-side write to `visits`, so the `version` rule does not apply. Owner runs it in the SQL Editor before any screen code is deployed (the screen reads `select *`, and a missing column would add up as NaN).
4. Check file: `supabase/checks/daily_stats.sql` gets the 6 new columns in its expected list (lines 153-159) and new test visits at each band edge in rounded minutes (1769 and 1770 seconds round to 29 and 30 minutes; 3569 and 3570; 7169 and 7170), one recalled visit with no `offered_at` (not counted), and one switched visit whose wait starts at the switch. Owner runs it; all rows as expected. Save point.
5. lib (test first for each, see it fail, then the code):
   - `lib/waitBand.ts` + test: seconds to one of the 4 bands, by rounded whole minutes. Learn by Doing: the owner writes the band lines.
   - `lib/waitStart.ts`: the start date constant (one line, no test needed beyond its use in the trend tests).
   - `lib/dashboardNumbers.ts`: new fields in `DailyStatsRow` and `SiteNumbers` (`recalled`, `offerToCallSeconds`, 4 band counts), from live visits plus daily_stats, with the existing `on()` and `fromStats()` helpers. About 25 lines; the file stays under 200.
   - New tests in `lib/dashboardWait.test.ts` (because `lib/dashboardNumbers.test.ts` is at 284 lines).
   - `lib/pastDays.ts` + test: the 7 Toronto dates before a given date, across a month end and the 2026-11-01 clock change.
   - `lib/funnelSteps.ts` + test: `SiteNumbers` to the ordered steps (label key and count), with no shares.
   - `lib/dashboardCsv.ts` + test: rows to CSV text with a header line, fixed column order, `is_demo` column.
   Save point.
6. data: `data/dashboardRead.ts:68` reads `day >= first past day` instead of `day = today`, so one read covers today and the trend. `data/summaryRead.ts` stays on today. Save point.
7. Screens (components/dashboard/):
   - `SiteNumbers.tsx`: 2 rows for the wait average, then `WaitBands.tsx` (new) for the 4 band counts.
   - `FunnelView.tsx` (new): today's steps per site, as a list.
   - `TrendTable.tsx` (new): a table per site with a caption, 7 rows (days) by triaged, offered %, accepted, average recall to arrival, average off-site wait, average survey score. `dashboardNumbers(visits, stats, day, isDemo)` already takes the day, so it is called once per day.
   - `CsvButton.tsx` (new): "Download past 7 days (CSV)", a Blob download named `virtual-er-stats-real-2026-11-20.csv` (or `-demo-`).
   - `DashboardView.tsx`: adds the 3 new parts under the site numbers.
   Save point.
8. Claude summary (owner OK, 2026-11-21; only after step 7, so the summary never names a number staff cannot see):
   - `lib/summaryInput.ts`: copy the 6 wait fields by name (`recalled`, `offerToCallSeconds`, the 4 band counts) and remove the `SummarySite` Omit type. 23 fields per site.
   - `lib/summaryPrompt.ts`: new lines in `SUMMARY_RULES`: `offerToCallSeconds` is a total in seconds over `recalled` visits; the 4 bands count only recalled visits; say "no data yet" when `recalled` is 0.
   - `lib/summaryInput.test.ts`: the key check goes from 17 to 23 keys. `lib/summaryPrompt.test.ts`: the rule-count test follows `SUMMARY_RULES`, so no change.
   - Model handoff: Gemini Hydrogen 4, High, in a new chat, a short review of the 6 new fields against SPEC rule 1 and of the new rule lines. Save point.

## Tests that must change

- `lib/dashboardNumbers.test.ts:29` `statsRow()`: its default row gets the 6 new columns at 0 (the type needs them). No test result changes.
- `data/dashboardRead.test.ts:82`: the filter `["day", "2026-11-18"]` becomes a `gte` filter on the first past day.
- `supabase/checks/daily_stats.sql`: expected list and new visits (step 4).
- `components/dashboard/SiteNumbers.test.tsx`: new rows for the wait average and its "no data yet" dash.

New tests: `lib/waitBand.test.ts`, `lib/dashboardWait.test.ts`, `lib/pastDays.test.ts`, `lib/funnelSteps.test.ts`, `lib/dashboardCsv.test.ts`, `components/dashboard/TrendTable.test.tsx`, `components/dashboard/CsvButton.click.test.tsx`.

## Verification

- `npm test 2>&1 | grep -E "Test Files|Tests "`, `npm run lint`, `npm run build` after each code step and at the end.
- Owner runs the migration and `supabase/checks/daily_stats.sql` in the SQL Editor; I read the rows.
- Playwright on `/dashboard` with Demo on, at phone width (390 px) and laptop width (1280 px): wait rows, bands, funnel, trend table and CSV download show; screenshots in `screenshots/`. Open the CSV and compare 2 numbers with the trend table.
- After the build: Gemini 3.6 Flash, High, writes 15 to 20 synthetic visits with the wait, band and funnel numbers they should produce; I check them against the rules and add them as a test. Then Gemini Hydrogen 4, High, reviews the result and checks that each new number has a clear definition.
- Last: a dated line in docs/progress.md.
