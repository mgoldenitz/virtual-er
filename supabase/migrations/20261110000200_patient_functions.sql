-- Phase 2, part 2: everything a patient's phone may do, each as one narrow function
-- (hard rule 5). A phone proves which visit is its own only with the long access token.
-- These functions run with the table owner's rights ("security definer"), so they can
-- reach the visits table that patients cannot, and they return or change only what
-- the rule allows. Each mirrors a rule in lib/ (named in its comment).

-- ---------------------------------------------------------------------------
-- Read my visit: the patient-safe fields only (lib/patientView.ts PatientView).
-- Place in line counts patients still waiting at the same site who were triaged earlier
-- (ties broken by id, like lib/queue.ts). The wait range itself is worked out in
-- lib/queue.ts from place_in_line and average_gap_minutes, so that rule stays tested.
-- ---------------------------------------------------------------------------
create function public.get_patient_visit(p_token text)
returns table (
  code text,
  site text,
  language text,
  status text,
  place_in_line integer,
  -- Average minutes between the last 5 call-backs at this site; null with under 2 call-backs.
  average_gap_minutes double precision,
  called_at timestamptz,
  last_still_here_at timestamptz,
  seen boolean,
  closed boolean,
  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
  expired boolean
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
        then extract(epoch from max(last6.called_at) - min(last6.called_at)) / 60 / (count(*) - 1)
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
      and me.created_at <= now() - interval '6 hours'
  from public.visits me
  where me.access_token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- The called screen was shown: sets seen_at once, only while called (lib markSeen).
-- Returns true if it was recorded, false if the step is not allowed now.
-- ---------------------------------------------------------------------------
create function public.record_seen(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set seen_at = now()
  where access_token = p_token and status = 'called' and seen_at is null;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- "I'm on my way": only while called (lib confirmOnMyWay).
-- ---------------------------------------------------------------------------
create function public.confirm_on_my_way(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set status = 'on_the_way', confirmed_at = now()
  where access_token = p_token and status = 'called';
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- Start a visit from home. Only the app's server route may call this (it holds the
-- server-only key); browsers cannot. The function itself sets source = home and
-- status = pre_arrival, so it never grants a place in line (hard rule 7).
-- The server route makes the code and token with lib/codes.ts and retries on "taken".
-- Returns: saved, paused (off-site waiting is paused at this site), busy (too many
-- starts at this site in the last minute), or taken (code or token already used).
-- ---------------------------------------------------------------------------
create function public.start_home_visit(p_site text, p_language text, p_code text, p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.site_settings where site = p_site and offsite_paused) then
    return 'paused';
  end if;
  -- A demo-sized cap for the whole site. A per-device limit is added on Vercel.
  if (select count(*) from public.visits
      where site = p_site and source = 'home' and created_at > now() - interval '1 minute') >= 30 then
    return 'busy';
  end if;
  insert into public.visits (code, access_token, site, source, language, status)
  values (p_code, p_token, p_site, 'home', p_language, 'pre_arrival');
  return 'saved';
exception
  when unique_violation then
    return 'taken';
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what. New functions are callable by everyone unless this is done.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;
revoke execute on function public.record_seen(text) from public, anon, authenticated;
revoke execute on function public.confirm_on_my_way(text) from public, anon, authenticated;
revoke execute on function public.start_home_visit(text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_patient_visit(text) to anon, authenticated;
grant execute on function public.record_seen(text) to anon, authenticated;
grant execute on function public.confirm_on_my_way(text) to anon, authenticated;
grant execute on function public.start_home_visit(text, text, text, text) to service_role;
