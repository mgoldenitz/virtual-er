-- Phase 3: the database checks the allowed steps, not only the app (owner, 2026-11-10 and
-- 2026-11-16). Staff screens save changes straight to the visits table, so until now a buggy
-- screen could make an impossible change, for example pre_arrival to arrived.
-- 1. A new trigger, visits_check_step, refuses a status move that is not in the list below,
--    and a start of off-site waiting while the site is paused (pause review 2026-11-12, item 1).
--    The list is the same as ALLOWED_MOVES in lib/allowedSteps.ts; lib/allowedSteps.test.ts
--    reads this file and fails if the two lists differ. Time rules (the phone steps after a
--    recall) stay in the app, because their minutes live in lib/demoTimes.ts.
-- 2. confirm_on_my_way also fills seen_at when it is empty: the tap needs the called screen,
--    so the screen was shown even if record_seen did not reach the database.
-- A refused change raises error code VWR01. data/staffActions.ts changeVisit treats it as
-- "refused" and reloads the list; a refused desk check-in (createDeskVisit) shows "not saved".
-- The 24-hour clean-up only deletes visits, so this trigger does not touch it.

create function public.visits_check_step()
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
  elsif new.status is distinct from old.status then
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

  -- No new start of off-site waiting while the site is paused: a new visit that waits off-site,
  -- or a triage that puts a visit in the line. Undo back to waiting stays allowed, because that
  -- patient was already waiting off-site before the closure.
  if new.status = 'waiting'
     and (tg_op = 'INSERT' or old.status in ('pre_arrival', 'needs_reassessment')) then
    select offsite_paused into site_paused from public.site_settings where site = new.site;
    if coalesce(site_paused, false) then
      raise exception 'Off-site waiting is paused at site %', new.site using errcode = 'VWR01';
    end if;
  end if;
  return new;
end;
$$;

-- Only the trigger runs it; nobody can call it directly.
revoke execute on function public.visits_check_step() from public, anon, authenticated;

create trigger visits_check_step
  before insert or update on public.visits
  for each row execute function public.visits_check_step();

-- ---------------------------------------------------------------------------
-- "I'm on my way": only while called (lib confirmOnMyWay). Now also fills seen_at if it is empty.
-- Same name and inputs, so "create or replace" keeps who may call it.
-- ---------------------------------------------------------------------------
create or replace function public.confirm_on_my_way(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set status = 'on_the_way', confirmed_at = now(), seen_at = coalesce(seen_at, now())
  where access_token = p_token and status = 'called';
  return found;
end;
$$;
