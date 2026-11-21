-- Phase 5 fix (Phase 5 code review, fault 1, 2026-11-21): the patient phone needs offered_at to
-- tell a switch from declined to off-site waiting apart from a real "I'm still here" tap. A switch
-- stamps offered_at and last_still_here_at with the same moment, so without offered_at the phone
-- would show "Thank you." with no tap. lib/stillHere.ts uses offered_at for this.
-- This changes only get_patient_visit: one new column, offered_at. The function is dropped and
-- made again, because a new column changes its return type, and its rights are given again below.

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
