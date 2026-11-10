-- Phase 2, part 3 (after Gemini 3.1 Pro's review of the storage plan):
-- 1. A version number on each visit that goes up on every change, so a staff screen working
--    from an older copy of a visit cannot overwrite a newer change (the app saves only
--    "where version = the version I read").
-- 2. The database's clock sets every time, never a device's clock, so a laptop with a wrong
--    clock cannot put patients in the wrong place in line.

alter table public.visits add column version integer not null default 1;

-- Runs before every insert and update of a visit.
-- Any time that is newly filled in is replaced with now(); a time cleared to empty (Undo)
-- stays empty. followup_paused_until is a time in the future, so it is left as given.
create function public.visits_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.created_at := now();
    if new.triaged_at is not null then new.triaged_at := now(); end if;
    if new.offered_at is not null then new.offered_at := now(); end if;
    if new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
    if new.called_at is not null then new.called_at := now(); end if;
    if new.seen_at is not null then new.seen_at := now(); end if;
    if new.confirmed_at is not null then new.confirmed_at := now(); end if;
    if new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
    if new.arrived_at is not null then new.arrived_at := now(); end if;
    if new.closed_at is not null then new.closed_at := now(); end if;
  else
    new.version := old.version + 1;
    new.created_at := old.created_at;
    if new.triaged_at is distinct from old.triaged_at and new.triaged_at is not null then new.triaged_at := now(); end if;
    if new.offered_at is distinct from old.offered_at and new.offered_at is not null then new.offered_at := now(); end if;
    if new.last_still_here_at is distinct from old.last_still_here_at and new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
    if new.called_at is distinct from old.called_at and new.called_at is not null then new.called_at := now(); end if;
    if new.seen_at is distinct from old.seen_at and new.seen_at is not null then new.seen_at := now(); end if;
    if new.confirmed_at is distinct from old.confirmed_at and new.confirmed_at is not null then new.confirmed_at := now(); end if;
    if new.review_flagged_at is distinct from old.review_flagged_at and new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
    if new.arrived_at is distinct from old.arrived_at and new.arrived_at is not null then new.arrived_at := now(); end if;
    if new.closed_at is distinct from old.closed_at and new.closed_at is not null then new.closed_at := now(); end if;
  end if;
  return new;
end;
$$;

-- Only the trigger runs it; nobody can call it directly.
revoke execute on function public.visits_before_write() from public, anon, authenticated;

create trigger visits_before_write
  before insert or update on public.visits
  for each row execute function public.visits_before_write();
