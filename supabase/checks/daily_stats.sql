-- Check for the 24-hour clean-up (migration 20261116100000_daily_stats_and_cleanup.sql).
-- Run the whole file at once in the Supabase SQL Editor, after that migration. It saves nothing:
-- everything happens inside "begin ... rollback", so the synthetic visits, the paused trigger,
-- the real visits that the clean-up deletes and the daily_stats rows all come back as they were.
--
-- Why the trigger is paused: visits_before_write sets every new time to now(), so this check
-- could not make visits that are more than 24 hours old.
-- Why January 2000: no real visit can count on those dates, and Toronto is on EST (UTC-5) then.
-- D1 = 2000-01-01 and D2 = 2000-01-02, both Toronto dates.
--
-- The synthetic visits (all site A and not demo, unless the line says so):
--   5A  desk, CTAS 4, triaged and offered D1, called 12:00, arrived 12:30 D1 (1800 s)
--   5B  desk, CTAS 5, triaged and offered D1 23:30, arrived D2 00:30 (2400 s): the midnight case
--   5C  desk, CTAS 4, triaged and offered D1, declined
--   5D  desk, not eligible (no CTAS), triaged D1
--   5E  desk, CTAS 4, triaged and offered D1, no-show closed D2 01:00
--   5F  desk, CTAS 5, triaged and offered D2, unable to reach closed D2
--   5G  home, created D1 22:00, triaged and offered D2, arrived 20 min after the call (1200 s),
--       closed D2, survey 10
--   5H  home, created D2, never triaged (pre_arrival)
--   5J  desk, CTAS 5, triaged and offered D2, came to the desk without a call, closed D2, survey 6
--   5K  site B, demo, CTAS 4, triaged D2, still waiting
--   5P  24 hours 5 minutes old: deleted (it counts on a real date, so it is not in the rows)
--   5N  23 hours old: must stay
-- A daily_stats row is already there for (D2, A, not demo): 100 triaged, 5 surveys, score sum 40.
-- The clean-up must add to it, not replace it.
--
-- Expected result (3 rows, visits_left = 1 on each row, the 23-hour visit 5N):
--   D1 A false  triaged 4  not_eligible 1  offered 4  declined 1  called_and_arrived 1
--               call_to_arrival_seconds 1800  no_shows 0  unable_to_reach 0
--               started_from_home 1  home_reached_triage 1  surveys 0  score_sum 0  9_or_10 0
--   D2 A false  triaged 103  not_eligible 0  offered 3  declined 0  called_and_arrived 2
--               call_to_arrival_seconds 3600  no_shows 1  unable_to_reach 1
--               started_from_home 1  home_reached_triage 0  surveys 7  score_sum 56  9_or_10 1
--   D2 B true   triaged 1, every other number 0
-- Notes: 5B counts as triaged on D1 but as arrived on D2. 5G counts as started from home on D1
-- (its created date) but as triaged on D2. 5J has no call time, so it is not in called_and_arrived.

begin;

alter table public.visits disable trigger visits_before_write;

insert into public.daily_stats (day, site, is_demo, triaged_ctas_4_5, survey_responses, survey_score_sum)
values ('2000-01-02', 'A', false, 100, 5, 40);

insert into public.visits
  (code, access_token, site, source, ctas_level, status, removed_reason, is_demo,
   created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score)
values
  ('ZZZZ5A', 'ZZZZZZZZZZZZZZZZZZZZZZZZD0', 'A', 'desk', 4, 'arrived', null, false,
   '2000-01-01 10:00 America/Toronto', '2000-01-01 10:00 America/Toronto', '2000-01-01 10:05 America/Toronto',
   '2000-01-01 12:00 America/Toronto', '2000-01-01 12:30 America/Toronto', null, null),
  ('ZZZZ5B', 'ZZZZZZZZZZZZZZZZZZZZZZZZD1', 'A', 'desk', 5, 'arrived', null, false,
   '2000-01-01 23:30 America/Toronto', '2000-01-01 23:30 America/Toronto', '2000-01-01 23:35 America/Toronto',
   '2000-01-01 23:50 America/Toronto', '2000-01-02 00:30 America/Toronto', null, null),
  ('ZZZZ5C', 'ZZZZZZZZZZZZZZZZZZZZZZZZD2', 'A', 'desk', 4, 'declined', null, false,
   '2000-01-01 09:00 America/Toronto', '2000-01-01 09:00 America/Toronto', '2000-01-01 09:05 America/Toronto',
   null, null, null, null),
  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZD3', 'A', 'desk', null, 'not_eligible', null, false,
   '2000-01-01 08:00 America/Toronto', '2000-01-01 08:00 America/Toronto', null,
   null, null, null, null),
  ('ZZZZ5E', 'ZZZZZZZZZZZZZZZZZZZZZZZZD4', 'A', 'desk', 4, 'removed', 'no_show', false,
   '2000-01-01 14:00 America/Toronto', '2000-01-01 14:00 America/Toronto', '2000-01-01 14:05 America/Toronto',
   '2000-01-01 20:00 America/Toronto', null, '2000-01-02 01:00 America/Toronto', null),
  ('ZZZZ5F', 'ZZZZZZZZZZZZZZZZZZZZZZZZD5', 'A', 'desk', 5, 'unable_to_reach', null, false,
   '2000-01-02 08:00 America/Toronto', '2000-01-02 08:00 America/Toronto', '2000-01-02 08:05 America/Toronto',
   '2000-01-02 09:00 America/Toronto', null, '2000-01-02 10:00 America/Toronto', null),
  ('ZZZZ5G', 'ZZZZZZZZZZZZZZZZZZZZZZZZD6', 'A', 'home', 4, 'arrived', null, false,
   '2000-01-01 22:00 America/Toronto', '2000-01-02 01:00 America/Toronto', '2000-01-02 01:05 America/Toronto',
   '2000-01-02 03:00 America/Toronto', '2000-01-02 03:20 America/Toronto', '2000-01-02 05:00 America/Toronto', 10),
  ('ZZZZ5H', 'ZZZZZZZZZZZZZZZZZZZZZZZZD7', 'A', 'home', null, 'pre_arrival', null, false,
   '2000-01-02 06:00 America/Toronto', null, null,
   null, null, null, null),
  ('ZZZZ5J', 'ZZZZZZZZZZZZZZZZZZZZZZZZD8', 'A', 'desk', 5, 'arrived', null, false,
   '2000-01-02 11:00 America/Toronto', '2000-01-02 11:00 America/Toronto', '2000-01-02 11:05 America/Toronto',
   null, '2000-01-02 12:00 America/Toronto', '2000-01-02 12:30 America/Toronto', 6),
  ('ZZZZ5K', 'ZZZZZZZZZZZZZZZZZZZZZZZZD9', 'B', 'desk', 4, 'waiting', null, true,
   '2000-01-02 07:00 America/Toronto', '2000-01-02 07:00 America/Toronto', null,
   null, null, null, null),
  ('ZZZZ5P', 'ZZZZZZZZZZZZZZZZZZZZZZZZE0', 'A', 'desk', null, 'not_eligible', null, false,
   now() - interval '24 hours 5 minutes', now() - interval '24 hours 5 minutes', null,
   null, null, null, null),
  ('ZZZZ5N', 'ZZZZZZZZZZZZZZZZZZZZZZZZE1', 'A', 'desk', 4, 'waiting', null, false,
   now() - interval '23 hours', now() - interval '23 hours', null,
   null, null, null, null);

select public.delete_old_visits();

select s.day, s.site, s.is_demo,
       s.triaged_ctas_4_5, s.not_eligible, s.offered, s.declined,
       s.called_and_arrived, s.call_to_arrival_seconds, s.no_shows, s.unable_to_reach,
       s.started_from_home, s.home_reached_triage,
       s.survey_responses, s.survey_score_sum, s.survey_9_or_10,
       (select count(*) from public.visits where code like 'ZZZZ5%') as visits_left
from public.daily_stats s
where s.day < '2001-01-01'
order by s.day, s.site, s.is_demo;

rollback;
