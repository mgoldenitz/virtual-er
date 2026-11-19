# Gemini review: dashboard metric definitions (before the build)

Model: Gemini Hydrogen 4, High. Use a new chat.

## What to paste into Gemini

Everything from "Prompt" to the end of "Data model".

## Prompt

You review a concept prototype: a virtual ER waiting room. Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on a phone, and come back when staff call them. The data is synthetic only. There are two sites, A and B.

A staff page, /dashboard, will show numbers for the current day. The definitions below are not built yet. Your job is to find problems in them before we build. Do not confirm what is good. List only problems.

For each problem, give:
1. The number it affects.
2. A concrete case (a visit with its times and status) that gives a wrong, unclear or misleading number.
3. The smallest change to the definition that fixes it.

Look at these points in particular:
- Time zone: "today" means since midnight, America/Toronto time. Visits that start before midnight and end after it.
- Numerators and denominators that count on different event dates (for example, offered today but triaged yesterday). Can a percentage go above 100%?
- Statuses that the definitions do not cover (for example `needs_reassessment`, `removed` with `left`, a visit that arrives without a call).
- Rule 4 below: deleted visits fold into daily_stats. Does each number give the same result before and after a visit is deleted? Do the daily_stats columns match the SPEC definitions? (Two places to check: `declined` counts on the offered_at date, and `no_shows` and `unable_to_reach` count on the closed_at date.)
- Demo mode: demo visits count only in demo mode. Is that clear enough to build?
- "Now" numbers (waiting, called) versus "today" numbers. Can staff misread them?
- Any number that a staff member could misread, and a clearer label for it.

Keep the answer short: a numbered list, then a list of any questions that need an owner decision.

## Dashboard numbers (SPEC, verbatim)

Numbers for the current day:

- Patients waiting off-site now, and patients called but not yet arrived
- Eligible patients offered the option (percentage), and how many declined
- Average minutes from call-back to arrival
- No-shows and patients marked unable to reach
- Visits started from home, and how many of those arrived at triage
- Survey: number of responses, average score, and share scoring 9 or 10

Definitions ("today" means since midnight, America/Toronto time; demo visits count only in demo mode, and daily_stats keeps them apart through its is_demo key):

- Waiting off-site now: visits with status waiting. Called but not arrived: status called or on_the_way.
- Offered (percentage): visits with offered_at today, divided by visits triaged today as CTAS 4 or 5 minus those marked not_eligible. Declined: status declined.
- Average minutes from call-back to arrival: arrived_at minus called_at, averaged over visits that were called and arrived today.
- No-shows: status removed with removed_reason no_show. Unable to reach: status unable_to_reach (nurse-confirmed).
- Visits started from home: source home, created today; of those, arrived at triage means triaged_at is set.
- Survey: responses are visits whose closed_at is today and that have a survey_score; report the count beside the average and the share scoring 9 or 10.

## Rule 4 (SPEC, verbatim)

Visits older than 24 hours are deleted automatically. Just before a visit is deleted, add its contribution to a daily_stats table, counting each number on the date of its own event (survey responses count on the closed_at date). No survey can arrive after deletion, so no day ever needs reprocessing; do not use a once-a-night summary job. The dashboard shows a day as its daily_stats totals plus the visits still in the visits table. daily_stats holds only totals (no codes, tokens or single-visit times).

## Data model (SPEC, verbatim)

visits: id, code (6-character display code), access_token (long random token), site (A or B), source (home or desk), ctas_level (4 or 5, empty until triage), language, status (pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed, declined, not_eligible), removed_reason (left or no_show, only when removed), created_at, triaged_at, offered_at (when staff offered off-site waiting), last_still_here_at, called_at, seen_at (first time the called screen was shown), confirmed_at, review_flagged_at, arrived_at, closed_at, phone_attempts (count of simulated calls), last_phone_result (answered or no_answer), followup_paused_until, survey_score (0 to 10, optional), is_demo.

daily_stats: key (day, site, is_demo), and one total per dashboard number. No codes, tokens or single-visit times.

Place in line is ordered by triaged_at, never by created_at.

## daily_stats columns as built (supabase/migrations/20261116100000_daily_stats_and_cleanup.sql, lines 9 to 31)

```sql
create table public.daily_stats (
  day date not null,
  site text not null check (site in ('A', 'B')),
  is_demo boolean not null,
  triaged_ctas_4_5 integer not null default 0,     -- CTAS 4 or 5, on the triaged_at date
  not_eligible integer not null default 0,         -- status not_eligible, on the triaged_at date
  offered integer not null default 0,              -- offered_at set, on the offered_at date
  declined integer not null default 0,             -- status declined, on the offered_at date
  called_and_arrived integer not null default 0,   -- status arrived with called_at set, on the arrived_at date
  call_to_arrival_seconds bigint not null default 0, -- sum for those visits; divide by called_and_arrived
  arrived integer not null default 0,              -- status arrived (with or without a call), on the arrived_at date
  no_shows integer not null default 0,             -- removed as no_show, on the closed_at date
  removed_left integer not null default 0,         -- removed as left, on the closed_at date
  unable_to_reach integer not null default 0,      -- status unable_to_reach, on the closed_at date
  open_at_deletion integer not null default 0,     -- still open when deleted (waiting, called, on_the_way or
                                                   -- needs_reassessment), on the triaged_at date
  started_from_home integer not null default 0,    -- source home, on the created_at date
  home_reached_triage integer not null default 0,  -- source home and triaged, on the created_at date
  survey_responses integer not null default 0,     -- survey_score set, on the closed_at date
  survey_score_sum integer not null default 0,     -- sum of those scores
  survey_9_or_10 integer not null default 0,       -- those with a score of 9 or 10
  primary key (day, site, is_demo)
);
```

## End of text to paste

## Checked (output in this session or in docs/progress.md)

- The SPEC text above is copied from SPEC.md lines 93 to 112, 38 and 117 onward.
- The daily_stats columns are copied from the migration file named above.

## Not checked

- Whether the folding function in that migration fills each column the way its comment says.
- Whether the live database matches the migration files.

## What to bring back to Claude

Paste Gemini's full answer. Claude adds it below under "Response", checks each point against the code, and asks you about any point that needs a product decision.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted by the owner.

1. **Cross-midnight date mismatch between numerator and denominator (`offered` vs. `triaged_ctas_4_5`) can push Offered % above 100% or divide by zero.**
* **Affects:** Number 2 (Eligible patients offered the option %).
* **Concrete case:** Visit `V01` (`ctas_level = 4`) has `triaged_at = 2026-11-17 23:50 EST` and `offered_at = 2026-11-18 00:05 EST`, while Visit `V02` (`ctas_level = 5`) has `triaged_at = 2026-11-18 00:10 EST` and `offered_at = null`. On Nov 18 at 00:15 EST, 1 offer today (`V01`) divided by 1 eligible triage today (`V02`) gives `100%` (or `200%` if a second yesterday-triaged visit is also offered after midnight, and `1 / 0` if `V02` has not arrived yet).
* **Smallest fix:** Count the offered numerator on the visit's `triaged_at` America/Toronto date (visits triaged today with `offered_at` set), or report raw counts (`N offered / M eligible triaged`) and guard `0` denominators.

2. **Negative or skewed denominator in Offered % when `not_eligible` visits have `ctas_level` NULL (or outside 4–5).**
* **Affects:** Number 2 (Eligible patients offered the option %).
* **Concrete case:** Visit `V03` is marked `status = 'not_eligible'` at desk intake on Nov 18 at 09:00 EST with `triaged_at = 2026-11-18 09:00 EST` and `ctas_level = null` (`ctas_level` is empty until triage). `triaged_ctas_4_5` is `0` and `not_eligible` is `1`, so `0 - 1` produces a denominator of `-1`.
* **Smallest fix:** Define eligible triaged visits directly as `triaged_at` today with `ctas_level in (4, 5)` and `status <> 'not_eligible'`.

3. **`Declined` has no event date in the SPEC, causing live counts to drop when 24-hour deletion folds them onto `offered_at` (and dropping rows with `offered_at = null`).**
* **Affects:** Number 2 (How many declined) and Rule 4 consistency.
* **Concrete case:** Visit `V04` has `created_at = 2026-11-17 09:50 EST`, `offered_at = 2026-11-17 10:00 EST`, `status = 'declined'`, and `closed_at = 2026-11-18 09:00 EST`. Before deletion at 09:30 EST on Nov 18, a live query without a date filter (or filtering on `closed_at`) counts `V04` on Nov 18; at 09:55 EST (`created_at < now() - 24h`), Rule 4 deletes `V04` and folds `declined` onto `offered_at` (Nov 17), reducing Nov 18's count by 1. A visit marked `declined` with `offered_at = null` is counted live before deletion but dropped by `daily_stats`.
* **Smallest fix:** Define Declined as `status = 'declined'` counted on `coalesce(offered_at, triaged_at, created_at)` in America/Toronto time, matching `daily_stats`.

4. **Staff can misread "Offered %" next to "Declined" as mutually exclusive outcomes.**
* **Affects:** Number 2 (Eligible patients offered the option %, and how many declined).
* **Concrete case:** Out of 10 eligible CTAS 4/5 visits today, all 10 are offered off-site waiting, 6 accept (`status = 'waiting'`), and 4 decline (`status = 'declined'`). Displaying `Offered: 100%` beside `Declined: 4` looks contradictory because declined patients are already inside the 100% offered.
* **Smallest fix:** Label the pair `"Offered off-site waiting: X% (N of M eligible)"` and `"Declined offer: K of N offered"`.

5. **Ambiguous `"called and arrived today"` phrasing risks excluding cross-midnight recalls before deletion and changing the average after deletion.**
* **Affects:** Number 3 (Average minutes from call-back to arrival) and Rule 4 consistency.
* **Concrete case:** Visit `V05` has `called_at = 2026-11-17 23:50 EST` and `arrived_at = 2026-11-18 00:10 EST` (`status = 'arrived'`). If the live query requires both `called_at` and `arrived_at` to be today, Nov 18 excludes `V05` until 24-hour deletion folds `V05` into Nov 18's `daily_stats` on `arrived_at`.
* **Smallest fix:** Define the cohort explicitly as `status = 'arrived' and called_at is not null` with `arrived_at` today (America/Toronto), matching `daily_stats`.

6. **Un-called desk arrivals (`status = 'arrived'`, `called_at = null`) and reopened visits with stale `arrived_at` distort arrival metrics.**
* **Affects:** Number 3 (Average minutes from call-back to arrival).
* **Concrete case:** Visit `V06` (`status = 'waiting'`) returns to the desk before any recall (`status = 'arrived'`, `arrived_at = 2026-11-18 11:00 EST`, `called_at = null`) and is absent from every dashboard metric even though `daily_stats.arrived` counts it. Conversely, Visit `V07` is called at 10:00, arrives at 10:15 (`arrived_at` set), moves to `needs_reassessment`, and closes as `no_show` at 11:00—counting in both `called_and_arrived` and `no_shows` unless `status = 'arrived'` is required.
* **Smallest fix:** Require `status = 'arrived' and called_at is not null and arrived_at >= called_at` for the average, and display total arrivals (`status = 'arrived'` on `arrived_at`) beside recalled arrivals.

7. **`No-shows` and `unable_to_reach` omit their event date in the SPEC, and `removed` with `removed_reason = 'left'` is missing completely.**
* **Affects:** Number 4 (No-shows and patients marked unable to reach) and Rule 4 consistency.
* **Concrete case:** Visit `V08` has `called_at = 2026-11-17 23:45 EST`, `status = 'removed'`, `removed_reason = 'no_show'`, and `closed_at = 2026-11-18 00:15 EST`; Visit `V09` closes on Nov 18 at 14:00 EST with `status = 'removed'`, `removed_reason = 'left'`. Without `closed_at` specified in the SPEC, `V08` can count on Nov 17 live and shift to Nov 18 on deletion, while `V09` is invisible on `/dashboard` despite being tracked in `daily_stats.removed_left`.
* **Smallest fix:** Specify `closed_at` today (America/Toronto) for `no_shows` and `unable_to_reach`, and add a count for `status = 'removed' and removed_reason = 'left'` on `closed_at`.

8. **`needs_reassessment` and `pre_arrival` statuses are dropped from both live "now" counts, and overnight open visits blur "now" vs. "today".**
* **Affects:** Number 1 (Patients waiting off-site now, and patients called but not yet arrived).
* **Concrete case:** Visit `V10` (`status = 'waiting'`) is flagged `status = 'needs_reassessment'` at 14:00 EST (`closed_at = null`), dropping out of both "Waiting off-site now" and "Called but not arrived" even though `daily_stats.open_at_deletion` treats it as open. Meanwhile, Visit `V11` (`created_at = 2026-11-17 22:30 EST`, `status = 'waiting'`) appears in `Waiting off-site now: 1` at 08:00 EST on Nov 18 alongside `Offered today: 0`.
* **Smallest fix:** Add a live count for `needs_reassessment` (and optionally `pre_arrival`), bound live "now" counts to `created_at >= now() - interval '24 hours'`, and label the card `"Current queue right now (all open visits)"` separate from `"Today (since midnight)"`.

9. **Home-to-triage cohort attribution on `created_at` date excludes cross-midnight home arrivals from today's count and retroactively alters yesterday's number.**
* **Affects:** Number 5 (Visits started from home, and how many of those arrived at triage).
* **Concrete case:** Visit `V12` (`source = 'home'`) has `created_at = 2026-11-17 23:35 EST` and `triaged_at = 2026-11-18 00:20 EST`. On Nov 18 at 00:30 EST, `/dashboard` shows `Started from home: 0, Arrived at triage: 0` because `V12` is credited back to Nov 17's cohort.
* **Smallest fix:** Keep the `created_at` cohort rule (so live and `daily_stats` match), but label it `"Started from home today: X (Y of those reached triage)"` rather than implying total home arrivals triaged today.

10. **Survey responses submitted after midnight (or before `closed_at` is set) are misattributed or dropped, and 0 responses causes division by zero.**
* **Affects:** Number 6 (Survey: number of responses, average score, and share scoring 9 or 10).
* **Concrete case:** Visit `V13` has `closed_at = 2026-11-17 23:50 EST` and submits `survey_score = 10` at `2026-11-18 00:10 EST` (credited to Nov 17 instead of Nov 18), while Visit `V14` submits `survey_score = 9` while `status = 'arrived'` (`closed_at = null`) and is dropped entirely. When `survey_responses = 0`, `survey_score_sum / survey_responses` and `survey_9_or_10 / survey_responses` divide by zero.
* **Smallest fix:** Ensure `closed_at` is set when a survey is saved (or bucket on `coalesce(closed_at, arrived_at, created_at)`), render `—` when `survey_responses = 0`, and label the share `"Scored 9 or 10 (top satisfaction)"`.

11. **Demo mode and Site (`A` vs. `B`) filtering are underspecified to build unambiguously.**
* **Affects:** All 6 dashboard numbers.
* **Concrete case:** On Nov 18, Site A has 10 demo visits (`is_demo = true`) and 2 real visits (`is_demo = false`), and Site B has 4 demo visits. The SPEC states `"demo visits count only in demo mode, and daily_stats keeps them apart through its is_demo key"`, but leaves undefined whether demo mode filters `is_demo = true` only or `is_demo in (true, false)`, how `/dashboard` switches into demo mode, and whether `/dashboard` filters by one `site` (`A` or `B`) or aggregates both.
* **Smallest fix:** Specify exact query predicates `where site = $site and is_demo = $is_demo` (`true` in demo mode, `false` otherwise) and define the UI toggle or URL parameter for `$site` and `$is_demo`.

### Questions that need an owner decision

1. **Offered % denominator cohort:** Should Offered % measure offers made today divided by eligible visits triaged today (which can exceed 100% across midnight), or the share of **visits triaged today** that received an offer (counting `offered` on `triaged_at` so the numerator is always a subset of the denominator)?
2. **Demo mode scope and trigger:** In demo mode, should `/dashboard` show **only** `is_demo = true` visits or combine `is_demo in (true, false)`, and what UI control or URL parameter activates demo mode?
3. **Site layout:** Should `/dashboard` filter to one selected site (`Site A` or `Site B`), show side-by-side columns for A and B, or combine both sites?
4. **Additional statuses already in `daily_stats`:** Should `/dashboard` also display `needs_reassessment` (live), `removed` with `removed_reason = 'left'` (today), and un-called desk arrivals (`arrived` with `called_at is null`, today), which are already stored in `daily_stats`?
5. **Reopened visits:** Can staff move an `arrived` visit back to `waiting` or `needs_reassessment`, and if so, should `arrived_at` be cleared so it is not counted in call-to-arrival averages?
