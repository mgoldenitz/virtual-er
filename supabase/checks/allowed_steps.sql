-- Check for the allowed steps (migration 20261117000000_allowed_steps.sql).
-- Run the whole file at once in the Supabase SQL Editor, after that migration. It saves nothing:
-- everything happens inside "begin ... rollback", so the synthetic visits and the paused site
-- come back as they were.
-- It shows 21 rows. In each row, got must be the same as expected, and ok must be true.
-- The visits (all site A, codes ZZZZ7x, so no real visit is touched):
--   7A  desk, waiting: recall, a move back that is refused, I'm on my way, arrived, Undo
--   7B  desk, waiting, recalled, seen_at set to 2000-01-01: I'm on my way keeps that seen_at
--   7C  desk, declined: cannot join the line later
--   7D  desk, waiting, recalled: unable to reach, reopen, and triage while paused
--   7E  home, pre_arrival: triage while paused
--   7F  desk, waiting while paused: refused
--   7G  desk, called at the start: refused

begin;

-- Tries one change. 'saved' if the database took it, 'refused' if the step check stopped it.
-- Any other error stops the whole run (and still saves nothing).
create function pg_temp.try_step(p_sql text) returns text
language plpgsql as $$
begin
  execute p_sql;
  return 'saved';
exception
  when sqlstate 'VWR01' then return 'refused';
end;
$$;

create temp table results (n integer, what text, got text, expected text);

-- Make sure site A is not paused for the first part.
update public.site_settings set offsite_paused = false where site = 'A';

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

insert into public.visits (code, access_token, site, source, status)
values ('ZZZZ7E', 'ZZZZZZZZZZZZZZZZZZZZZZZ7E2', 'A', 'home', 'pre_arrival');

-- Second part: site A is paused.
update public.site_settings set offsite_paused = true, paused_at = now() where site = 'A';

insert into results select 15, 'paused: 7F new visit, waiting', pg_temp.try_step($q$
  insert into public.visits (code, access_token, site, source, ctas_level, status, triaged_at, offered_at)
  values ('ZZZZ7F', 'ZZZZZZZZZZZZZZZZZZZZZZZ7F2', 'A', 'desk', 4, 'waiting', now(), now()) $q$), 'refused';
insert into results select 16, 'paused: 7E triage to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', ctas_level = 5, triaged_at = now(), offered_at = now()
  where code = 'ZZZZ7E' $q$), 'refused';
insert into results select 17, 'paused: 7E triage to declined', pg_temp.try_step($q$
  update public.visits set status = 'declined', ctas_level = 5, triaged_at = now(), offered_at = now(), closed_at = now()
  where code = 'ZZZZ7E' $q$), 'saved';
insert into results select 18, 'paused: 7D triage to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', triaged_at = now(), offered_at = now() where code = 'ZZZZ7D' $q$), 'refused';
insert into results select 19, 'paused: 7D triage to not_eligible', pg_temp.try_step($q$
  update public.visits set status = 'not_eligible', triaged_at = now(), closed_at = now() where code = 'ZZZZ7D' $q$), 'saved';
insert into results select 20, 'paused: 7A on_the_way to removed (no-show)', pg_temp.try_step($q$
  update public.visits set status = 'removed', removed_reason = 'no_show', closed_at = now() where code = 'ZZZZ7A' $q$), 'saved';
insert into results select 21, 'paused: 7A Undo: removed to waiting', pg_temp.try_step($q$
  update public.visits set status = 'waiting', removed_reason = null, closed_at = null where code = 'ZZZZ7A' $q$), 'saved';

select n, what, got, expected, got = expected as ok from results order by n;

rollback;
