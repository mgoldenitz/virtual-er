-- Check for the demo simulator (migrations 20261118000100_demo_simulator.sql,
-- 20261118000200_demo_simulator_fixes.sql and 20261120000000_demo_plan.sql).
-- Run the whole file at once (do not select and run one part): the Editor shows only the last
-- result, so the file keeps the results in a temp table and shows all rows at the end.
-- Run it in the Supabase SQL Editor after both demo migrations and the fixes migration. It saves
-- nothing: everything happens inside "begin ... rollback", so the test visits, the demo visits,
-- the on switch and the pause all go away.
-- Lock warning: the ALTER TABLE ... disable trigger below takes a lock on visits. The lock holds
-- until the rollback at the end, which is a few seconds. Run it when nobody is testing the app.
--
-- What it does:
-- 1. Adds 5 real test visits (is_demo = false) in active states: pre_arrival, waiting at A and B,
--    called and on_the_way. Their times move back with the demo times, so every time rule in the
--    simulator sees them. The simulator must never touch them.
-- 2. Turns the simulator on and runs 30 ticks. After each tick every demo time (and every test
--    visit time) moves back 5 minutes, so the next tick sees 5 more minutes gone by.
-- 3. Gets site B ready so that a missing pause guard would show: 2 waiting demo visits are
--    removed (so desk starts would run) and 1 demo home visit 10 minutes old is added (so a home
--    start would run). Then site B is paused and one more tick runs. Nothing may join site B.
-- 4. Turns the on switch off and runs one more tick. That tick must change nothing.
--
-- Why the trigger is paused during the 5-minute steps: visits_before_write sets every new time
-- to now(), so the moved-back times would be put back to now() unless the trigger is off. With the
-- trigger off, version does not change, so the moves do not count as changes in row 02.
-- The ids come from gen_random_uuid(), so setseed does not make each run the same. That is why
-- some rows give a range or "in most runs".
--
-- Expected result (13 rows):
--   00 demo visits before the check            0 (if not, run "Clear demo data" first)
--   01 real visits checked                     5 or more (the 5 test visits and any others)
--   02 real visits changed                     0 (no real visit changed its version or was removed)
--   03 real visits added                       0 (the simulator made no visit with is_demo = false)
--   04 site A waiting after 30 ticks           7 to 10 (desk starts stop at 9; a home start can add 1)
--   05 site B waiting after 30 ticks           7 to 10
--   06 site B added or waiting after pause     0 (no new row and no new waiting visit at site B)
--   07 call-backs at A after 30 ticks          8 to 11 (one recall every 15 or 20 minutes over 150 minutes)
--   08 demo arrived                            more than 0
--   09 phone attempts recorded                 more than 0 in most runs
--   10 unable_to_reach demo visits             more than 0 in most runs
--   11 unable_to_reach with under 2 attempts   0 (the 2-attempt rule)
--   12 changes while running is false          0 (the tick does nothing while the on switch is off)

begin;

select setseed(0.42);

-- The results, kept in a temp table so all rows show at the end.
create temp table demo_tick_rows (check_case text, count_value bigint);

insert into demo_tick_rows
select '00 demo visits before the check', count(*) from public.visits where is_demo = true;

-- Make sure neither site is paused, so the test visits can wait.
update public.site_settings set offsite_paused = false;

-- Use the normal day plan (the old fixed chances), because the ranges below are for it.
-- A saved plan from Claude comes back at the rollback. Needs 20261120000000_demo_plan.sql.
update public.demo_settings set
  seen_chance = 0.70, on_my_way_chance = 0.70, still_here_chance = 0.70, arrive_chance = 0.50,
  quick_recall_chance = 0.50, home_start_chance = 0.10, desk_offer_chance = 0.80, english_share = 0.70
where id = 1;

-- 1. Five real test visits (is_demo = false). Each one starts at the desk or at home.
create temp table real_test (id uuid, step text);

with made as (
  insert into public.visits
    (code, access_token, site, source, ctas_level, language, status, triaged_at, offered_at, is_demo)
  values
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), false),
    (public.demo_new_code(), public.demo_new_token(), 'B', 'desk', 5, 'en', 'waiting', now(), now(), false),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), false),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 5, 'en', 'waiting', now(), now(), false)
  returning id
)
insert into real_test select id, 'waiting' from made;

with made as (
  insert into public.visits (code, access_token, site, source, status, language, is_demo)
  values (public.demo_new_code(), public.demo_new_token(), 'A', 'home', 'pre_arrival', 'en', false)
  returning id
)
insert into real_test select id, 'pre_arrival' from made;

-- Move two of the waiting test visits at site A on: one to called, one to on_the_way.
-- The 3 waiting test visits at site A get numbers 1, 2 and 3: 1 stays waiting, 2 is called,
-- 3 is on_the_way.
update real_test t set step = s.step
from (
  select rt.id,
    case row_number() over (order by rt.id) when 2 then 'called' when 3 then 'on_the_way' else 'waiting' end as step
  from real_test rt
  join public.visits v on v.id = rt.id
  where v.site = 'A' and rt.step = 'waiting'
) s
where t.id = s.id;

update public.visits set status = 'called', called_at = now()
where id in (select id from real_test where step in ('called', 'on_the_way'));
update public.visits set status = 'on_the_way', confirmed_at = now()
where id in (select id from real_test where step = 'on_the_way');

-- The real visits before the ticks (with the test visits), to see later whether any changed.
create temp table real_before as
select id, version from public.visits where is_demo = false;

-- 2. Turn the simulator on, then 30 ticks. After each tick, move the times back 5 minutes.
update public.demo_settings set running = true;

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
    where is_demo = true or id in (select id from real_test);
    alter table public.visits enable trigger visits_before_write;
  end loop;
end $$;

insert into demo_tick_rows
select '04 site A waiting after 30 ticks', count(*) from public.visits
where is_demo = true and site = 'A' and status = 'waiting';

insert into demo_tick_rows
select '05 site B waiting after 30 ticks', count(*) from public.visits
where is_demo = true and site = 'B' and status = 'waiting';

insert into demo_tick_rows
select '07 call-backs at A after 30 ticks', count(*) from public.visits
where is_demo = true and site = 'A' and called_at is not null;

-- 3. Get site B ready, so that a missing pause guard would show in row 06.
-- Remove the 2 newest waiting demo visits, so fewer than 9 wait and desk starts would run.
update public.visits set status = 'removed', removed_reason = 'left', closed_at = now()
where id in (
  select id from public.visits
  where is_demo = true and site = 'B' and status = 'waiting'
  order by triaged_at desc, id
  limit 2);

-- Add one demo home visit at site B and make it 10 minutes old, so a home start would run.
insert into public.visits (code, access_token, site, source, status, language, is_demo)
values (public.demo_new_code(), public.demo_new_token(), 'B', 'home', 'pre_arrival', 'en', true);
alter table public.visits disable trigger visits_before_write;
update public.visits set created_at = created_at - interval '10 minutes'
where is_demo = true and site = 'B' and status = 'pre_arrival';
alter table public.visits enable trigger visits_before_write;

-- Save every site B demo visit and its status. Then pause site B and run one more tick.
create temp table b_before as
select id, status from public.visits where is_demo = true and site = 'B';
update public.site_settings set offsite_paused = true where site = 'B';
select public.simulate_demo_tick();

insert into demo_tick_rows
select '06 site B added or waiting after pause', count(*) from public.visits v
left join b_before b on b.id = v.id
where v.is_demo = true and v.site = 'B'
  and (b.id is null or (v.status = 'waiting' and b.status <> 'waiting'));

-- 4. Save every demo visit (id and version). Then turn the on switch off and run one more tick.
-- That tick must add no visit, remove no visit and change no version.
create temp table demo_before_off as
select id, version from public.visits where is_demo = true;
update public.demo_settings set running = false;
select public.simulate_demo_tick();

-- The other results.
insert into demo_tick_rows
select '01 real visits checked', count(*) from real_before;

insert into demo_tick_rows
select '02 real visits changed', count(*)
from real_before rb
left join public.visits v on v.id = rb.id
where v.id is null or v.version is distinct from rb.version;

insert into demo_tick_rows
select '03 real visits added', count(*) from public.visits v
where v.is_demo = false and not exists (select 1 from real_before rb where rb.id = v.id);

insert into demo_tick_rows
select '08 demo arrived', count(*) from public.visits
where is_demo = true and status = 'arrived';

insert into demo_tick_rows
select '09 phone attempts recorded', count(*) from public.visits
where is_demo = true and phone_attempts > 0;

insert into demo_tick_rows
select '10 unable_to_reach demo visits', count(*) from public.visits
where is_demo = true and status = 'unable_to_reach';

insert into demo_tick_rows
select '11 unable_to_reach with under 2 attempts', count(*) from public.visits
where is_demo = true and status = 'unable_to_reach' and phone_attempts < 2;

-- Changed or new demo rows, plus demo rows that are gone.
insert into demo_tick_rows
select '12 changes while running is false',
  (select count(*) from public.visits v
   left join demo_before_off b on b.id = v.id
   where v.is_demo = true and (b.id is null or v.version is distinct from b.version))
  + (select count(*) from demo_before_off b
     where not exists (select 1 from public.visits v where v.id = b.id));

select check_case, count_value from demo_tick_rows order by check_case;

rollback;
