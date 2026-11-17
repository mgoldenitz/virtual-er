-- Phase 3: fixes from the Gemini review of the step checks (handoff 2026-11-16, points 2, 5, 6,
-- 8 and 16). It replaces visits_check_step from 20261117000000_allowed_steps.sql:
-- 1. A visit cannot change site. Before, a waiting visit could move to a paused site, or a
--    visit could leave its site's line without a status change.
-- 2. The pause read waits for a pause that another staff member is saving at that moment
--    ("for share"). "for key share" would not wait, because a pause is a non-key update.
-- 3. If the site has no settings row, or the value is empty, the check treats it as paused
--    (fail closed).
-- 4. A pause refusal now raises VWR02, so the staff screen can say why. A bad move or a change
--    of site still raises VWR01 (lib/saveResult.ts turns these codes into what staff see).
-- The move list is copied unchanged. lib/allowedSteps.test.ts reads the newest migration that
-- makes this function, so it now checks this file.
-- Check: supabase/checks/allowed_steps.sql (every row ok, no error at the end).

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
        ('removed', 'waiting'), ('removed', 'called'), ('removed', 'on_the_way')
      ) -- end of allowed moves
      then
        raise exception 'A visit cannot move from % to %', old.status, new.status using errcode = 'VWR01';
      end if;
    end if;
  end if;

  -- No new start of off-site waiting while the site is paused: a new visit that waits off-site,
  -- or a triage that puts a visit in the line. Undo back to waiting stays allowed, because that
  -- patient was already waiting off-site before the closure.
  if new.status = 'waiting'
     and (tg_op = 'INSERT' or old.status in ('pre_arrival', 'needs_reassessment')) then
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
