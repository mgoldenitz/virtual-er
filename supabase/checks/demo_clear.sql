-- Check for "Clear demo data" (migration 20261118010000_clear_demo_data.sql).
-- Run the whole file at once in the Supabase SQL Editor, as the owner (the default role there).
-- The file keeps the results in a temp table and shows all rows at the end.
-- It saves nothing: everything happens inside "begin ... rollback".
--
-- Expected result (8 rows):
--   00 demo visits before the check            0 (if not, run "Clear demo data" on /staff first)
--   01 non-staff refused                       1
--   02 visits deleted by the call              2 (the 2 test demo visits, plus any counted in 00)
--   03 demo visits left                        0
--   04 real test visits left                   2
--   05 demo stats rows left                    0 (all days)
--   06 real stats row left                     1 (day 2000-01-01, is_demo false)
--   07 simulator running                       0
--
-- The calls run as the "authenticated" role, the same role the app uses, with the staff or
-- patient sign-in set in the request claims. Why the year 2000: no real visit or stats row
-- can have that day.

begin;

-- The results, kept in a temp table so all rows show at the end.
create temp table demo_clear_rows (check_case text, count_value bigint);

-- The calls below run as "authenticated", so it may write to the results table.
grant all on demo_clear_rows to authenticated;

-- Setup, as the owner. Make sure neither site is paused, so the test visits can wait.
insert into demo_clear_rows
select '00 demo visits before the check', count(*) from public.visits where is_demo = true;

update public.site_settings set offsite_paused = false;

-- Two demo visits and two real visits, all waiting at site A. The ids of the two real visits
-- are saved in a temp table before the role changes, so they can be counted after the call.
create temp table demo_clear_real (id uuid);

with made as (
  insert into public.visits
    (code, access_token, site, source, ctas_level, language, status, triaged_at, offered_at, is_demo)
  values
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), true),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), true),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), false),
    (public.demo_new_code(), public.demo_new_token(), 'A', 'desk', 4, 'en', 'waiting', now(), now(), false)
  returning id, is_demo
)
insert into demo_clear_real select id from made where is_demo = false;

-- One demo stats row and one real stats row for a day no real visit can have.
insert into public.daily_stats (day, site, is_demo)
values ('2000-01-01', 'A', true), ('2000-01-01', 'A', false);

-- The simulator is on, so the call must switch it off.
update public.demo_settings set running = true;

-- 01: the app's patient role may not clear anything. The call must fail, and nothing is deleted.
set local role authenticated;
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"patient"}}', true);

do $$
begin
  perform public.clear_demo_data();
  insert into demo_clear_rows values ('01 non-staff refused', 0);
exception when insufficient_privilege then
  insert into demo_clear_rows values ('01 non-staff refused', 1);
end $$;

-- 02: staff clear the demo data. The call returns the number of demo visits it deleted.
select set_config('request.jwt.claims', '{"role":"authenticated","app_metadata":{"role":"staff"}}', true);

insert into demo_clear_rows
select '02 visits deleted by the call', public.clear_demo_data();

-- Back to the owner, to read the results.
reset role;

insert into demo_clear_rows
select '03 demo visits left', count(*) from public.visits where is_demo = true;

insert into demo_clear_rows
select '04 real test visits left', count(*) from public.visits v
where v.id in (select id from demo_clear_real);

insert into demo_clear_rows
select '05 demo stats rows left', count(*) from public.daily_stats where is_demo = true;

insert into demo_clear_rows
select '06 real stats row left', count(*) from public.daily_stats
where day = '2000-01-01' and is_demo = false;

insert into demo_clear_rows
select '07 simulator running', count(*) from public.demo_settings where running = true;

select check_case, count_value from demo_clear_rows order by check_case;

rollback;
