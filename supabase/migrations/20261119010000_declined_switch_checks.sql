-- Fixes from the Gemini review of the declined switch (handoff 2026-11-19, points 3.1, 3.2 and
-- 5.1). It replaces visits_check_step from 20261119000000_declined_to_waiting.sql:
-- 1. The database now holds the switch rules the app holds (lib/switchToOffsite.ts): declined to
--    waiting only within 6 hours of declining, only for a triaged visit, and only with closed_at
--    cleared.
-- 2. A new move, waiting to declined: Undo a switch made by mistake. Only for a visit that was
--    switched (offered_at after triaged_at; a normal check-in sets both in the same moment),
--    only before the recall (called_at empty), and closed_at must be set again.
-- Everything else is copied unchanged. lib/allowedSteps.test.ts reads the newest migration that
-- makes this function, so it now checks this file.
-- Run it once in the Supabase SQL Editor. Check: supabase/checks/allowed_steps.sql (every row ok,
-- no error at the end).

create or replace function public.visits_check_step()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  site_paused boolean;
begin
  if tg_op = 'INSERT' then
    -- A new visit starts at the desk after triage, or from home (start_home_visit).
    if new.status not in ('pre_arrival', 'waiting', 'declined', 'not_eligible') then
      raise exception 'A new visit cannot start as %', new.status using errcode = 'VWR01';
    end if;
  else
    -- A visit stays at the site where it started.
    if new.site is distinct from old.site then
      raise exception 'A visit cannot change site from % to %', old.site, new.site using errcode = 'VWR01';
    end if;
    if new.status is distinct from old.status then
      -- allowed moves (keep the same as lib/allowedSteps.ts)
      if (old.status, new.status) not in (
        ('pre_arrival', 'waiting'), ('pre_arrival', 'declined'), ('pre_arrival', 'not_eligible'),
        ('needs_reassessment', 'waiting'), ('needs_reassessment', 'declined'), ('needs_reassessment', 'not_eligible'),
        ('waiting', 'called'), ('waiting', 'arrived'), ('waiting', 'removed'), ('waiting', 'declined'),
        ('called', 'on_the_way'), ('called', 'arrived'), ('called', 'removed'), ('called', 'unable_to_reach'),
        ('on_the_way', 'arrived'), ('on_the_way', 'removed'),
        ('unable_to_reach', 'needs_reassessment'),
        ('arrived', 'waiting'), ('arrived', 'called'), ('arrived', 'on_the_way'),
        ('removed', 'waiting'), ('removed', 'called'), ('removed', 'on_the_way'),
        ('declined', 'waiting')
      ) -- end of allowed moves
      then
        raise exception 'A visit cannot move from % to %', old.status, new.status using errcode = 'VWR01';
      end if;
      -- A declined patient switches to off-site waiting (keep the same as lib/switchToOffsite.ts).
      if old.status = 'declined' and new.status = 'waiting'
         and (old.triaged_at is null or old.closed_at is null
              or old.closed_at <= now() - interval '6 hours' or new.closed_at is not null) then
        raise exception 'This declined visit cannot switch to off-site waiting' using errcode = 'VWR01';
      end if;
      -- Undo a switch: only a switched visit, only before the recall.
      if old.status = 'waiting' and new.status = 'declined'
         and (old.called_at is not null or new.called_at is not null
              or old.offered_at is null or old.triaged_at is null or old.offered_at <= old.triaged_at
              or new.closed_at is null) then
        raise exception 'Only a switch that is not recalled yet can be undone' using errcode = 'VWR01';
      end if;
    end if;
  end if;

  -- No new start of off-site waiting while the site is paused: a new visit that waits off-site,
  -- a triage that puts a visit in the line, or a declined patient who switches to off-site.
  -- Undo back to waiting stays allowed, because that patient was already waiting off-site
  -- before the closure.
  if new.status = 'waiting'
     and (tg_op = 'INSERT' or old.status in ('pre_arrival', 'needs_reassessment', 'declined')) then
    select offsite_paused into site_paused from public.site_settings where site = new.site for share;
    if site_paused is distinct from false then
      raise exception 'Off-site waiting is paused at site %', new.site using errcode = 'VWR02';
    end if;
  end if;
  return new;
end;
$$;

-- Only the trigger runs it; nobody can call it directly. "create or replace" keeps this, but it
-- is repeated here so the file is complete on its own.
revoke execute on function public.visits_check_step() from public, anon, authenticated;
