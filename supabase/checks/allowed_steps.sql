-- Check for the allowed steps (migrations 20261117000000_allowed_steps.sql and
-- 20261117010000_step_check_fixes.sql).
-- Run the whole file at once in the Supabase SQL Editor, after those migrations. It saves nothing:
-- everything happens inside "begin ... rollback", so the synthetic visits and the paused site
-- come back as they were.
-- It shows 49 rows. In each row, got must be the same as expected, and ok must be true.
-- If any row is not ok, the last block stops with an error that names those rows.
-- got is 'saved' (the database took it), 'refused' (error VWR01: not an allowed move, or a
-- change of site) or 'paused' (error VWR02: it would start off-site waiting at a paused site).
-- The visits (codes ZZZZ7x and ZZZZ8x, so no real visit is touched):
--   7A  desk, waiting: recall, a move back that is refused, I'm on my way, arrived, Undo
--   7B  desk, waiting, recalled, seen_at set to 2000-01-01: I'm on my way keeps that seen_at
--   7C  desk, declined: cannot join the line later
--   7D  desk, waiting, recalled: unable to reach, reopen, and triage while paused
--   7E  home, pre_arrival: triage while paused
--   7F  desk, waiting while paused: refused
--   7G  desk, called at the start: refused
--   7H  desk, waiting at site B: cannot move to paused site A
--   7J  desk, arrived before the pause: Undo to waiting while paused
--   7K  desk, waiting: "I'm still here" while paused
--   7M  desk, waiting at site B while site A is paused
--   7N  desk, waiting at site B after site B's settings row is deleted: counts as paused
--   8x  one visit for each of the 22 allowed moves (rows 101 to 122)

begin;

-- If the last block stops with an error, the "rollback" line does not run and the transaction
-- can stay open with locks on site_settings and visits. This timeout makes Postgres end such a
-- session after 10 seconds, which undoes everything and frees the locks. "set local" ends with
-- this transaction (on rollback or on an error), so no setting stays on a shared connection.
set local idle_in_transaction_session_timeout = '10s';

-- Tries one change. Any other error stops the whole run (and still saves nothing).
create function pg_temp.try_step(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'saved';
exception
  when sqlstate 'VWR01' then return 'refused';
  when sqlstate 'VWR02' then return 'paused';
end;
$$;

create temp table results (n integer, what text, got text, expected text);

-- Make sure neither site is paused for the first part.
update public.site_settings set offsite_paused = false where site in ('A', 'B');

insert into results select 1, '7A new visit, waiting', pg_temp.try_step($q$
  insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
  values ('ZZZZ7A', 'ZZZZZZZZZZZZZZZZZZZZZZZ7A2', 'A', 'desk', 4, 'waiting', now(), now()) $q$), 'saved';
insert into results select 2, '7A waiting to called', pg_temp.try_step($q$
  update public.visits set status = 'called', called_at = now() where code = 'ZZZZ7A' $q$), 'saved';
insert into results select 3, '7A called to pre_arrival', pg_temp.try_step($q$
  update public.visits set status = 'pre_arrival' where code = 'ZZZZ7A' $q$), 'refused';
insert into results select 4, '7A I''m on my way (confirm_on_my_way)',
  case when public.confirm_on_my_way('ZZZZZZZZZZZZZZZZZZZZZZZ7A2') then 'saved' else 'refused' end, 'saved';
insert into results select 5, '7A seen_at filled by I''m on my way',
  (select case when seen_at is not null and status = 'on_the_way' then 'filled' else 'empty' end
   from public.visits where code = 'ZZZZ7A'), 'filled';
insert into results select 6, '7A on_the_way to arrived', pg_temp.try_step($q$
  update public.visits set status = 'arrived', arrived_at = now(), closed_at = now() where code = 'ZZZZ7A' $q$), 'saved';
insert into results select 7, '7A Undo: arrived to on_the_way', pg_temp.try_step($q$
  update public.visits set status = 'on_the_way', arrived_at = null, closed_at = null where code = 'ZZZZ7A' $q$), 'saved';

-- 7B: the time trigger is paused for one update, so seen_at can be an old time that is easy to see.
insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
values ('ZZZZ7B', 'ZZZZZZZZZZZZZZZZZZZZZZZ7B2', 'A', 'desk', 4, 'waiting', now(), now());
update public.visits set status = 'called', called_at = now() where code = 'ZZZZ7B';
alter table public.visits disable trigger visits_before_write;
update public.visits set seen_at = '2000-01-01T00:00:00Z' where code = 'ZZZZ7B';
alter table public.visits enable trigger visits_before_write;
insert into results select 8, '7B I''m on my way keeps a set seen_at',
  case when public.confirm_on_my_way('ZZZZZZZZZZZZZZZZZZZZZZZ7B2')
        and (select seen_at from public.visits where code = 'ZZZZ7B') = '2000-01-01T00:00:00Z'
       then 'kept' else 'changed' end, 'kept';

insert into results select 9, '7C new visit, declined', pg_temp.try_step($q$
  insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at, closed_at)
  values ('ZZZZ7C', 'ZZZZZZZZZZZZZZZZZZZZZZZ7C2', 'A', 'desk', 5, 'declined', now(), now(), now()) $q$), 'saved';
insert into results select 10, '7C declined to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', closed_at = null where code = 'ZZZZ7C' $q$), 'refused';

insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
values ('ZZZZ7D', 'ZZZZZZZZZZZZZZZZZZZZZZZ7D2', 'A', 'desk', 4, 'waiting', now(), now());
update public.visits set status = 'called', called_at = now() where code = 'ZZZZ7D';
insert into results select 11, '7D called to unable_to_reach', pg_temp.try_step($q$
  update public.visits set status = 'unable_to_reach', closed_at = now() where code = 'ZZZZ7D' $q$), 'saved';
insert into results select 12, '7D unable_to_reach to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', closed_at = null where code = 'ZZZZ7D' $q$), 'refused';
insert into results select 13, '7D reopen: unable_to_reach to needs_reassessment', pg_temp.try_step($q$
  update public.visits set status = 'needs_reassessment', closed_at = null where code = 'ZZZZ7D' $q$), 'saved';

insert into results select 14, '7G new visit, called', pg_temp.try_step($q$
  insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, called_at)
  values ('ZZZZ7G', 'ZZZZZZZZZZZZZZZZZZZZZZZ7G2', 'A', 'desk', 4, 'called', now(), now()) $q$), 'refused';

insert into results select 22, '7B site A to site B', pg_temp.try_step($q$
  update public.visits set site = 'B' where code = 'ZZZZ7B' $q$), 'refused';

-- Visits for the second part, made while nothing is paused.
insert into public.visits (code, access_token, site, source, status)
values ('ZZZZ7E', 'ZZZZZZZZZZZZZZZZZZZZZZZ7E2', 'A', 'home', 'pre_arrival');
insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at) values
  ('ZZZZ7H', 'ZZZZZZZZZZZZZZZZZZZZZZZ7H2', 'B', 'desk', 4, 'waiting', now(), now()),
  ('ZZZZ7J', 'ZZZZZZZZZZZZZZZZZZZZZZZ7J2', 'A', 'desk', 4, 'waiting', now(), now()),
  ('ZZZZ7K', 'ZZZZZZZZZZZZZZZZZZZZZZZ7K2', 'A', 'desk', 4, 'waiting', now(), now());
update public.visits set status = 'arrived', arrived_at = now(), closed_at = now() where code = 'ZZZZ7J';

-- Every allowed move once: a new visit for each move is taken to the "from" status through
-- allowed moves, then moved to the "to" status. All 22 must save. Keep the list the same as
-- the trigger's list (lib/allowedSteps.test.ts checks the trigger against lib/allowedSteps.ts).
do $$
declare
  letters constant text := 'ABCDEFGHJKMNPQRSTVWXYZ'; -- letters both code checks allow
  move record;
  i integer := 0;
  visit_code text;
  step text;
begin
  for move in
    select * from (values
    -- allowed moves (keep the same as lib/allowedSteps.ts)
      ('pre_arrival', 'waiting'), ('pre_arrival', 'declined'), ('pre_arrival', 'not_eligible'),
      ('needs_reassessment', 'waiting'), ('needs_reassessment', 'declined'), ('needs_reassessment', 'not_eligible'),
      ('waiting', 'called'), ('waiting', 'arrived'), ('waiting', 'removed'),
      ('called', 'on_the_way'), ('called', 'arrived'), ('called', 'removed'), ('called', 'unable_to_reach'),
      ('on_the_way', 'arrived'), ('on_the_way', 'removed'),
      ('unable_to_reach', 'needs_reassessment'),
      ('arrived', 'waiting'), ('arrived', 'called'), ('arrived', 'on_the_way'),
      ('removed', 'waiting'), ('removed', 'called'), ('removed', 'on_the_way')
    -- end of allowed moves
    ) as m(from_status, to_status)
  loop
    i := i + 1;
    visit_code := 'ZZZZ8' || substr(letters, i, 1);
    if move.from_status = 'pre_arrival' then
      insert into public.visits (code, access_token, site, source, status)
      values (visit_code, 'ZZZZZZZZZZZZZZZZZZZZZZZ8' || substr(letters, i, 1) || '2', 'A', 'home', 'pre_arrival');
    else
      insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
      values (visit_code, 'ZZZZZZZZZZZZZZZZZZZZZZZ8' || substr(letters, i, 1) || '2', 'A', 'desk', 4, 'waiting', now(), now());
    end if;
    foreach step in array case move.from_status
        when 'called' then array['called']
        when 'on_the_way' then array['called', 'on_the_way']
        when 'unable_to_reach' then array['called', 'unable_to_reach']
        when 'needs_reassessment' then array['called', 'unable_to_reach', 'needs_reassessment']
        when 'arrived' then array['arrived']
        when 'removed' then array['removed']
        else array[]::text[] end
    loop
      update public.visits
      set status = step, removed_reason = case when step = 'removed' then 'left' end
      where code = visit_code;
    end loop;
    insert into results select 100 + i, 'move ' || move.from_status || ' to ' || move.to_status,
      pg_temp.try_step(format(
        'update public.visits set status = %L, removed_reason = %L where code = %L',
        move.to_status, case when move.to_status = 'removed' then 'left' end, visit_code)),
      'saved';
  end loop;
end;
$$;

-- Second part: site A is paused, site B is not.
update public.site_settings set offsite_paused = true, paused_at = now() where site = 'A';

insert into results select 15, 'paused: 7F new visit, waiting', pg_temp.try_step($q$
  insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
  values ('ZZZZ7F', 'ZZZZZZZZZZZZZZZZZZZZZZZ7F2', 'A', 'desk', 4, 'waiting', now(), now()) $q$), 'paused';
insert into results select 16, 'paused: 7E triage to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', ctas_level = 5, triaged_at = now(), offered_at = now()
  where code = 'ZZZZ7E' $q$), 'paused';
insert into results select 17, 'paused: 7E triage to declined', pg_temp.try_step($q$
  update public.visits set status = 'declined', ctas_level = 5, triaged_at = now(), offered_at = now(), closed_at = now()
  where code = 'ZZZZ7E' $q$), 'saved';
insert into results select 18, 'paused: 7D triage to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', triaged_at = now(), offered_at = now() where code = 'ZZZZ7D' $q$), 'paused';
insert into results select 19, 'paused: 7D triage to not_eligible', pg_temp.try_step($q$
  update public.visits set status = 'not_eligible', triaged_at = now(), closed_at = now() where code = 'ZZZZ7D' $q$), 'saved';
insert into results select 20, 'paused: 7A on_the_way to removed (no-show)', pg_temp.try_step($q$
  update public.visits set status = 'removed', removed_reason = 'no_show', closed_at = now() where code = 'ZZZZ7A' $q$), 'saved';
insert into results select 21, 'paused: 7A Undo: removed to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', removed_reason = null, closed_at = null where code = 'ZZZZ7A' $q$), 'saved';
insert into results select 23, 'paused: 7H waiting at site B moved to site A', pg_temp.try_step($q$
  update public.visits set site = 'A' where code = 'ZZZZ7H' $q$), 'refused';
insert into results select 24, 'paused: 7J Undo: arrived to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', arrived_at = null, closed_at = null where code = 'ZZZZ7J' $q$), 'saved';
insert into results select 25, 'paused: 7K I''m still here (record_still_here)',
  case when public.record_still_here('ZZZZZZZZZZZZZZZZZZZZZZZ7K2') then 'saved' else 'refused' end, 'saved';
insert into results select 26, 'paused at A: 7M new visit, waiting at site B', pg_temp.try_step($q$
  insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
  values ('ZZZZ7M', 'ZZZZZZZZZZZZZZZZZZZZZZZ7M2', 'B', 'desk', 4, 'waiting', now(), now()) $q$), 'saved';

-- Fail closed: with no settings row for site B, the check treats site B as paused.
delete from public.site_settings where site = 'B';
insert into results select 27, 'no settings row for B: 7N new visit, waiting at site B', pg_temp.try_step($q$
  insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
  values ('ZZZZ7N', 'ZZZZZZZZZZZZZZZZZZZZZZZ7N2', 'B', 'desk', 4, 'waiting', now(), now()) $q$), 'paused';

select n, what, got, expected, got = expected as ok from results order by n;

-- Stops with an error if any row is not ok, so a failed check cannot look clean.
do $$
declare
  bad text;
begin
  select string_agg(n || ' ' || what || ' (got ' || got || ')', '; ' order by n) into bad
  from results where got is distinct from expected;
  if bad is not null then
    raise exception 'Step check failed: %', bad;
  end if;
end;
$$;

rollback;
