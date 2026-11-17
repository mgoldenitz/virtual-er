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
