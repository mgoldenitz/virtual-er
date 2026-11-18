-- Check for the demo simulator (migration 20261118000100_demo_simulator.sql).
-- Run the whole file at once (do not select and run one part): the Editor shows only the last
-- result, so the file keeps the results in a temp table and shows all rows at the end.
-- Run it in the Supabase SQL Editor after both demo migrations. It saves nothing: everything
-- happens inside "begin ... rollback", so the demo visits, the on switch and the pause all go away.
--
-- What it does: turns the simulator on, then runs 30 ticks. After each tick every demo time
-- moves back 5 minutes, so the next tick sees 5 more minutes gone by. Then site B is paused and
-- one more tick runs.
--
-- Why the trigger is paused during the 5-minute steps: visits_before_write sets every new time
-- to now(), so the moved-back times would be put back to now() unless the trigger is off.
-- Why the times are all now(): now() is the start time of this transaction, so every row made
-- in the check has the same time, and the shifts make the spread.
--
-- Expected result (5 rows):
--   1 real visits changed                 0 (no real visit changed its version or was removed)
--   2 site A waiting                      7 to 9 (desk starts keep about 9; home starts can add more)
--   3 site B waiting                      7 to 9
--   4 site B new waiting while paused     0 (nothing joins the line while B is paused)
--   5 call-backs at A                     8 to 11 (one recall every 15 or 20 minutes over 150 minutes)

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

-- Pause site B, then one more tick. Nothing new may join site B's line.
update public.site_settings set offsite_paused = true where site = 'B';
select public.simulate_demo_tick();

-- The results, kept in a temp table so all rows show at the end.
create temp table demo_tick_rows (check_case text, count_value bigint);

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
select '4 site B new waiting while paused', count(*) from public.visits
where is_demo = true and site = 'B' and status = 'waiting' and triaged_at = now();

insert into demo_tick_rows
select '5 call-backs at A', count(*) from public.visits
where is_demo = true and site = 'A' and called_at is not null;

select check_case, count_value from demo_tick_rows order by check_case;

rollback;
