# Gemini review: the 24-hour clean-up and daily_stats

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

This review comes before the owner runs the migration. It is also the Phase 4 step "check the metric definitions" for the numbers that this table keeps.

## Text to paste

You review one database change in a Supabase (Postgres 17) prototype of a virtual ER waiting room (synthetic data only, no hospital systems). Find problems. Do not confirm that the change is good. For each problem, give the line, the data or the steps that make it happen, and the smallest fix. The migration and its check file are below the questions.

The rule (SPEC hard rule 4): "Visits older than 24 hours are deleted automatically. Just before a visit is deleted, add its contribution to a daily_stats table, counting each number on the date of its own event (survey responses count on the closed_at date) ... do not use a once-a-night summary job." "Today" on the staff dashboard means since midnight, Toronto time.

The change:
1. A new table `public.daily_stats`, one row per (Toronto date, site, demo flag), with totals only. Row-level security is on and anon and authenticated get no rights. The Phase 4 dashboard will add a staff read later.
2. A function `public.delete_old_visits()` (security definer, `search_path = ''`, no execute for public, anon or authenticated). In one statement it deletes the visits with `created_at` more than 24 hours ago, makes one event row for each number that a deleted visit adds, adds them up per Toronto date, and uses `insert ... on conflict do update` to add to a day that is already there.
3. `pg_cron` runs the function every 15 minutes. (Vercel cron on the Hobby plan runs at most once a day, so it was not used.)

Facts about the `visits` table: every time column is `timestamptz` and is set by a trigger to the database's `now()`, never by the browser. `status` is one of `pre_arrival`, `waiting`, `called`, `on_the_way`, `arrived`, `unable_to_reach`, `needs_reassessment`, `removed`, `declined`, `not_eligible`. `removed_reason` is `left` or `no_show` and is set only when the status is `removed`. `ctas_level` is 4, 5 or null. `survey_score` is 0 to 10 or null. `source` is `home` or `desk`. A statement trigger on `visits` touches a one-row `change_signal` table on every insert, update or delete (the staff screens listen to it).

Questions:
1. Is each number counted on the right date for its event? Is there a status path where a visit is counted twice, or not at all, when it should be (for example a desk check-in without a call, a visit that is removed as `left`, a visit with `triaged_at` but no `ctas_level`)?
2. Time zones: is `(at at time zone 'America/Toronto')::date` right for a `timestamptz`, also on the days when the clocks change?
3. Can the statement fail, and so leave old visits in the table (for example a null in the primary key, a type mismatch in the `union all`, the same key twice in one insert)? What happens if two runs overlap?
4. Security: can anon or authenticated read `daily_stats` or run `delete_old_visits()`? Is anything wrong with the `pg_cron` lines for Supabase?
5. Can the check file pass while the function is wrong? Is an important case missing from it?
6. Are any of these numbers defined in a way that a dashboard reader would misread? Is there a simpler way to reach the same goal?

## Checked

- The expected numbers in the check file were worked out by hand from the visits in it before the migration was written (commit `e07ff21`).
- The migration is saved in commit `9b3c64e`. It is not run on the database yet.
- `pg_cron` 1.6.4 is available on the project and not installed (Supabase `list_extensions`, this session).
- The `pg_cron` lines follow the Supabase docs page "Install" for Cron (`create extension pg_cron with schema pg_catalog`, and the two grants to `postgres`).

## Not checked

- The migration and the check file have not run yet, so neither the SQL syntax nor the expected numbers are proven.
- `supabase/checks/permissions.sql` has not run after this change.
- No real visit has been deleted by the cron job yet (that takes a day).
- `npm test`, `npm run lint` and `npm run build` have not run for this change (no app code changed).

## The migration: supabase/migrations/20261116100000_daily_stats_and_cleanup.sql

```sql
-- Phase 3: the 24-hour clean-up (SPEC hard rule 4). Every 15 minutes, pg_cron deletes the visits
-- created more than 24 hours ago. In the same statement, each deleted visit adds its numbers to
-- daily_stats, and each number counts on the Toronto date of its own event. daily_stats keeps
-- only totals per day, site and demo flag: no codes, tokens or times of one visit.
-- Check: supabase/checks/daily_stats.sql (run the whole file after this migration).

-- 1. The totals. Only delete_old_visits() writes here. Patients and staff get nothing in this
-- change; the Phase 4 dashboard adds a staff read.
create table public.daily_stats (
  day date not null,
  site text not null check (site in ('A', 'B')),
  is_demo boolean not null,
  triaged_ctas_4_5 integer not null default 0,     -- CTAS 4 or 5, on the triaged_at date
  not_eligible integer not null default 0,         -- status not_eligible, on the triaged_at date
  offered integer not null default 0,              -- offered_at set, on the offered_at date
  declined integer not null default 0,             -- status declined, on the offered_at date
  called_and_arrived integer not null default 0,   -- called_at and arrived_at set, on the arrived_at date
  call_to_arrival_seconds bigint not null default 0, -- sum for those visits; divide by called_and_arrived
  no_shows integer not null default 0,             -- removed as no_show, on the closed_at date
  unable_to_reach integer not null default 0,      -- status unable_to_reach, on the closed_at date
  started_from_home integer not null default 0,    -- source home, on the created_at date
  home_reached_triage integer not null default 0,  -- source home and triaged, on the created_at date
  survey_responses integer not null default 0,     -- survey_score set, on the closed_at date
  survey_score_sum integer not null default 0,     -- sum of those scores
  survey_9_or_10 integer not null default 0,       -- those with a score of 9 or 10
  primary key (day, site, is_demo)
);

alter table public.daily_stats enable row level security;
-- Supabase gives anon and authenticated rights on every new table; take them back.
revoke all on public.daily_stats from anon, authenticated;

-- 2. The clean-up. One statement, so the delete and the totals succeed or fail together.
create function public.delete_old_visits()
returns void
language sql
security definer
set search_path = ''
as $$
  with gone as (
    delete from public.visits
    where created_at < now() - interval '24 hours'
    returning *
  ),
  -- One row per number that a deleted visit adds, with the time of the event it counts on.
  events (site, is_demo, at, metric, amount) as (
    select site, is_demo, triaged_at, 'triaged_ctas_4_5', 1 from gone
      where ctas_level in (4, 5) and triaged_at is not null
    union all
    select site, is_demo, triaged_at, 'not_eligible', 1 from gone
      where status = 'not_eligible' and triaged_at is not null
    union all
    select site, is_demo, offered_at, 'offered', 1 from gone
      where offered_at is not null
    union all
    select site, is_demo, offered_at, 'declined', 1 from gone
      where status = 'declined' and offered_at is not null
    union all
    select site, is_demo, arrived_at, 'called_and_arrived', 1 from gone
      where called_at is not null and arrived_at is not null
    union all
    select site, is_demo, arrived_at, 'call_to_arrival_seconds',
           round(extract(epoch from arrived_at - called_at))::bigint from gone
      where called_at is not null and arrived_at is not null
    union all
    select site, is_demo, closed_at, 'no_shows', 1 from gone
      where status = 'removed' and removed_reason = 'no_show' and closed_at is not null
    union all
    select site, is_demo, closed_at, 'unable_to_reach', 1 from gone
      where status = 'unable_to_reach' and closed_at is not null
    union all
    select site, is_demo, created_at, 'started_from_home', 1 from gone
      where source = 'home'
    union all
    select site, is_demo, created_at, 'home_reached_triage', 1 from gone
      where source = 'home' and triaged_at is not null
    union all
    select site, is_demo, closed_at, 'survey_responses', 1 from gone
      where survey_score is not null and closed_at is not null
    union all
    select site, is_demo, closed_at, 'survey_score_sum', survey_score from gone
      where survey_score is not null and closed_at is not null
    union all
    select site, is_demo, closed_at, 'survey_9_or_10', 1 from gone
      where survey_score in (9, 10) and closed_at is not null
  ),
  -- The events added up per Toronto date, site and demo flag.
  totals as (
    select (at at time zone 'America/Toronto')::date as day, site, is_demo,
      coalesce(sum(amount) filter (where metric = 'triaged_ctas_4_5'), 0) as triaged_ctas_4_5,
      coalesce(sum(amount) filter (where metric = 'not_eligible'), 0) as not_eligible,
      coalesce(sum(amount) filter (where metric = 'offered'), 0) as offered,
      coalesce(sum(amount) filter (where metric = 'declined'), 0) as declined,
      coalesce(sum(amount) filter (where metric = 'called_and_arrived'), 0) as called_and_arrived,
      coalesce(sum(amount) filter (where metric = 'call_to_arrival_seconds'), 0) as call_to_arrival_seconds,
      coalesce(sum(amount) filter (where metric = 'no_shows'), 0) as no_shows,
      coalesce(sum(amount) filter (where metric = 'unable_to_reach'), 0) as unable_to_reach,
      coalesce(sum(amount) filter (where metric = 'started_from_home'), 0) as started_from_home,
      coalesce(sum(amount) filter (where metric = 'home_reached_triage'), 0) as home_reached_triage,
      coalesce(sum(amount) filter (where metric = 'survey_responses'), 0) as survey_responses,
      coalesce(sum(amount) filter (where metric = 'survey_score_sum'), 0) as survey_score_sum,
      coalesce(sum(amount) filter (where metric = 'survey_9_or_10'), 0) as survey_9_or_10
    from events
    group by 1, 2, 3
  )
  -- A day already in daily_stats gets the new numbers added to it, never replaced.
  insert into public.daily_stats as s (
    day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, no_shows, unable_to_reach,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10
  )
  select day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, no_shows, unable_to_reach,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10
  from totals
  on conflict (day, site, is_demo) do update set
    triaged_ctas_4_5 = s.triaged_ctas_4_5 + excluded.triaged_ctas_4_5,
    not_eligible = s.not_eligible + excluded.not_eligible,
    offered = s.offered + excluded.offered,
    declined = s.declined + excluded.declined,
    called_and_arrived = s.called_and_arrived + excluded.called_and_arrived,
    call_to_arrival_seconds = s.call_to_arrival_seconds + excluded.call_to_arrival_seconds,
    no_shows = s.no_shows + excluded.no_shows,
    unable_to_reach = s.unable_to_reach + excluded.unable_to_reach,
    started_from_home = s.started_from_home + excluded.started_from_home,
    home_reached_triage = s.home_reached_triage + excluded.home_reached_triage,
    survey_responses = s.survey_responses + excluded.survey_responses,
    survey_score_sum = s.survey_score_sum + excluded.survey_score_sum,
    survey_9_or_10 = s.survey_9_or_10 + excluded.survey_9_or_10;
$$;

-- Only the cron job (and the owner in the SQL Editor) runs it; patients and staff cannot.
revoke execute on function public.delete_old_visits() from public, anon, authenticated;

-- 3. The schedule: pg_cron inside the database, every 15 minutes. A visit is gone at most
-- 24 hours and 15 minutes after it was created. A later schedule with the same name changes
-- this job; it does not add a second one.
create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.schedule('delete-old-visits', '*/15 * * * *', 'select public.delete_old_visits()');
```

## The check: supabase/checks/daily_stats.sql

```sql
-- Check for the 24-hour clean-up (migration 20261116100000_daily_stats_and_cleanup.sql).
-- Run the whole file at once in the Supabase SQL Editor, after that migration. It saves nothing:
-- everything happens inside "begin ... rollback", so the synthetic visits, the paused trigger,
-- the real visits that the clean-up deletes and the daily_stats rows all come back as they were.
--
-- Why the trigger is paused: visits_before_write sets every new time to now(), so this check
-- could not make visits that are more than 24 hours old.
-- Why January 2000: no real visit can count on those dates, and Toronto is on EST (UTC-5) then.
-- D1 = 2000-01-01 and D2 = 2000-01-02, both Toronto dates.
--
-- The synthetic visits (all site A and not demo, unless the line says so):
--   5A  desk, CTAS 4, triaged and offered D1, called 12:00, arrived 12:30 D1 (1800 s)
--   5B  desk, CTAS 5, triaged and offered D1 23:30, arrived D2 00:30 (2400 s): the midnight case
--   5C  desk, CTAS 4, triaged and offered D1, declined
--   5D  desk, not eligible (no CTAS), triaged D1
--   5E  desk, CTAS 4, triaged and offered D1, no-show closed D2 01:00
--   5F  desk, CTAS 5, triaged and offered D2, unable to reach closed D2
--   5G  home, created D1 22:00, triaged and offered D2, arrived 20 min after the call (1200 s),
--       closed D2, survey 10
--   5H  home, created D2, never triaged (pre_arrival)
--   5J  desk, CTAS 5, triaged and offered D2, came to the desk without a call, closed D2, survey 6
--   5K  site B, demo, CTAS 4, triaged D2, still waiting
--   5P  24 hours 5 minutes old: deleted (it counts on a real date, so it is not in the rows)
--   5N  23 hours old: must stay
-- A daily_stats row is already there for (D2, A, not demo): 100 triaged, 5 surveys, score sum 40.
-- The clean-up must add to it, not replace it.
--
-- Expected result (3 rows, visits_left = 1 on each row, the 23-hour visit 5N):
--   D1 A false  triaged 4  not_eligible 1  offered 4  declined 1  called_and_arrived 1
--               call_to_arrival_seconds 1800  no_shows 0  unable_to_reach 0
--               started_from_home 1  home_reached_triage 1  surveys 0  score_sum 0  9_or_10 0
--   D2 A false  triaged 103  not_eligible 0  offered 3  declined 0  called_and_arrived 2
--               call_to_arrival_seconds 3600  no_shows 1  unable_to_reach 1
--               started_from_home 1  home_reached_triage 0  surveys 7  score_sum 56  9_or_10 1
--   D2 B true   triaged 1, every other number 0
-- Notes: 5B counts as triaged on D1 but as arrived on D2. 5G counts as started from home on D1
-- (its created date) but as triaged on D2. 5J has no call time, so it is not in called_and_arrived.

begin;

alter table public.visits disable trigger visits_before_write;

insert into public.daily_stats (day, site, is_demo, triaged_ctas_4_5, survey_responses, survey_score_sum)
values ('2000-01-02', 'A', false, 100, 5, 40);

insert into public.visits
  (code, access_token, site, source, ctas_level, status, removed_reason, is_demo,
   created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score)
values
  ('ZZZZ5A', 'ZZZZZZZZZZZZZZZZZZZZZZZZD0', 'A', 'desk', 4, 'arrived', null, false,
   '2000-01-01 10:00 America/Toronto', '2000-01-01 10:00 America/Toronto', '2000-01-01 10:05 America/Toronto',
   '2000-01-01 12:00 America/Toronto', '2000-01-01 12:30 America/Toronto', null, null),
  ('ZZZZ5B', 'ZZZZZZZZZZZZZZZZZZZZZZZZD1', 'A', 'desk', 5, 'arrived', null, false,
   '2000-01-01 23:30 America/Toronto', '2000-01-01 23:30 America/Toronto', '2000-01-01 23:35 America/Toronto',
   '2000-01-01 23:50 America/Toronto', '2000-01-02 00:30 America/Toronto', null, null),
  ('ZZZZ5C', 'ZZZZZZZZZZZZZZZZZZZZZZZZD2', 'A', 'desk', 4, 'declined', null, false,
   '2000-01-01 09:00 America/Toronto', '2000-01-01 09:00 America/Toronto', '2000-01-01 09:05 America/Toronto',
   null, null, null, null),
  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZD3', 'A', 'desk', null, 'not_eligible', null, false,
   '2000-01-01 08:00 America/Toronto', '2000-01-01 08:00 America/Toronto', null,
   null, null, null, null),
  ('ZZZZ5E', 'ZZZZZZZZZZZZZZZZZZZZZZZZD4', 'A', 'desk', 4, 'removed', 'no_show', false,
   '2000-01-01 14:00 America/Toronto', '2000-01-01 14:00 America/Toronto', '2000-01-01 14:05 America/Toronto',
   '2000-01-01 20:00 America/Toronto', null, '2000-01-02 01:00 America/Toronto', null),
  ('ZZZZ5F', 'ZZZZZZZZZZZZZZZZZZZZZZZZD5', 'A', 'desk', 5, 'unable_to_reach', null, false,
   '2000-01-02 08:00 America/Toronto', '2000-01-02 08:00 America/Toronto', '2000-01-02 08:05 America/Toronto',
   '2000-01-02 09:00 America/Toronto', null, '2000-01-02 10:00 America/Toronto', null),
  ('ZZZZ5G', 'ZZZZZZZZZZZZZZZZZZZZZZZZD6', 'A', 'home', 4, 'arrived', null, false,
   '2000-01-01 22:00 America/Toronto', '2000-01-02 01:00 America/Toronto', '2000-01-02 01:05 America/Toronto',
   '2000-01-02 03:00 America/Toronto', '2000-01-02 03:20 America/Toronto', '2000-01-02 05:00 America/Toronto', 10),
  ('ZZZZ5H', 'ZZZZZZZZZZZZZZZZZZZZZZZZD7', 'A', 'home', null, 'pre_arrival', null, false,
   '2000-01-02 06:00 America/Toronto', null, null,
   null, null, null, null),
  ('ZZZZ5J', 'ZZZZZZZZZZZZZZZZZZZZZZZZD8', 'A', 'desk', 5, 'arrived', null, false,
   '2000-01-02 11:00 America/Toronto', '2000-01-02 11:00 America/Toronto', '2000-01-02 11:05 America/Toronto',
   null, '2000-01-02 12:00 America/Toronto', '2000-01-02 12:30 America/Toronto', 6),
  ('ZZZZ5K', 'ZZZZZZZZZZZZZZZZZZZZZZZZD9', 'B', 'desk', 4, 'waiting', null, true,
   '2000-01-02 07:00 America/Toronto', '2000-01-02 07:00 America/Toronto', null,
   null, null, null, null),
  ('ZZZZ5P', 'ZZZZZZZZZZZZZZZZZZZZZZZZE0', 'A', 'desk', null, 'not_eligible', null, false,
   now() - interval '24 hours 5 minutes', now() - interval '24 hours 5 minutes', null,
   null, null, null, null),
  ('ZZZZ5N', 'ZZZZZZZZZZZZZZZZZZZZZZZZE1', 'A', 'desk', 4, 'waiting', null, false,
   now() - interval '23 hours', now() - interval '23 hours', null,
   null, null, null, null);

select public.delete_old_visits();

select s.day, s.site, s.is_demo,
       s.triaged_ctas_4_5, s.not_eligible, s.offered, s.declined,
       s.called_and_arrived, s.call_to_arrival_seconds, s.no_shows, s.unable_to_reach,
       s.started_from_home, s.home_reached_triage,
       s.survey_responses, s.survey_score_sum, s.survey_9_or_10,
       (select count(*) from public.visits where code like 'ZZZZ5%') as visits_left
from public.daily_stats s
where s.day < '2001-01-01'
order by s.day, s.site, s.is_demo;

rollback;
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-16. Pasted as given.


## 1. Event dates and status paths

1. **Desk arrivals without a recall (`called_at is null`, `arrived_at is not null`) vanish from all outcome counts**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 17 and 59–60 (`where called_at is not null and arrived_at is not null`).

* **Data / steps that make it happen:** A patient is triaged (`ctas_level = 5`), offered off-site waiting (`offered_at` set), and returns to the desk on their own before staff recall them (`status = 'arrived'`, `arrived_at` set, `called_at = null` — case `5J` in `daily_stats.sql`). `offered` increments by 1, while `called_and_arrived`, `declined`, `no_shows`, and `unable_to_reach` all stay 0, leaving no arrival count for that visit.

* **Smallest fix:** Add an `arrived` integer column (`arrived_at is not null and status = 'arrived'`, counted on `arrived_at`) alongside `called_and_arrived` so un-called desk arrivals are still accounted for.

2. **Visits removed with `removed_reason = 'left'` are completely uncounted**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 19 and 66–67 (`where status = 'removed' and removed_reason = 'no_show' and closed_at is not null`).

* **Data / steps that make it happen:** A patient accepts off-site waiting (`offered_at` set), later tells staff they are leaving, and staff remove them with `status = 'removed'` and `removed_reason = 'left'`. `offered` increments by 1, and every outcome counter (`called_and_arrived`, `no_shows`, `unable_to_reach`, `declined`) records 0.

* **Smallest fix:** Add a `left_without_being_seen` (or `removed_left`) column counting `status = 'removed' and removed_reason = 'left'` on `coalesce(closed_at, created_at)`.

3. **`called_and_arrived` and `call_to_arrival_seconds` do not check `status = 'arrived'` and can count reopened visits twice or add negative seconds**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 59–64 (`where called_at is not null and arrived_at is not null`).

* **Data / steps that make it happen:**
* If a visit is called (`called_at` set), marked `arrived` (`arrived_at` set), and later reopened to `needs_reassessment` / `waiting` without clearing `arrived_at`, then eventually closed as `removed` (`no_show`) or `unable_to_reach`, it increments **both** `called_and_arrived` and `no_shows` (or `unable_to_reach`).

* If that reopened visit is recalled a second time (`called_at` updated to the new `now()`) while the old `arrived_at` remains set, `arrived_at - called_at` is negative and subtracts seconds from `call_to_arrival_seconds`.

* **Smallest fix:** Require `and status = 'arrived' and arrived_at >= called_at` on both `called_and_arrived` and `call_to_arrival_seconds` (and ensure any reopen/undo clears `arrived_at`).

4. **A visit with both `ctas_level in (4, 5)` and `status = 'not_eligible'` is counted in both columns**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 47–51.

* **Data / steps that make it happen:** Staff record `ctas_level = 4` (or `5`) during triage and then set `status = 'not_eligible'` (for instance, patient has no phone or off-site waiting is paused). Both `triaged_ctas_4_5` and `not_eligible` increment by 1, whereas if `ctas_level` is left `null` (as in `5D` and `5P`), only `not_eligible` increments.

* **Smallest fix:** Either exclude `status <> 'not_eligible'` from `triaged_ctas_4_5` (if `triaged_ctas_4_5` means eligible CTAS 4/5 visits) or count `not_eligible` only when `ctas_level is null`—and document the exact relationship in the column comment.

5. **Nullable event timestamps (`triaged_at`, `offered_at`, `closed_at`) silently drop valid status/survey counts**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 51 (`not_eligible`), 57 (`declined`), 67 (`no_shows`), 70 (`unable_to_reach`), and 79–85 (`survey_*`).

* **Data / steps that make it happen:** If a row reaches `status = 'not_eligible'` with `triaged_at is null`, `status = 'declined'` with `offered_at is null`, `status in ('removed', 'unable_to_reach')` with `closed_at is null`, or `survey_score is not null` with `closed_at is null`, the `is not null` filter drops the row from `events` even though the visit is deleted from `visits`.

* **Smallest fix:** Fall back to `created_at` (which is guaranteed non-null by the `DELETE` filter) when the specific event timestamp is missing: `coalesce(triaged_at, created_at)`, `coalesce(offered_at, triaged_at, created_at)`, and `coalesce(closed_at, created_at)`.

6. **Visits still open after 24 hours (`pre_arrival`, `waiting`, `called`, `on_the_way`, `needs_reassessment`) are deleted without an outcome counter**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 41–43 (`delete from public.visits where created_at < now() - interval '24 hours'`).

* **Data / steps that make it happen:** A visit is offered off-site waiting (`offered_at` set, `status = 'waiting'`, like `5K`) and never closed before 24 hours elapse. `delete_old_visits()` deletes it and increments `offered` (and `triaged_ctas_4_5`), while every terminal outcome column stays 0.

* **Smallest fix:** Add an `expired_open` column counting rows deleted while `status in ('waiting', 'called', 'on_the_way', 'needs_reassessment')` on `created_at + interval '24 hours'` (or `created_at`) so `offered` reconciles against all terminal outcomes.

---

## 2. Time zones (`(at at time zone 'America/Toronto')::date`)

1. **The expression itself is right for `timestamptz`—including on spring-forward and fall-back DST days—with two caveats to verify**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, line 89 (`(at at time zone 'America/Toronto')::date as day`).

* **How it behaves on DST days:** Because every time column on `visits` is `timestamptz` (a UTC instant), `at time zone 'America/Toronto'` converts the UTC instant into Toronto wall-clock `timestamp without time zone` using the IANA `America/Toronto` rules (EST = UTC-5, EDT = UTC-4), and `::date` extracts that local calendar day. On spring-forward day (23-hour day, 02:00–02:59 skipped) and fall-back day (25-hour day, 01:00–01:59 repeated), UTC instants never collide or skip, and `extract(epoch from arrived_at - called_at)` subtracts UTC instants cleanly.

* **Two problems to guard against:**
1. **If any time column were ever `timestamp` (without time zone):** In Postgres, `timestamp without time zone AT TIME ZONE 'America/Toronto'` does the *opposite* conversion (assumes the timestamp is already Toronto wall time and shifts it to UTC). Verify all time columns on `visits` are `timestamptz`.

2. **DST is untested in `daily_stats.sql`:** `daily_stats.sql` uses January 2000 (EST only), so a broken hardcoded `- interval '5 hours'` offset would still pass the check script.

* **Smallest fix:** Keep `(at at time zone 'America/Toronto')::date`, and add one summer/EDT evening row (e.g., `'2000-07-01 21:00 America/Toronto'`, which is `2000-07-02 01:00 UTC`) to `supabase/checks/daily_stats.sql`.

---

## 3. Ways the statement can fail and overlapping runs

1. **`SET search_path = ''` on `delete_old_visits()` can break the statement trigger on `visits` (`change_signal`)**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 38 (`set search_path = ''`) and 41 (`delete from public.visits ...`).

* **Data / steps that make it happen:** Deleting from `public.visits` fires the `AFTER DELETE` statement trigger that updates `change_signal`. In Postgres, a `SECURITY DEFINER` function's `set search_path = ''` stays active inside triggers fired by that function unless the trigger function sets its own `search_path`. If the trigger function references `change_signal` without `public.` and lacks its own `set search_path`, every `delete_old_visits()` run fails with `relation "change_signal" does not exist` and rolls back the cleanup. Even when schema-qualified, `FOR EACH STATEMENT` fires even when **0 rows** match `created_at < now() - interval '24 hours'`, waking all staff screens every 15 minutes for no change.

* **Smallest fix:** Ensure the `change_signal` trigger function uses `public.change_signal` and `set search_path = ''` (and skip touching `change_signal` on `DELETE` when `not exists (select 1 from old_rows)` via a `REFERENCING OLD TABLE AS old_rows` transition table).

2. **A `NULL` or out-of-range `site` / `is_demo` on `visits` aborts the entire cleanup via PK / CHECK constraint**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 10–12 (`day date not null, site text not null check (site in ('A', 'B')), is_demo boolean not null`) and 107–113.

* **Data / steps that make it happen:** If even a single old row in `visits` has `is_demo is null` or `site is null` (or a value outside `'A'`, `'B'`), `insert into public.daily_stats` raises `null value in column ... violates not-null constraint` (or `daily_stats_site_check`), rolling back the `DELETE` and leaving all expired visits in `public.visits`.

* **Smallest fix:** Confirm `visits.site` (`not null check (site in ('A', 'B'))`) and `visits.is_demo` (`not null default false`) have matching constraints on `public.visits`, and use `coalesce(is_demo, false)` in `events`.

3. **Foreign keys referencing `public.visits` without `ON DELETE CASCADE` / `SET NULL` will abort `DELETE**`
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 41–43.

* **Data / steps that make it happen:** If any child table has a foreign key to `visits(id)` with the default `NO ACTION` / `RESTRICT`, deleting an old visit fails with a foreign-key violation and leaves all old visits in `visits`.

* **Smallest fix:** Verify no table holds a `NO ACTION` / `RESTRICT` foreign key to `public.visits` before running the migration.

4. **Type mismatch in `UNION ALL` and duplicate keys in `INSERT ... ON CONFLICT`:**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 46–105.

* **What happens:**
* **Same key twice in one insert:** Cannot fail from duplicate keys because `totals` (`group by 1, 2, 3`, line 104) collapses rows to one row per `(day, site, is_demo)` before `insert ... on conflict do update`.

* **`UNION ALL` types:** `integer` (`1`, `survey_score`) and `bigint` (`round(...)::bigint`, line 63) unify cleanly to `bigint` in Postgres, and `sum(bigint)` produces `numeric` which casts to `integer`/`bigint` on insert.

5. **Overlapping runs of `delete_old_visits()` can deadlock on `daily_stats` row lock ordering**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 34–125 and 137.

* **Data / steps that make it happen:** Under `READ COMMITTED`, if Run 1 is still running at minute 15 when Run 2 starts, Run 2 blocks on Run 1's row locks in `visits` until Run 1 commits, then sees those rows are already deleted and does not double-count them. However, if two runs (e.g., `pg_cron` and a manual call) delete disjoint sets of rows and insert into `daily_stats` in different `(day, site, is_demo)` hash-aggregate orders, Postgres can raise `deadlock detected` (`40P01`), aborting one run.

* **Smallest fix:** Add `order by 1, 2, 3` to the `select ... from totals` query (lines 112–115) for deterministic lock ordering, and wrap the body in PL/pgSQL with `if not pg_try_advisory_xact_lock(hashtext('delete_old_visits')) then return; end if;` so overlapping runs exit immediately without blocking.

---

## 4. Security and `pg_cron`

1. **`service_role` still retains `EXECUTE` on `public.delete_old_visits()**`
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, line 128 (`revoke execute on function public.delete_old_visits() from public, anon, authenticated;`).

* **Data / steps that make it happen:** `anon` and `authenticated` cannot read `daily_stats` (RLS enabled with no policies + `revoke all`, lines 29–31) and cannot execute `delete_old_visits()` (`revoke execute ... from public, anon, authenticated`, line 128). However, Supabase default privileges also grant `EXECUTE` on new `public` functions to `service_role`, even though only `pg_cron` (running as `postgres`) needs to call it.

* **Smallest fix:** Change line 128 to `revoke execute on function public.delete_old_visits() from public, anon, authenticated, service_role;` and add assertions for both `daily_stats` and `delete_old_visits()` to `supabase/checks/permissions.sql`.

2. **`pg_cron` migration lines break local `supabase db reset` / preview environments without `pg_cron` preloaded, and `cron.job_run_details` grows unboundedly**
* **Line:** `supabase/migrations/20261116100000_daily_stats_and_cleanup.sql`, lines 133–137.

* **Data / steps that make it happen:**
* On Supabase hosted Postgres 17, `create extension if not exists pg_cron with schema pg_catalog;` + the two `grant`s to `postgres` + `select cron.schedule('delete-old-visits', '*/15 * * * *', 'select public.delete_old_visits()');` match Supabase's documented setup and update the existing job in place by name.

* However, in local Supabase CLI or CI databases where `pg_cron` is not in `shared_preload_libraries`, `create extension if not exists pg_cron` fails the entire migration (`pg_cron can only be loaded via shared_preload_libraries`).

* In production, running every 15 minutes inserts 96 rows/day into `cron.job_run_details`, which `pg_cron` never purges automatically.

* **Smallest fix:** Guard the `pg_cron` block with `if exists (select 1 from pg_available_extensions where name = 'pg_cron') then ... end if;` inside a `DO $$` block (or enable `pg_cron` in `supabase/config.toml`), and include a daily `delete from cron.job_run_details where end_time < now() - interval '7 days'` job (or prune inside `delete_old_visits()`).

---

## 5. Gaps in `supabase/checks/daily_stats.sql`

(Note: All expected counts in `daily_stats.sql` match the current function's logic for the 12 test rows, except `visits_left = 1` is a single scalar column repeated on all 3 result rows rather than a separate check.)

1. **No automated assertions—passing requires a human to visually scan 48 numbers**
* **Line:** `supabase/checks/daily_stats.sql`, lines 72–80 (`select s.day ...`).

* **Steps that make it happen:** If a bug changes `call_to_arrival_seconds` from `3600` to `3599` or `survey_score_sum` from `56` to `55`, the script still completes without error.

* **Smallest fix:** Add a `do $$ begin ... if ... then raise exception ... end if; end $$;` block before `rollback;` that asserts the exact expected row count and column totals for D1 and D2.

2. **`survey_9_or_10` is never tested with score `9` (only `10` and `6`)**
* **Line:** `supabase/checks/daily_stats.sql`, lines 58 (`survey_score = 10`) and 62 (`survey_score = 6`).

* **Steps that make it happen:** If `delete_old_visits()` had `where survey_score = 10` (missing `9`) or `where survey_score >= 7`, `daily_stats.sql` would still output `survey_9_or_10 = 1` and pass.

* **Smallest fix:** Add a visit with `survey_score = 9` (and one with `survey_score = 0` or `8`) on D1 or D2 and update the expected `survey_responses`, `survey_score_sum`, and `survey_9_or_10`.

3. **`ZZZZ5P` (the 24h 5m cutoff row) is never verified in `daily_stats**`
* **Line:** `supabase/checks/daily_stats.sql`, lines 65–66 and 79 (`where s.day < '2001-01-01'`).

* **Steps that make it happen:** `where s.day < '2001-01-01'` hides the real-date row created by `ZZZZ5P`. If `delete_old_visits()` deleted `ZZZZ5P` without counting it, the check would still pass.

* **Smallest fix:** Capture `v_day := (now() - interval '24 hours 5 minutes') at time zone 'America/Toronto'` before calling `delete_old_visits()`, and assert that `not_eligible` on `(v_day::date, 'A', false)` increased by 1.

4. **Missing boundary and status-path cases**
* **Line:** `supabase/checks/daily_stats.sql`, lines 41–70.

* **Cases missing:**
* **DST / EDT evening timestamp** (e.g., `2000-07-01 21:00 America/Toronto`, which is `2000-07-02` in UTC) to prove `'America/Toronto'` handles UTC-4 as well as UTC-5.

* **A visit removed as `left**` (`status = 'removed', removed_reason = 'left'`) to verify it does not increment `no_shows`.

* **A visit with both `called_at` and `arrived_at` set that was reopened and closed as `no_show` / `unable_to_reach**` (which exposes Problem 1.3 above).

* **A second `select public.delete_old_visits();` call** to verify idempotency (totals do not change on a second run).

---

## 6. Dashboard misreadings and simpler options

1. **Metric definitions that a dashboard reader will misread**
* **`daily_stats` is always 24 hours behind "Today":** Because rows enter `daily_stats` only *after* `created_at < now() - interval '24 hours'`, querying `daily_stats` alone for "Today" (since midnight Toronto time) always returns `0`. The Phase 4 dashboard query must combine `daily_stats` with live `visits` (`created_at >= now() - interval '24 hours'`).

* **`declined` is a subset of `offered`, while `not_eligible` is excluded from `triaged_ctas_4_5`:** A reader who sums `offered + declined` double-counts declined patients, and a reader who divides `offered / triaged_ctas_4_5` gets a skewed rate because `not_eligible` visits (with `ctas_level is null`) are omitted from `triaged_ctas_4_5`.

* **`called_and_arrived` + `no_shows` + `unable_to_reach` will not equal accepted offers (`offered - declined`):** Un-called desk arrivals (`5J`), `removed_reason = 'left'`, and visits still open at 24 hours (`5K`) all increment `offered` without incrementing any terminal outcome column, making it look like patients vanished.

* **`home_reached_triage` uses `created_at` date while `triaged_ctas_4_5` uses `triaged_at` date:** On D1 in `daily_stats.sql`, visit `5G` makes `home_reached_triage = 1` on D1 even though `5G` was triaged on D2. That is right for cohort conversion (`home_reached_triage / started_from_home` on D1), but a single-day card showing `home_reached_triage` beside `triaged_ctas_4_5` can show more home triages than total triages on that day.

2. **Simpler ways to reach the same goal**
* **Replace the 13-branch `events` `UNION ALL` (13 scans of `gone`) with a single `CROSS JOIN LATERAL` per deleted visit:**
* Instead of scanning `gone` 13 times in `events` (lines 46–86) and re-pivoting with 13 `FILTER` sums in `totals` (lines 88–105), emit the event-date buckets for each row in `gone` once via `cross join lateral (values ...)` (at most 5 date buckets per visit—`triaged_at`, `offered_at`, `arrived_at`, `closed_at`, `created_at`—grouped by `(at at time zone 'America/Toronto')::date, site, is_demo`). That cuts the function nearly in half, scans `gone` once, and puts every metric's condition and event date on a single readable line.

* **Share one SQL helper / view for the row-to-metrics mapping with Phase 4:**
* Extract the `visits` -> `(day, site, is_demo, ...13 metrics...)` projection into a reusable SQL function or view so both `delete_old_visits()` (for `created_at < now() - interval '24 hours'`) and the Phase 4 dashboard RPC (for live `visits` where `created_at >= now() - interval '24 hours'`) run the exact same metric definitions without duplicating 60 lines of `CASE` logic.

## Claude's check of the response

Each point was checked against the code in this session. "Accept" means a change is proposed; "Reject" means no change, with the reason.

1.1 Desk arrival without a call-back is not in any outcome count. Reject for now. SPEC names only "Average minutes from call-back to arrival", over visits that were called and arrived. It names no count of all arrivals. See the owner choice below: a total that is not stored at deletion is lost for good.

1.2 Removed as `left` is not counted. Reject for now, same reason: the SPEC dashboard list has no "left" number. Same owner choice.

1.3 Reopen leaves `arrived_at`, so a visit could count as arrived and as a no-show, or give negative seconds. Not possible in the app. `undoClose` (lib/visitActions.ts) sets `arrived_at` to null. `reopenUnableToReach` acts only on `unable_to_reach`, and that status comes from `called` or `on_the_way`, so `arrived_at` is null. `markArrived` sets `arrived_at` and `status = 'arrived'` together. Accept the guard `status = 'arrived'` on both arrival lines all the same: it costs one condition and keeps a bad row from going into a total that can never be corrected.

1.4 A not_eligible visit with CTAS 4 or 5 counts in both columns. Reject as a fault: it is on purpose. SPEC: "Offered (percentage): visits with offered_at today, divided by visits triaged today as CTAS 4 or 5 minus those marked not_eligible." The subtraction works only if not_eligible visits are inside the CTAS 4 or 5 count. In the app they always are: `applyTriage` sets `ctas_level` (4 or 5) before it sets `not_eligible`. But the point found a real fault in the check file: 5D and 5P have no CTAS, which the app never makes. Accept: give 5D and 5P a CTAS level, and change the expected D1 total to 5.

1.5 Missing event times drop a count; use `created_at` as a fallback. Reject. In the app each closing status sets its time in the same update (`applyTriage`, `markRemoved`, `confirmUnableToReach`), and the survey is allowed only after the visit is closed. A guessed date would put a number on a day it did not happen. A database check that each status has its time is in the later item 2 (step checks in the database).

1.6 Visits still open at 24 hours have no outcome. Reject for now (not a SPEC number). Same owner choice as 1.1 and 1.2.

2 Time zones. Accept. All time columns on `visits` are `timestamptz` (checked in 20261110060756_tables_and_security.sql). Add one EDT summer visit to the check.

3.1 `search_path = ''` breaks the signal trigger. Reject the main claim: `touch_change_signal()` writes `public.change_signal` with the schema name and has its own `set search_path = ''`. The second part is correct: `visits_changed` is a statement trigger, so an empty delete every 15 minutes touches `change_signal` and makes every open staff and patient screen read again, 96 times a day. Cost is small but it is waste. Transition tables cannot go on a trigger that has more than one event, so the simple fix is a guard in the function: do nothing when no visit is old enough. See the owner choice.

3.2 A null or bad `site` or `is_demo` stops the clean-up. No change: `visits.site` is `not null` with check A or B, and `is_demo` is `not null default false`.

3.3 A foreign key to `visits` blocks the delete. No change: no migration has a `references` clause (searched all of supabase/migrations).

3.4 Types and duplicate keys. No change; Gemini agrees it is correct.

3.5 Two runs at the same time can deadlock. Low risk: one run takes milliseconds and the job runs every 15 minutes. `order by` in an insert does not promise the lock order. An advisory lock is the real fix and fits in the same guard as 3.1. See the owner choice.

4.1 `service_role` can run `delete_old_visits()`. Accept: add `service_role` to the revoke. The app does not use `service_role` for this.

4.2 pg_cron fails on a local CLI database, and `cron.job_run_details` grows. Reject the first part: this project has no local CLI database; migrations run in the SQL Editor on the hosted project, where `pg_cron` 1.6.4 is available. The second part is correct but small (96 rows a day). Optional, see the owner choice.

5.1 No asserts. Accept: a `do` block with `raise exception` for each expected number, so a wrong number stops the run with a message.

5.2 No score 9. Accept: add one visit with score 9 and one with score 8.

5.3 5P is not checked in `daily_stats`. Accept: the `do` block reads the real-date row before and after and checks that it went up by one.

5.4 Missing cases. Accept the `left` visit, the second run (must change nothing) and the EDT visit. Reject the reopened-arrival case: the app cannot make it (see 1.3).

6.1 `daily_stats` alone shows 0 for today. Correct, and SPEC hard rule 4 already says "The dashboard shows a day as its daily_stats totals plus the visits still in the visits table." Note for Phase 4.

6.1 Reader confusion (declined inside offered, home cohort on the created date). Note for the Phase 4 metric check; the column comments already give the date each number counts on.

6.2 One `lateral` pass instead of 13 `union all` lines. Reject: the delete runs every 15 minutes on a few rows, so speed does not matter, and one line per number is easier for a beginner to read. The shared view for Phase 4 is a good idea; note it for the Phase 4 dashboard.

Owner choices before the migration runs:
- A. The 1.1, 1.2 and 1.6 totals (all arrivals, removed as left, still open at deletion). They are not SPEC numbers, but once a visit is deleted they cannot be added back.
- B. The 3.1 and 3.5 guard (do nothing when no visit is old enough, and skip when another run holds the lock). It needs the function in `plpgsql`.
- C. A clean-up of `cron.job_run_details` older than 7 days.

## Outcome (2026-11-16)

The owner chose A, B and C. Save points: `fc89253` (check file with asserts, the 3 new totals, the EDT visit, scores 9 and 8, a `left` removal and a second run), `4344542` (migration).

Checked in this session:
- The owner ran the migration in the SQL Editor (result: `schedule 2`) and then the whole check file. The 5 rows were the same as the expected numbers, and no assert stopped the run.
- `cron.job` has `delete-old-visits` (`*/15 * * * *`) and `delete-old-cron-logs` (`0 3 * * *`), both active.
- `delete_old_visits()`: `anon`, `authenticated` and `service_role` cannot run it; `postgres` can.
- Rights of `anon` and `authenticated` (with `has_table_privilege` and `has_function_privilege`): the same as the expected list in `supabase/checks/permissions.sql`. No public table is without row-level security.

Not checked: a successful run in `cron.job_run_details` (none yet when checked), and a real visit deleted after 24 hours on the live database.
