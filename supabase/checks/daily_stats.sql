-- Check for the 24-hour clean-up (made in migration 20261116100000_daily_stats_and_cleanup.sql;
-- the newest copy of delete_old_visits is in 20261121000000_patient_view_offered_at.sql).
-- Run the whole file at once in the Supabase SQL Editor, after those migrations. It saves nothing:
-- everything happens inside "begin ... rollback", so the synthetic visits, the paused trigger,
-- the real visits that the clean-up deletes and the daily_stats rows all come back as they were.
-- If a number is wrong, the run stops with an error that names the row, what it got and what
-- it expected (and still saves nothing). If all is right, it shows the 5 rows below.
--
-- Why the trigger is paused: visits_before_write sets every new time to now(), so this check
-- could not make visits that are more than 24 hours old.
-- Why the year 2000: no real visit can count on those dates. Toronto is on EST (UTC-5) in
-- January and on EDT (UTC-4) in July.
-- D1 = 2000-01-01, D2 = 2000-01-02, D3 = 2000-07-01, D4 = 2000-07-02, all Toronto dates.
--
-- The synthetic visits (all site A and not demo, unless the line says so). As in the app, every
-- visit triaged as not eligible has a CTAS level, and Mark arrived sets closed_at = arrived_at,
-- except on 5A and 5D: their closed_at is on D2, so a number that counts on the wrong time
-- column lands on the wrong day.
--   5A  desk, CTAS 4, triaged and offered D1, called 12:00, arrived 12:30 D1 (1800 s), closed D2
--   5B  desk, CTAS 5, triaged and offered D1 23:30, arrived D2 00:30 (2400 s): the midnight case
--   5C  desk, CTAS 4, triaged and offered D1, declined
--   5D  desk, CTAS 5, not eligible, triaged D1, closed D2
--   5E  desk, CTAS 4, triaged and offered D1, no-show closed D2 01:00. It has an arrived_at, so
--       only the status filter keeps it out of arrived and called_and_arrived
--   5F  desk, CTAS 5, triaged and offered D2, unable to reach closed D2
--   5G  home, created D1 22:00, triaged and offered D2, arrived 20 min after the call (1200 s), survey 10
--   5H  home, created D2, never triaged (pre_arrival)
--   5J  desk, CTAS 5, triaged and offered D2, came to the desk without a call, survey 6
--   5K  site B, demo, CTAS 4, triaged and offered D2, still waiting when deleted
--   5T, 5U, 5V  site B, demo, CTAS 4 or 5, triaged and offered D2, still called, on_the_way and
--       needs_reassessment when deleted (one for each of the other open statuses)
--   5M  desk, CTAS 4, triaged and offered D2, removed as left
--   5Q  desk, CTAS 4, triaged and offered D1, arrived 10 min after the call (600 s), survey 9
--   5R  desk, CTAS 5, triaged and offered D2, arrived 30 min after the call (1800 s), survey 8
--   5W  desk, CTAS 4, triaged D1 and declined, then switched to off-site waiting on D2
--       (offered_at on D2), still waiting when deleted. Its offer counts on D1, the triage day.
--   5S  desk, CTAS 4, triaged and offered D3 23:00 EDT, called 23:45, arrived D4 00:30 EDT (2700 s).
--       In UTC its triage is already D4; with a fixed UTC-5 its arrival would still be D3.
--   5P  24 hours 5 minutes old, CTAS 4, not eligible: deleted. It counts on a real date, so the
--       check reads that day's row before and after (triaged and not eligible), and compares
--       with a recount.
--   5N  23 hours old: must stay
-- A daily_stats row is already there for (D2, A, not demo): 100 triaged, 5 surveys, score sum 40.
-- The clean-up must add to it, not replace it. After the first run, no visit older than 24 hours
-- may be left. A second run must change nothing.
--
-- Expected numbers, in this order: triaged, not_eligible, offered, declined,
-- called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
-- open_at_deletion, started_from_home, home_reached_triage, surveys, score_sum, 9_or_10
--   D1 A false  7 1 6 1 2 2400 2 0 0 0 1 1 1 1 9 1
--   D2 A false  105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1
--   D2 B true   4 0 4 0 0 0 0 0 0 0 4 0 0 0 0 0
--   D3 A false  1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0
--   D4 A false  0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0
-- Notes: 5B counts as triaged on D1 but as arrived on D2. 5G counts as started from home on D1
-- (its created date) but as triaged on D2. 5J has no call time, so it is in arrived but not in
-- called_and_arrived. 5K, 5T, 5U, 5V and 5W count as open at deletion on their triaged date.
-- 5W is offered on D1, not D2: if D2 shows 6 offers, the clean-up counts on offered_at.

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
   '2000-01-01 12:00 America/Toronto', '2000-01-01 12:30 America/Toronto', '2000-01-02 09:00 America/Toronto', null),
  ('ZZZZ5B', 'ZZZZZZZZZZZZZZZZZZZZZZZZD1', 'A', 'desk', 5, 'arrived', null, false,
   '2000-01-01 23:30 America/Toronto', '2000-01-01 23:30 America/Toronto', '2000-01-01 23:35 America/Toronto',
   '2000-01-01 23:50 America/Toronto', '2000-01-02 00:30 America/Toronto', '2000-01-02 00:30 America/Toronto', null),
  ('ZZZZ5C', 'ZZZZZZZZZZZZZZZZZZZZZZZZD2', 'A', 'desk', 4, 'declined', null, false,
   '2000-01-01 09:00 America/Toronto', '2000-01-01 09:00 America/Toronto', '2000-01-01 09:05 America/Toronto',
   null, null, '2000-01-01 09:05 America/Toronto', null),
  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZD3', 'A', 'desk', 5, 'not_eligible', null, false,
   '2000-01-01 08:00 America/Toronto', '2000-01-01 08:00 America/Toronto', null,
   null, null, '2000-01-02 08:00 America/Toronto', null),
  ('ZZZZ5E', 'ZZZZZZZZZZZZZZZZZZZZZZZZD4', 'A', 'desk', 4, 'removed', 'no_show', false,
   '2000-01-01 14:00 America/Toronto', '2000-01-01 14:00 America/Toronto', '2000-01-01 14:05 America/Toronto',
   '2000-01-01 20:00 America/Toronto', '2000-01-01 20:30 America/Toronto', '2000-01-02 01:00 America/Toronto', null),
  ('ZZZZ5F', 'ZZZZZZZZZZZZZZZZZZZZZZZZD5', 'A', 'desk', 5, 'unable_to_reach', null, false,
   '2000-01-02 08:00 America/Toronto', '2000-01-02 08:00 America/Toronto', '2000-01-02 08:05 America/Toronto',
   '2000-01-02 09:00 America/Toronto', null, '2000-01-02 10:00 America/Toronto', null),
  ('ZZZZ5G', 'ZZZZZZZZZZZZZZZZZZZZZZZZD6', 'A', 'home', 4, 'arrived', null, false,
   '2000-01-01 22:00 America/Toronto', '2000-01-02 01:00 America/Toronto', '2000-01-02 01:05 America/Toronto',
   '2000-01-02 03:00 America/Toronto', '2000-01-02 03:20 America/Toronto', '2000-01-02 03:20 America/Toronto', 10),
  ('ZZZZ5H', 'ZZZZZZZZZZZZZZZZZZZZZZZZD7', 'A', 'home', null, 'pre_arrival', null, false,
   '2000-01-02 06:00 America/Toronto', null, null,
   null, null, null, null),
  ('ZZZZ5J', 'ZZZZZZZZZZZZZZZZZZZZZZZZD8', 'A', 'desk', 5, 'arrived', null, false,
   '2000-01-02 11:00 America/Toronto', '2000-01-02 11:00 America/Toronto', '2000-01-02 11:05 America/Toronto',
   null, '2000-01-02 12:00 America/Toronto', '2000-01-02 12:00 America/Toronto', 6),
  ('ZZZZ5K', 'ZZZZZZZZZZZZZZZZZZZZZZZZD9', 'B', 'desk', 4, 'waiting', null, true,
   '2000-01-02 07:00 America/Toronto', '2000-01-02 07:00 America/Toronto', '2000-01-02 07:05 America/Toronto',
   null, null, null, null),
  ('ZZZZ5T', 'ZZZZZZZZZZZZZZZZZZZZZZZZE6', 'B', 'desk', 5, 'called', null, true,
   '2000-01-02 08:00 America/Toronto', '2000-01-02 08:00 America/Toronto', '2000-01-02 08:05 America/Toronto',
   '2000-01-02 09:00 America/Toronto', null, null, null),
  ('ZZZZ5U', 'ZZZZZZZZZZZZZZZZZZZZZZZZE7', 'B', 'desk', 4, 'on_the_way', null, true,
   '2000-01-02 09:00 America/Toronto', '2000-01-02 09:00 America/Toronto', '2000-01-02 09:05 America/Toronto',
   '2000-01-02 10:00 America/Toronto', null, null, null),
  ('ZZZZ5V', 'ZZZZZZZZZZZZZZZZZZZZZZZZE8', 'B', 'desk', 5, 'needs_reassessment', null, true,
   '2000-01-02 10:00 America/Toronto', '2000-01-02 10:00 America/Toronto', '2000-01-02 10:05 America/Toronto',
   '2000-01-02 11:00 America/Toronto', null, null, null),
  ('ZZZZ5M', 'ZZZZZZZZZZZZZZZZZZZZZZZZE2', 'A', 'desk', 4, 'removed', 'left', false,
   '2000-01-02 13:00 America/Toronto', '2000-01-02 13:00 America/Toronto', '2000-01-02 13:05 America/Toronto',
   null, null, '2000-01-02 14:00 America/Toronto', null),
  ('ZZZZ5Q', 'ZZZZZZZZZZZZZZZZZZZZZZZZE3', 'A', 'desk', 4, 'arrived', null, false,
   '2000-01-01 09:30 America/Toronto', '2000-01-01 09:30 America/Toronto', '2000-01-01 09:35 America/Toronto',
   '2000-01-01 10:00 America/Toronto', '2000-01-01 10:10 America/Toronto', '2000-01-01 10:10 America/Toronto', 9),
  ('ZZZZ5R', 'ZZZZZZZZZZZZZZZZZZZZZZZZE4', 'A', 'desk', 5, 'arrived', null, false,
   '2000-01-02 14:00 America/Toronto', '2000-01-02 14:00 America/Toronto', '2000-01-02 14:05 America/Toronto',
   '2000-01-02 15:00 America/Toronto', '2000-01-02 15:30 America/Toronto', '2000-01-02 15:30 America/Toronto', 8),
  ('ZZZZ5W', 'ZZZZZZZZZZZZZZZZZZZZZZZZE9', 'A', 'desk', 4, 'waiting', null, false,
   '2000-01-01 15:00 America/Toronto', '2000-01-01 15:00 America/Toronto', '2000-01-02 09:00 America/Toronto',
   null, null, null, null),
  ('ZZZZ5S', 'ZZZZZZZZZZZZZZZZZZZZZZZZE5', 'A', 'desk', 4, 'arrived', null, false,
   '2000-07-01 23:00 America/Toronto', '2000-07-01 23:00 America/Toronto', '2000-07-01 23:00 America/Toronto',
   '2000-07-01 23:45 America/Toronto', '2000-07-02 00:30 America/Toronto', '2000-07-02 00:30 America/Toronto', null),
  ('ZZZZ5P', 'ZZZZZZZZZZZZZZZZZZZZZZZZE0', 'A', 'desk', 4, 'not_eligible', null, false,
   now() - interval '24 hours 5 minutes', now() - interval '24 hours 5 minutes', null,
   null, null, now() - interval '24 hours 5 minutes', null),
  ('ZZZZ5N', 'ZZZZZZZZZZZZZZZZZZZZZZZZE1', 'A', 'desk', 4, 'waiting', null, false,
   now() - interval '23 hours', now() - interval '23 hours', now() - interval '23 hours',
   null, null, null, null);

-- 5P's real day: its triaged and not_eligible totals now, and a recount of the old visits that
-- the clean-up must add to them (5P and any real ones). now() is the same all through one transaction.
create temp table real_day as
select d.day,
       coalesce((select s.not_eligible from public.daily_stats s
                 where s.day = d.day and s.site = 'A' and not s.is_demo), 0) as before,
       (select count(*) from public.visits v
        where v.created_at < now() - interval '24 hours' and v.status = 'not_eligible'
          and v.triaged_at is not null and v.site = 'A' and not v.is_demo
          and (v.triaged_at at time zone 'America/Toronto')::date = d.day) as to_add,
       coalesce((select s.triaged_ctas_4_5 from public.daily_stats s
                 where s.day = d.day and s.site = 'A' and not s.is_demo), 0) as before_triaged,
       (select count(*) from public.visits v
        where v.created_at < now() - interval '24 hours' and v.ctas_level in (4, 5)
          and v.triaged_at is not null and v.site = 'A' and not v.is_demo
          and (v.triaged_at at time zone 'America/Toronto')::date = d.day) as to_add_triaged
from (select ((now() - interval '24 hours 5 minutes') at time zone 'America/Toronto')::date as day) d;

select public.delete_old_visits();

-- After the first run, no visit older than 24 hours may be left.
create temp table old_left as
select count(*) as n from public.visits where created_at < now() - interval '24 hours';

-- A second run must change nothing.
create temp table after_first as select * from public.daily_stats;
select public.delete_old_visits();

-- One daily_stats row as one line of numbers, in the order of the expected list above.
create function pg_temp.stats_line(d date, s text, demo boolean) returns text language sql as $$
  select concat_ws(' ', triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
    open_at_deletion, started_from_home, home_reached_triage,
    survey_responses, survey_score_sum, survey_9_or_10)
  from public.daily_stats where day = d and site = s and is_demo = demo
$$;

do $$
declare
  want record;
  got text;
  r real_day%rowtype;
  now_ne integer;
  now_triaged integer;
begin
  for want in
    select * from (values
      ('2000-01-01'::date, 'A', false, '7 1 6 1 2 2400 2 0 0 0 1 1 1 1 9 1'),
      ('2000-01-02'::date, 'A', false, '105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1'),
      ('2000-01-02'::date, 'B', true,  '4 0 4 0 0 0 0 0 0 0 4 0 0 0 0 0'),
      ('2000-07-01'::date, 'A', false, '1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0'),
      ('2000-07-02'::date, 'A', false, '0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0')
    ) as w(day, site, is_demo, line)
  loop
    got := pg_temp.stats_line(want.day, want.site, want.is_demo);
    if got is distinct from want.line then
      raise exception '% % %: got "%", expected "%"', want.day, want.site, want.is_demo, got, want.line;
    end if;
  end loop;

  if (select count(*) from public.daily_stats where day < '2001-01-01') <> 5 then
    raise exception 'expected 5 rows in the year 2000, got %',
      (select count(*) from public.daily_stats where day < '2001-01-01');
  end if;

  select * into r from real_day;
  select coalesce(max(not_eligible), 0), coalesce(max(triaged_ctas_4_5), 0)
    into now_ne, now_triaged from public.daily_stats
    where day = r.day and site = 'A' and not is_demo;
  if r.to_add < 1 or now_ne <> r.before + r.to_add then
    raise exception '5P day %: not_eligible was %, is %, expected % (recount %)',
      r.day, r.before, now_ne, r.before + r.to_add, r.to_add;
  end if;
  if r.to_add_triaged < 1 or now_triaged <> r.before_triaged + r.to_add_triaged then
    raise exception '5P day %: triaged was %, is %, expected % (recount %)',
      r.day, r.before_triaged, now_triaged, r.before_triaged + r.to_add_triaged, r.to_add_triaged;
  end if;

  if (select n from old_left) <> 0 then
    raise exception 'after the first run, % visits older than 24 hours are left', (select n from old_left);
  end if;

  if exists (select * from public.daily_stats except select * from after_first)
     or exists (select * from after_first except select * from public.daily_stats) then
    raise exception 'the second run changed daily_stats';
  end if;

  if (select array_agg(code) from public.visits where code like 'ZZZZ5%') is distinct from array['ZZZZ5N'] then
    raise exception 'expected only ZZZZ5N left, got %',
      (select array_agg(code) from public.visits where code like 'ZZZZ5%');
  end if;
end;
$$;

-- All checks passed. The 5 rows, for a last look.
select s.day, s.site, s.is_demo, pg_temp.stats_line(s.day, s.site, s.is_demo) as numbers
from public.daily_stats s
where s.day < '2001-01-01'
order by s.day, s.site, s.is_demo;

rollback;
