-- Phase 5 fix (Phase 5 code review, fault 1, 2026-11-21): the patient phone needs offered_at to
-- tell a switch from declined to off-site waiting apart from a real "I'm still here" tap. A switch
-- stamps offered_at and last_still_here_at with the same moment, so without offered_at the phone
-- would show "Thank you." with no tap. lib/stillHere.ts uses offered_at for this.
-- 1. get_patient_visit gets one new column, offered_at. The function is dropped and made again,
-- because a new column changes its return type, and its rights are given again below.
-- 2. delete_old_visits counts "offered" and "declined" on the triage day (fault 2), further down.

-- ---------------------------------------------------------------------------
-- The patient read, as in 20261120000000_survey.sql, plus offered_at.
-- ---------------------------------------------------------------------------
drop function public.get_patient_visit(text);

create function public.get_patient_visit(p_token text)
returns table (
  code text,
  site text,
  language text,
  status text,
  place_in_line integer,
  -- Average minutes between the last 6 distinct call-back moments of the last 3 hours at this
  -- site, rounded to whole minutes so it cannot be used to work out exactly when other patients
  -- were called. Null with fewer than 2 distinct moments.
  average_gap_minutes integer,
  called_at timestamptz,
  last_still_here_at timestamptz,
  seen boolean,
  closed boolean,
  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
  expired boolean,
  -- When this visit was triaged (the start of off-site waiting).
  triaged_at timestamptz,
  -- When staff offered off-site waiting. A switch from declined sets it to the switch moment.
  offered_at timestamptz,
  -- True once the survey score is saved (lib/survey.ts). The score itself is not sent.
  survey_done boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    me.code,
    me.site,
    me.language,
    me.status,
    case when me.status = 'waiting' and me.triaged_at is not null then (
      select count(*)::integer + 1
      from public.visits other
      where other.site = me.site
        and other.status = 'waiting'
        and other.triaged_at is not null
        and (other.triaged_at, other.id) < (me.triaged_at, me.id)
    ) end,
    case when me.status = 'waiting' then (
      -- The average of the gaps between 6 moments is (last - first) / 5.
      select case when count(*) >= 2
        then round(extract(epoch from max(moments.called_at) - min(moments.called_at)) / 60 / (count(*) - 1))::integer
      end
      from (
        select distinct other.called_at
        from public.visits other
        where other.site = me.site
          and other.called_at is not null
          and other.called_at >= now() - interval '3 hours'
        order by other.called_at desc
        limit 6
      ) moments
    ) end,
    me.called_at,
    me.last_still_here_at,
    me.seen_at is not null,
    me.closed_at is not null,
    me.status = 'pre_arrival' and me.triaged_at is null
      and me.created_at <= now() - interval '6 hours',
    me.triaged_at,
    me.offered_at,
    me.survey_score is not null
  from public.visits me
  where me.access_token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- Rights: patients (anon) and signed-in users reach this only with a visit's token.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;

grant execute on function public.get_patient_visit(text) to anon, authenticated;

-- 2. The nightly clean-up (Phase 5 code review, fault 2, 2026-11-21). "offered" and "declined"
-- now count on the triage day, as lib/dashboardNumbers.ts does, so a visit switched the day after
-- triage never adds an offer to a day with no triage for it. The rest is the same as in
-- 20261116110000_lock_key_and_cron_log_fix.sql. Check: supabase/checks/daily_stats.sql.
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
    select site, is_demo, triaged_at, 'offered', 1 from gone
      where offered_at is not null and triaged_at is not null
    union all
    select site, is_demo, triaged_at, 'declined', 1 from gone
      where status = 'declined' and offered_at is not null and triaged_at is not null
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
