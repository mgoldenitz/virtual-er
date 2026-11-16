-- Readiness review 2026-11-16, task 1: a fairer wait estimate on the patient's phone.
-- get_patient_visit changes in one part only, average_gap_minutes:
-- 1. Distinct call-back moments only. "Recall all" is one database update, so the trigger gives
--    every recalled visit the same called_at. Before, each of them counted as a gap of 0 minutes.
--    Now one "Recall all" counts as one moment.
-- 2. Only call-backs of the last 3 hours count, so a quiet night does not use old numbers.
-- 3. With fewer than 2 distinct moments the value is null, as before. The phone then uses
--    15 minutes per place, and never less than 5 minutes per place (lib/patientViewFromRow.ts).
-- The returned columns do not change, so "create or replace" keeps the function and its rights.

create or replace function public.get_patient_visit(p_token text)
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
  triaged_at timestamptz
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
    me.triaged_at
  from public.visits me
  where me.access_token = p_token;
$$;
