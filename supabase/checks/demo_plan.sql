-- Check for the day plan (migration 20261120000000_demo_plan.sql).
-- Run the whole file at once in the Supabase SQL Editor, after that migration. It saves nothing:
-- everything happens inside "begin ... rollback". After it, run supabase/checks/demo_tick.sql again:
-- the default plan keeps the old numbers, so its 13 expected rows stay the same.
--
-- Expected result (10 rows):
--   01 plan with a number too high refused     1
--   02 plan with a number too low refused      1
--   03 refused plan left the plan as it was    1 (seen_chance still 0.70, plan_set_at still empty)
--   04 good plan saved                         1 (seen_chance 0.60, plan_set_at set)
--   05 on switch changed by a plan             0
--   06 real visits changed by a plan           0
--   07 anon may call set_demo_plan             0
--   08 authenticated may call set_demo_plan    0
--   09 service_role may call set_demo_plan     1
--   10 service_role may read demo_settings     0

begin;

create temp table demo_plan_rows (check_case text, count_value bigint);

-- Start from the normal plan, so rows 03 and 04 know what to expect.
update public.demo_settings set
  seen_chance = 0.70, on_my_way_chance = 0.70, still_here_chance = 0.70, arrive_chance = 0.50,
  quick_recall_chance = 0.50, home_start_chance = 0.10, desk_offer_chance = 0.80, english_share = 0.70,
  plan_set_at = null
where id = 1;

create temp table running_before as select running from public.demo_settings where id = 1;
create temp table real_before as select id, version from public.visits where is_demo = false;

-- 01 and 02: a plan with one number outside its range must fail, and save nothing.
do $$
begin
  begin
    perform public.set_demo_plan(1.00, 0.70, 0.70, 0.50, 0.50, 0.10, 0.80, 0.70);
    insert into demo_plan_rows values ('01 plan with a number too high refused', 0);
  exception when check_violation then
    insert into demo_plan_rows values ('01 plan with a number too high refused', 1);
  end;
  begin
    perform public.set_demo_plan(0.70, 0.70, 0.70, 0.50, 0.50, 0.00, 0.80, 0.70);
    insert into demo_plan_rows values ('02 plan with a number too low refused', 0);
  exception when check_violation then
    insert into demo_plan_rows values ('02 plan with a number too low refused', 1);
  end;
end $$;

insert into demo_plan_rows
select '03 refused plan left the plan as it was', count(*) from public.demo_settings
where id = 1 and seen_chance = 0.70 and home_start_chance = 0.10 and plan_set_at is null;

-- 04: a good plan is saved.
select public.set_demo_plan(0.60, 0.80, 0.75, 0.40, 0.55, 0.15, 0.90, 0.60);

insert into demo_plan_rows
select '04 good plan saved', count(*) from public.demo_settings
where id = 1 and seen_chance = 0.60 and english_share = 0.60 and plan_set_at is not null;

insert into demo_plan_rows
select '05 on switch changed by a plan', count(*) from public.demo_settings d, running_before b
where d.id = 1 and d.running is distinct from b.running;

insert into demo_plan_rows
select '06 real visits changed by a plan', count(*) from real_before rb
left join public.visits v on v.id = rb.id
where v.id is null or v.version is distinct from rb.version;

-- 07 to 10: who may call the function and read the table.
insert into demo_plan_rows
select '07 anon may call set_demo_plan', has_function_privilege('anon',
  'public.set_demo_plan(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)', 'execute')::int;

insert into demo_plan_rows
select '08 authenticated may call set_demo_plan', has_function_privilege('authenticated',
  'public.set_demo_plan(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)', 'execute')::int;

insert into demo_plan_rows
select '09 service_role may call set_demo_plan', has_function_privilege('service_role',
  'public.set_demo_plan(numeric, numeric, numeric, numeric, numeric, numeric, numeric, numeric)', 'execute')::int;

insert into demo_plan_rows
select '10 service_role may read demo_settings', has_table_privilege('service_role', 'public.demo_settings', 'select')::int;

select check_case, count_value from demo_plan_rows order by check_case;

rollback;
