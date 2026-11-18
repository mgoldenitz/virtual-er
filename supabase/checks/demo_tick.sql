-- Check for the demo simulator (migrations 20261118000100_demo_simulator.sql and
-- 20261118000200_demo_simulator_fixes.sql).
-- Run the whole file at once (do not select and run one part): the Editor shows only the last
-- result, so the file keeps the results in a temp table and shows all rows at the end.
-- Run it in the Supabase SQL Editor after both demo migrations and the fixes migration. It saves
-- nothing: everything happens inside "begin ... rollback", so the demo visits, the on switch and the
-- pause all go away.
-- Lock warning: the ALTER TABLE ... disable trigger below takes a lock on visits. The lock holds
-- until the rollback at the end, which is a few seconds. Run it when nobody is testing the app.
--
-- What it does: turns the simulator on, then runs 30 ticks. After each tick every demo time
-- moves back 5 minutes, so the next tick sees 5 more minutes gone by. Then the waiting demo
-- visits at site B are saved, site B is paused and one more tick runs. Last, the on switch is
-- turned off and one more tick runs. That tick must change nothing.
--
-- Why the trigger is paused during the 5-minute steps: visits_before_write sets every new time
-- to now(), so the moved-back times would be put back to now() unless the trigger is off.
-- Why the times are all now(): now() is the start time of this transaction, so every row made
-- in the check has the same time, and the shifts make the spread.
--
-- Expected result (9 rows):
--   0 real visits checked                  more than 0 (so row 1 proves something)
--   1 real visits changed                  0 (no real visit changed its version or was removed)
--   2 site A waiting                       7 to 10 (desk starts stop at 9; a home start can add 1)
--   3 site B waiting                       7 to 10
--   4 site B new waiting after pause       0 (nothing joins site B's line after the pause)
--   5 call-backs at A                      8 to 11 (one recall every 15 or 20 minutes over 150 minutes)
--   6 demo arrived                         more than 0
--   7 phone attempts recorded              more than 0 in most runs
--   8 changes while running is false       0 (the tick does nothing while the on switch is off)

begin;

select setseed(0.42);

-- The real visits before the check, to see later whether any changed.
create temp table real_before as
select id, version from public.visits where is_demo = false;

-- Turn the simulator on, and make sure neither site is paused.
update public.demo_settings set running = true;
update public.site_settings set offsite_paused = false;

-- 30 ticks. After each tick, move every demo time back 5 minutes.
do $$
begin
  for i in 1..30 loop
    perform public.simulate_demo_tick();
    alter table public.visits disable trigger visits_before_write;
    update public.visits set
      created_at = created_at - interval '5 minutes',
      triaged_at = triaged_at - interval '5 minutes',
      offered_at = offered_at - interval '5 minutes',
      last_still_here_at = last_still_here_at - interval '5 minutes',
      called_at = called_at - interval '5 minutes',
      seen_at = seen_at - interval '5 minutes',
      confirmed_at = confirmed_at - interval '5 minutes',
      review_flagged_at = review_flagged_at - interval '5 minutes',
      arrived_at = arrived_at - interval '5 minutes',
      closed_at = closed_at - interval '5 minutes',
      followup_paused_until = followup_paused_until - interval '5 minutes'
    where is_demo = true;
    alter table public.visits enable trigger visits_before_write;
  end loop;
end $$;

-- Save the site B demo visits that are waiting now, before the pause.
create temp table b_waiting_before as
select id from public.visits where is_demo = true and site = 'B' and status = 'waiting';

-- Pause site B, then one more tick. Nothing new may join site B's line.
update public.site_settings set offsite_paused = true where site = 'B';
select public.simulate_demo_tick();

-- Save every demo visit (id and version). Then turn the on switch off and run one more tick.
-- That tick must add no visit and change no version.
create temp table demo_before_off as
select id, version from public.visits where is_demo = true;
update public.demo_settings set running = false;
select public.simulate_demo_tick();

-- The results, kept in a temp table so all rows show at the end.
create temp table demo_tick_rows (check_case text, count_value bigint);

insert into demo_tick_rows
select '0 real visits checked', count(*) from real_before;

insert into demo_tick_rows
select '1 real visits changed', count(*)
from real_before rb
left join public.visits v on v.id = rb.id
where v.id is null or v.version is distinct from rb.version;

insert into demo_tick_rows
select '2 site A waiting', count(*) from public.visits
where is_demo = true and site = 'A' and status = 'waiting';

insert into demo_tick_rows
select '3 site B waiting', count(*) from public.visits
where is_demo = true and site = 'B' and status = 'waiting';

insert into demo_tick_rows
select '4 site B new waiting after pause', count(*) from public.visits v
where v.is_demo = true and v.site = 'B' and v.status = 'waiting'
  and not exists (select 1 from b_waiting_before b where b.id = v.id);

insert into demo_tick_rows
select '5 call-backs at A', count(*) from public.visits
where is_demo = true and site = 'A' and called_at is not null;

insert into demo_tick_rows
select '6 demo arrived', count(*) from public.visits
where is_demo = true and status = 'arrived';

insert into demo_tick_rows
select '7 phone attempts recorded', count(*) from public.visits
where is_demo = true and phone_attempts > 0;

insert into demo_tick_rows
select '8 changes while running is false', count(*) from public.visits v
left join demo_before_off b on b.id = v.id
where v.is_demo = true and (b.id is null or v.version is distinct from b.version);

select check_case, count_value from demo_tick_rows order by check_case;

rollback;
