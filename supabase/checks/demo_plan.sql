-- Check for the day plan (migration 20261120000000_demo_plan.sql).
-- Run the whole file at once in the Supabase SQL Editor, after that migration. It saves nothing:
-- everything happens inside "begin ... rollback". After it, run supabase/checks/demo_tick.sql again:
-- it sets the normal plan (the old numbers) for its own run, so its 13 expected rows stay the same.
--
-- Expected result (12 rows):
--   01 each number one step too high refused        8
--   02 each number one step too low refused         8
--   03 refused plans left the plan as it was        1 (seen_chance still 0.70, plan_set_at still empty)
--   04 each number at its lowest and highest saved 16
--   05 good plan saved                              1 (seen_chance 0.60, plan_set_at set)
--   06 on switch changed by a plan                  0
--   07 real visits changed by a plan                0
--   08 anon may call set_demo_plan                  0
--   09 authenticated may call set_demo_plan         0
--   10 service_role may call set_demo_plan          1
--   11 service_role may read demo_settings          0
--   12 service_role may change demo_settings        0
-- Rows 08 to 12 really run as that role ("set local role"), not only read the rights.
-- The lowest and highest numbers below must match PLAN_LIMITS in lib/demoPlan.ts.

begin;

create temp table demo_plan_rows (check_case text, count_value bigint);

-- Start from the normal plan, so rows 03 and 05 know what to expect.
update public.demo_settings set
  seen_chance = 0.70, on_my_way_chance = 0.70, still_here_chance = 0.70, arrive_chance = 0.50,
  quick_recall_chance = 0.50, home_start_chance = 0.10, desk_offer_chance = 0.80, english_share = 0.70,
  plan_set_at = null
where id = 1;

create temp table running_before as select running from public.demo_settings where id = 1;
create temp table real_before as select id, version from public.visits where is_demo = false;

-- 01, 02 and 04: each of the 8 numbers in turn, with the other 7 at their usual value.
-- Order: seen, on my way, still here, arrive, quick recall, home start, desk offer, English.
do $$
declare
  normal numeric[] := array[0.70, 0.70, 0.70, 0.50, 0.50, 0.10, 0.80, 0.70];
  lowest numeric[] := array[0.30, 0.30, 0.30, 0.20, 0.30, 0.02, 0.50, 0.30];
  highest numeric[] := array[0.95, 0.95, 0.95, 0.90, 0.70, 0.30, 0.95, 0.90];
  a numeric[];
  refused_high int := 0;
  refused_low int := 0;
begin
  -- One step above the highest number must fail.
  for i in 1..8 loop
    a := normal;
    a[i] := highest[i] + 0.01;
    begin
      perform public.set_demo_plan(a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
    exception when check_violation then
      refused_high := refused_high + 1;
    end;
  end loop;

  -- One step below the lowest number must fail.
  for i in 1..8 loop
    a := normal;
    a[i] := lowest[i] - 0.01;
    begin
      perform public.set_demo_plan(a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
    exception when check_violation then
      refused_low := refused_low + 1;
    end;
  end loop;

  insert into demo_plan_rows values ('01 each number one step too high refused', refused_high);
  insert into demo_plan_rows values ('02 each number one step too low refused', refused_low);
end $$;

insert into demo_plan_rows
select '03 refused plans left the plan as it was', count(*) from public.demo_settings
where id = 1 and seen_chance = 0.70 and home_start_chance = 0.10 and plan_set_at is null;

-- 04: the lowest and the highest number of each field must be saved.
do $$
declare
  normal numeric[] := array[0.70, 0.70, 0.70, 0.50, 0.50, 0.10, 0.80, 0.70];
  edges numeric[][] := array[
    [0.30, 0.30, 0.30, 0.20, 0.30, 0.02, 0.50, 0.30],
    [0.95, 0.95, 0.95, 0.90, 0.70, 0.30, 0.95, 0.90]];
  a numeric[];
  saved int := 0;
begin
  for e in 1..2 loop
    for i in 1..8 loop
      a := normal;
      a[i] := edges[e][i];
      begin
        perform public.set_demo_plan(a[1], a[2], a[3], a[4], a[5], a[6], a[7], a[8]);
        saved := saved + 1;
      exception when check_violation then
        null;
      end;
    end loop;
  end loop;
  insert into demo_plan_rows values ('04 each number at its lowest and highest saved', saved);
end $$;

-- 05: a good plan is saved.
select public.set_demo_plan(0.60, 0.80, 0.75, 0.40, 0.55, 0.15, 0.90, 0.60);

insert into demo_plan_rows
select '05 good plan saved', count(*) from public.demo_settings
where id = 1 and seen_chance = 0.60 and english_share = 0.60 and plan_set_at is not null;

insert into demo_plan_rows
select '06 on switch changed by a plan', count(*) from public.demo_settings d, running_before b
where d.id = 1 and d.running is distinct from b.running;

insert into demo_plan_rows
select '07 real visits changed by a plan', count(*) from real_before rb
left join public.visits v on v.id = rb.id
where v.id is null or v.version is distinct from rb.version;

-- 08 to 12: run as each role. 1 means the step worked, 0 means the database refused it.
do $$
declare
  anon_call int := 1;
  authenticated_call int := 1;
  service_call int := 1;
  service_read int := 1;
  service_change int := 1;
begin
  set local role anon;
  begin
    perform public.set_demo_plan(0.70, 0.70, 0.70, 0.50, 0.50, 0.10, 0.80, 0.70);
  exception when insufficient_privilege then anon_call := 0;
  end;
  reset role;

  set local role authenticated;
  begin
    perform public.set_demo_plan(0.70, 0.70, 0.70, 0.50, 0.50, 0.10, 0.80, 0.70);
  exception when insufficient_privilege then authenticated_call := 0;
  end;
  reset role;

  set local role service_role;
  begin
    perform public.set_demo_plan(0.70, 0.70, 0.70, 0.50, 0.50, 0.10, 0.80, 0.70);
  exception when insufficient_privilege then service_call := 0;
  end;
  begin
    perform running from public.demo_settings where id = 1;
  exception when insufficient_privilege then service_read := 0;
  end;
  begin
    update public.demo_settings set running = true where id = 1;
  exception when insufficient_privilege then service_change := 0;
  end;
  reset role;

  insert into demo_plan_rows values
    ('08 anon may call set_demo_plan', anon_call),
    ('09 authenticated may call set_demo_plan', authenticated_call),
    ('10 service_role may call set_demo_plan', service_call),
    ('11 service_role may read demo_settings', service_read),
    ('12 service_role may change demo_settings', service_change);
end $$;

select check_case, count_value from demo_plan_rows order by check_case;

rollback;
