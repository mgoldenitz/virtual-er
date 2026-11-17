-- Two small fixes after the Gemini review of 20261116100000_daily_stats_and_cleanup.sql
-- (handoffs/2026-11-16-gemini-review-daily-stats-fixes.md). That migration has already run, so
-- this one changes the function and the log job in place; it does not edit the old file.
-- Check: supabase/checks/daily_stats.sql (run the whole file after this migration).

-- 1. The lock key. The one-key form shares its keys with every other one-key advisory lock;
-- start_home_visit uses that form. The two-key form is a separate key space, so the two can
-- never block each other. The rest of the function is the same as before.
-- "create or replace" keeps the function's owner and rights; the revoke below repeats them.
create or replace function public.delete_old_visits()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not pg_try_advisory_xact_lock(hashtext('virtual_er'), hashtext('delete_old_visits')) then
    return;
  end if;
  if not exists (select 1 from public.visits where created_at < now() - interval '24 hours') then
    return;
  end if;

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
      where status = 'arrived' and called_at is not null and arrived_at is not null
    union all
    select site, is_demo, arrived_at, 'call_to_arrival_seconds',
           round(extract(epoch from arrived_at - called_at))::bigint from gone
      where status = 'arrived' and called_at is not null and arrived_at is not null
    union all
    select site, is_demo, arrived_at, 'arrived', 1 from gone
      where status = 'arrived' and arrived_at is not null
    union all
    select site, is_demo, closed_at, 'removed_left', 1 from gone
      where status = 'removed' and removed_reason = 'left' and closed_at is not null
    union all
    select site, is_demo, triaged_at, 'open_at_deletion', 1 from gone
      where status in ('waiting', 'called', 'on_the_way', 'needs_reassessment') and triaged_at is not null
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
      coalesce(sum(amount) filter (where metric = 'arrived'), 0) as arrived,
      coalesce(sum(amount) filter (where metric = 'no_shows'), 0) as no_shows,
      coalesce(sum(amount) filter (where metric = 'removed_left'), 0) as removed_left,
      coalesce(sum(amount) filter (where metric = 'unable_to_reach'), 0) as unable_to_reach,
      coalesce(sum(amount) filter (where metric = 'open_at_deletion'), 0) as open_at_deletion,
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
    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
    open_at_deletion,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10
  )
  select day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
    open_at_deletion,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10
  from totals
  on conflict (day, site, is_demo) do update set
    triaged_ctas_4_5 = s.triaged_ctas_4_5 + excluded.triaged_ctas_4_5,
    not_eligible = s.not_eligible + excluded.not_eligible,
    offered = s.offered + excluded.offered,
    declined = s.declined + excluded.declined,
    called_and_arrived = s.called_and_arrived + excluded.called_and_arrived,
    call_to_arrival_seconds = s.call_to_arrival_seconds + excluded.call_to_arrival_seconds,
    arrived = s.arrived + excluded.arrived,
    no_shows = s.no_shows + excluded.no_shows,
    removed_left = s.removed_left + excluded.removed_left,
    unable_to_reach = s.unable_to_reach + excluded.unable_to_reach,
    open_at_deletion = s.open_at_deletion + excluded.open_at_deletion,
    started_from_home = s.started_from_home + excluded.started_from_home,
    home_reached_triage = s.home_reached_triage + excluded.home_reached_triage,
    survey_responses = s.survey_responses + excluded.survey_responses,
    survey_score_sum = s.survey_score_sum + excluded.survey_score_sum,
    survey_9_or_10 = s.survey_9_or_10 + excluded.survey_9_or_10;
end;
$$;

revoke execute on function public.delete_old_visits() from public, anon, authenticated, service_role;

-- 2. The log clean-up. A run that stops before its end (a crash or a restart) keeps
-- end_time null forever, and "null < a time" is never true, so the old rule never deleted
-- those rows. A schedule with the same name changes the job; it does not add a second one.
select cron.schedule('delete-old-cron-logs', '0 3 * * *',
  $$delete from cron.job_run_details where coalesce(end_time, start_time) < now() - interval '7 days'$$);
