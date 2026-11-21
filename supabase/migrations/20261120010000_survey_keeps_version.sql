-- Phase 5, the survey: a change to survey_score alone does not raise the visit's version.
-- Why: a staff action saves only "where version = the version I read" (data/staffActions.ts).
-- The patient answers the survey at the desk, and staff may press Undo seconds later, before
-- their screen reads the visit again. With a new version, that Undo was refused once
-- ("it changed since it was closed"). Staff never see or change the score, so it cannot
-- conflict with a staff action (owner decision 2026-11-20, "Score keeps version").
-- Every other change still raises the version (supabase/checks/survey.sql, case 13).
-- The body is the same as in 20261110090134_visit_version_and_database_times.sql, except the
-- version line of the update branch. "create or replace" keeps the trigger.

create or replace function public.visits_before_write()
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
    -- The whole row, without the score and the version: the same means only the score changed.
    if (to_jsonb(new) - 'survey_score' - 'version') = (to_jsonb(old) - 'survey_score' - 'version') then
      new.version := old.version;
    else
      new.version := old.version + 1;
    end if;
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
revoke execute on function public.visits_before_write() from public, anon, authenticated;
