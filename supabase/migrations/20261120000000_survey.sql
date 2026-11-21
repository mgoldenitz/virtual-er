-- Phase 5, the survey (SPEC line 69 and hard rule 5): the patient may submit the survey score
-- once, only after the visit is closed, and only if the visit waited off-site and arrived.
-- 1. New function submit_survey(token, score). "Arrived" can come only from waiting, called or
--    on_the_way (visits_check_step), so every arrived visit waited off-site.
--    The step trigger checks only status moves and the site, so this update (same status) passes.
-- 2. get_patient_visit gets one new column, survey_done (true once a score is saved). The phone
--    never gets the score itself back. A new column changes the return type, so the function is
--    dropped and made again, and its rights are given again below.
-- Undo of an arrival keeps the score (owner decision 2026-11-20), so a second arrival shows
-- "Thank you for your feedback." and no second survey.

-- ---------------------------------------------------------------------------
-- Submit the survey score: once, only for a closed visit that arrived, 0 to 10.
-- Returns true when the score was saved, false when it was refused.
-- ---------------------------------------------------------------------------
create function public.submit_survey(p_token text, p_score integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set survey_score = p_score
  where access_token = p_token
    and status = 'arrived'
    and closed_at is not null
    and survey_score is null
    and p_score between 0 and 10;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- The patient read, as in 20261116000000_wait_gap_distinct_moments.sql, plus survey_done.
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
    me.survey_score is not null
  from public.visits me
  where me.access_token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- Rights: patients (anon) and signed-in users reach these only with a visit's token.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;
revoke execute on function public.submit_survey(text, integer) from public, anon, authenticated;

grant execute on function public.get_patient_visit(text) to anon, authenticated;
grant execute on function public.submit_survey(text, integer) to anon, authenticated;
