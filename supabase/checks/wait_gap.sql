-- Check for the wait gap in get_patient_visit (migration 20261116000000_wait_gap_distinct_moments.sql).
-- Run the whole file at once (do not select and run one part): the Editor shows only the last
-- result, so the file keeps the first results in a temp table and shows all rows at the end.
-- Run it in the Supabase SQL Editor after that migration. It saves nothing: everything happens
-- inside "begin ... rollback", so the synthetic visits, the paused triggers and the cleared
-- call-back times all go away at the end.
--
-- Why the triggers are paused: visits_before_write sets every new called_at to now(), so this
-- check could not put call-backs at different times; visits_check_step refuses a new visit that
-- starts as arrived or called. Why real call-back times are cleared:
-- real call-backs at the same site would change the average.
--
-- Expected result (5 rows):
--   1 site A  average_gap_minutes = 25
--     Moments 60, 40 and 10 minutes ago count. The "Recall all" of 3 visits 60 minutes ago is
--     one moment, and the call-back 4 hours ago is too old. 3 moments give 2 gaps: (60 - 10) / 2 = 25.
--     The old function gave 46 here: (240 - 10) / 5.
--   2 site B  average_gap_minutes = null
--     Only one distinct moment (a "Recall all" of 2 visits), so the phone uses 15 minutes per place.
--   3 site B, 7 moments  average_gap_minutes = 16
--     6 more call-backs at 20, 40, 60, 80, 100 and 170 minutes ago, next to the one at 30.
--     Only the newest 6 moments count: (100 - 20) / 5 = 16. The oldest 6 would give
--     (170 - 30) / 5 = 28, and no limit would give (170 - 20) / 6 = 25.
--   4 site A, not waiting  average_gap_minutes = null
--     A patient who already arrived gets no wait gap, even with call-backs at the site.
--   5 site A, called  average_gap_minutes = null
--     A patient who is called (not waiting any more) gets no wait gap either. Without this row,
--     a function that checks "not arrived" instead of "waiting" would still pass case 4.

begin;

alter table public.visits disable trigger visits_before_write;
-- The test visits start as arrived or called; visits_check_step (20261117000000) refuses that
-- for a new visit. This file checks the wait gap, not the steps (allowed_steps.sql does).
alter table public.visits disable trigger visits_check_step;
update public.visits set called_at = null where called_at is not null;

insert into public.visits (code, access_token, site, source, status, triaged_at, called_at) values
  -- Site A: the patient who reads the page, and 6 call-backs.
  ('ZZZZ2A', 'ZZZZZZZZZZZZZZZZZZZZZZZZA0', 'A', 'desk', 'waiting', now() - interval '5 minutes', null),
  ('ZZZZ2B', 'ZZZZZZZZZZZZZZZZZZZZZZZZA1', 'A', 'desk', 'arrived', now() - interval '5 hours', now() - interval '4 hours'),
  ('ZZZZ2C', 'ZZZZZZZZZZZZZZZZZZZZZZZZA2', 'A', 'desk', 'arrived', now() - interval '2 hours', now() - interval '60 minutes'),
  ('ZZZZ2D', 'ZZZZZZZZZZZZZZZZZZZZZZZZA3', 'A', 'desk', 'arrived', now() - interval '2 hours', now() - interval '60 minutes'),
  ('ZZZZ2E', 'ZZZZZZZZZZZZZZZZZZZZZZZZA4', 'A', 'desk', 'arrived', now() - interval '2 hours', now() - interval '60 minutes'),
  ('ZZZZ2F', 'ZZZZZZZZZZZZZZZZZZZZZZZZA5', 'A', 'desk', 'arrived', now() - interval '2 hours', now() - interval '40 minutes'),
  ('ZZZZ2G', 'ZZZZZZZZZZZZZZZZZZZZZZZZA6', 'A', 'desk', 'arrived', now() - interval '2 hours', now() - interval '10 minutes'),
  -- Site B: the patient who reads the page, and one "Recall all" of 2 visits.
  ('ZZZZ3A', 'ZZZZZZZZZZZZZZZZZZZZZZZZB0', 'B', 'desk', 'waiting', now() - interval '5 minutes', null),
  ('ZZZZ3B', 'ZZZZZZZZZZZZZZZZZZZZZZZZB1', 'B', 'desk', 'arrived', now() - interval '2 hours', now() - interval '30 minutes'),
  ('ZZZZ3C', 'ZZZZZZZZZZZZZZZZZZZZZZZZB2', 'B', 'desk', 'arrived', now() - interval '2 hours', now() - interval '30 minutes');

-- Rows 1 and 2, kept until the end (the temp table goes away with the rollback).
create temp table wait_gap_rows as
select '1 site A' as check_case, v.average_gap_minutes
from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZA0') v
union all
select '2 site B', v.average_gap_minutes
from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZB0') v;

insert into public.visits (code, access_token, site, source, status, triaged_at, called_at) values
  -- Site B: 6 more call-backs, so 7 distinct moments in all (row 3).
  ('ZZZZ3D', 'ZZZZZZZZZZZZZZZZZZZZZZZZB3', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '20 minutes'),
  ('ZZZZ3E', 'ZZZZZZZZZZZZZZZZZZZZZZZZB4', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '40 minutes'),
  ('ZZZZ3F', 'ZZZZZZZZZZZZZZZZZZZZZZZZB5', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '60 minutes'),
  ('ZZZZ3G', 'ZZZZZZZZZZZZZZZZZZZZZZZZB6', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '80 minutes'),
  ('ZZZZ3H', 'ZZZZZZZZZZZZZZZZZZZZZZZZB7', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '100 minutes'),
  ('ZZZZ3J', 'ZZZZZZZZZZZZZZZZZZZZZZZZB8', 'B', 'desk', 'arrived', now() - interval '3 hours', now() - interval '170 minutes'),
  -- Site A: a patient who already arrived and was never called (row 4).
  ('ZZZZ4A', 'ZZZZZZZZZZZZZZZZZZZZZZZZC0', 'A', 'desk', 'arrived', now() - interval '30 minutes', null),
  -- Site A: a patient who is called now (row 5).
  ('ZZZZ4B', 'ZZZZZZZZZZZZZZZZZZZZZZZZC1', 'A', 'desk', 'called', now() - interval '30 minutes', now() - interval '5 minutes');

insert into wait_gap_rows
select '3 site B, 7 moments', v.average_gap_minutes
from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZB0') v
union all
select '4 site A, not waiting', v.average_gap_minutes
from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZC0') v
union all
select '5 site A, called', v.average_gap_minutes
from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZC1') v;

select check_case, average_gap_minutes from wait_gap_rows order by check_case;

rollback;
