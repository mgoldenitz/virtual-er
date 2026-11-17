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
