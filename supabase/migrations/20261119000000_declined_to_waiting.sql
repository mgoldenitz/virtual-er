-- Declined patients can switch to off-site waiting (owner, 2026-11-19). It replaces
-- visits_check_step from 20261117010000_step_check_fixes.sql with two changes:
-- 1. A new allowed move: declined to waiting. A patient who said no at triage changes their
--    mind and staff switch them (lib/switchToOffsite.ts). They keep their original triage
--    time, so their place in line.
-- 2. That move starts off-site waiting, so the pause check refuses it while the site is paused,
--    like a triage into waiting.
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
        ('waiting', 'called'), ('waiting', 'arrived'), ('waiting', 'removed'),
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
