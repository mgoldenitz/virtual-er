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
