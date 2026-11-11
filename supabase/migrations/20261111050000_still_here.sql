-- Phase 3: the "I'm still here" tap (SPEC /patient and hard rule 5).
-- 1. A new patient function, record_still_here: the phone's tap sets last_still_here_at,
--    only while the visit is waiting off-site. The existing trigger puts in the database's
--    own time, raises the version and touches the change signal.
-- 2. get_patient_visit also returns triaged_at, the visit's own triage time, so the phone
--    knows when the first prompt is due (lib/stillHere.ts). It shows only this visit's time.
-- A function's list of returned columns cannot be changed in place, so it is dropped and
-- made again (same body plus one column), and its rights are given again below.

drop function public.get_patient_visit(text);

create function public.get_patient_visit(p_token text)
returns table (
  code text,
  site text,
  language text,
  status text,
  place_in_line integer,
  -- Average minutes between the last 5 call-backs at this site, rounded to whole minutes
  -- so it cannot be used to work out exactly when other patients were called.
  -- Null with under 2 call-backs.
  average_gap_minutes integer,
  called_at timestamptz,
  last_still_here_at timestamptz,
  seen boolean,
  closed boolean,
  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
  expired boolean,
  -- New: when this visit was triaged (the start of off-site waiting).
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
      -- The average of the gaps between 6 call-backs is (last - first) / 5.
      select case when count(*) >= 2
        then round(extract(epoch from max(last6.called_at) - min(last6.called_at)) / 60 / (count(*) - 1))::integer
      end
      from (
        select other.called_at
        from public.visits other
        where other.site = me.site and other.called_at is not null
        order by other.called_at desc
        limit 6
      ) last6
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

-- ---------------------------------------------------------------------------
-- "I'm still here": only while waiting off-site (lib/stillHere.ts).
-- It only tells staff the patient is still following the visit; it is not a reassessment.
-- Returns true if it was recorded, false if the step is not allowed now.
-- ---------------------------------------------------------------------------
create function public.record_still_here(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set last_still_here_at = now()
  where access_token = p_token and status = 'waiting';
  return found;
end;
$$;

-- Who may call what. New functions are callable by everyone unless this is done.
revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;
revoke execute on function public.record_still_here(text) from public, anon, authenticated;

grant execute on function public.get_patient_visit(text) to anon, authenticated;
grant execute on function public.record_still_here(text) to anon, authenticated;
