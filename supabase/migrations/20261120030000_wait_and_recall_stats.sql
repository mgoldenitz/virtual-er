-- Adds the recall and wait numbers to the 24-hour clean-up: how many visits were recalled,
-- how long they waited from offer to recall, and how the waits fall into four bands.
-- This migration changes delete_old_visits() in place; it does not edit the old migration files.
-- Check: supabase/checks/daily_stats.sql (run the whole file after this migration).

-- 1. The new columns. Each one is a total per day, site and demo flag, like the others.
alter table public.daily_stats
  add column called integer not null default 0,                   -- visits recalled (called_at and offered_at set), on called_at
  add column offer_to_call_seconds bigint not null default 0,     -- sum of called_at minus offered_at for those visits; divide by called
  add column wait_under_30 integer not null default 0,            -- those visits, under 30 whole minutes
  add column wait_30_to_59 integer not null default 0,            -- those visits, 30 to 59 whole minutes
  add column wait_60_to_119 integer not null default 0,           -- those visits, 60 to 119 whole minutes
  add column wait_120_plus integer not null default 0;            -- those visits, 120 whole minutes or more

-- 2. The clean-up function. The body is the same as before, with the new events and columns added.
-- The wait bands round the wait to whole seconds first, then to whole minutes. The app does the same.
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
    union all
    select site, is_demo, called_at, 'called', 1 from gone
      where called_at is not null and offered_at is not null
    union all
    select site, is_demo, called_at, 'offer_to_call_seconds',
           round(extract(epoch from called_at - offered_at))::bigint from gone
      where called_at is not null and offered_at is not null
    union all
    select site, is_demo, called_at, 'wait_under_30', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) < 30
    union all
    select site, is_demo, called_at, 'wait_30_to_59', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) between 30 and 59
    union all
    select site, is_demo, called_at, 'wait_60_to_119', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) between 60 and 119
    union all
    select site, is_demo, called_at, 'wait_120_plus', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) >= 120
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
      coalesce(sum(amount) filter (where metric = 'survey_9_or_10'), 0) as survey_9_or_10,
      coalesce(sum(amount) filter (where metric = 'called'), 0) as called,
      coalesce(sum(amount) filter (where metric = 'offer_to_call_seconds'), 0) as offer_to_call_seconds,
      coalesce(sum(amount) filter (where metric = 'wait_under_30'), 0) as wait_under_30,
      coalesce(sum(amount) filter (where metric = 'wait_30_to_59'), 0) as wait_30_to_59,
      coalesce(sum(amount) filter (where metric = 'wait_60_to_119'), 0) as wait_60_to_119,
      coalesce(sum(amount) filter (where metric = 'wait_120_plus'), 0) as wait_120_plus
    from events
    group by 1, 2, 3
  )
  -- A day already in daily_stats gets the new numbers added to it, never replaced.
  insert into public.daily_stats as s (
    day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
    open_at_deletion,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10,
    called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus
  )
  select day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
    open_at_deletion,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10,
    called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus
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
    survey_9_or_10 = s.survey_9_or_10 + excluded.survey_9_or_10,
    called = s.called + excluded.called,
    offer_to_call_seconds = s.offer_to_call_seconds + excluded.offer_to_call_seconds,
    wait_under_30 = s.wait_under_30 + excluded.wait_under_30,
    wait_30_to_59 = s.wait_30_to_59 + excluded.wait_30_to_59,
    wait_60_to_119 = s.wait_60_to_119 + excluded.wait_60_to_119,
    wait_120_plus = s.wait_120_plus + excluded.wait_120_plus;
end;
$$;

-- Only the cron job (and the owner in the SQL Editor) runs it; patients, staff and the
-- service key cannot.
revoke execute on function public.delete_old_visits() from public, anon, authenticated, service_role;
