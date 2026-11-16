-- Check for the wait gap in get_patient_visit (migration 20261116000000_wait_gap_distinct_moments.sql).
-- Run it in the Supabase SQL Editor after that migration. It saves nothing: everything happens
-- inside "begin ... rollback", so the synthetic visits, the paused trigger and the cleared
-- call-back times all go away at the end.
--
-- Why the trigger is paused: visits_before_write sets every new called_at to now(), so this
-- check could not put call-backs at different times. Why real call-back times are cleared:
-- real call-backs at the same site would change the average.
--
-- Expected result (2 rows):
--   site A  average_gap_minutes = 25
--     Moments 60, 40 and 10 minutes ago count. The "Recall all" of 3 visits 60 minutes ago is
--     one moment, and the call-back 4 hours ago is too old. 3 moments give 2 gaps: (60 - 10) / 2 = 25.
--     The old function gave 46 here: (240 - 10) / 5.
--   site B  average_gap_minutes = null
--     Only one distinct moment (a "Recall all" of 2 visits), so the phone uses 15 minutes per place.

begin;

alter table public.visits disable trigger visits_before_write;
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

select v.site, v.average_gap_minutes
from (
  select * from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZA0')
  union all
  select * from public.get_patient_visit('ZZZZZZZZZZZZZZZZZZZZZZZZB0')
) v
order by v.site;

rollback;
