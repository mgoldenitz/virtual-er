# Gemini review: daily_stats fixes after the first review

Model: Gemini Hydrogen 4, High, in a new chat (fallback: Gemini 3.6 Flash, High).

## Text to paste

You review a concept prototype that has only synthetic data (Supabase Postgres, pg_cron). Find problems; do not confirm. An earlier review asked for these changes, and they are now made: (1) 3 more totals in `daily_stats`: `arrived`, `removed_left`, `open_at_deletion`; (2) `called_and_arrived` and its seconds count status `arrived` only; (3) `delete_old_visits()` is now plpgsql, with 2 guards first: `pg_try_advisory_xact_lock`, and stop when no visit is more than 24 hours old; (4) `service_role` added to the revoke; (5) a second cron job deletes `cron.job_run_details` rows older than 7 days; (6) the check file now has `raise exception` asserts, an EDT visit, scores 9 and 8, a `left` removal, a real-date check for one visit and a second run that must change nothing.

Rules: each number counts on the Toronto date of its own event. Visits are deleted 24 hours after `created_at`, whatever the status. Open statuses are `waiting`, `called`, `on_the_way`, `needs_reassessment`. Closed are `arrived`, `declined`, `not_eligible`, `removed` (reason `no_show` or `left`), `unable_to_reach`.

Questions:
1. Is each new `events` line correct for its column comment? Is any visit counted twice or missed?
2. Is the guard correct? Is there a case where the lock or the `exists` test lets two runs both delete, or stops a run that should delete?
3. Can the check file pass while the migration is wrong (an assert that cannot fail)?
4. Is anything in the cron log clean-up unsafe?
Give each problem with the line, a concrete case, and the smallest fix.

The diff (git diff 455cf05 4344542):

```diff
diff --git a/supabase/checks/daily_stats.sql b/supabase/checks/daily_stats.sql
index 8aaa7de..4373d73 100644
--- a/supabase/checks/daily_stats.sql
+++ b/supabase/checks/daily_stats.sql
@@ -2,39 +2,49 @@
 -- Run the whole file at once in the Supabase SQL Editor, after that migration. It saves nothing:
 -- everything happens inside "begin ... rollback", so the synthetic visits, the paused trigger,
 -- the real visits that the clean-up deletes and the daily_stats rows all come back as they were.
+-- If a number is wrong, the run stops with an error that names the row, what it got and what
+-- it expected (and still saves nothing). If all is right, it shows the 5 rows below.
 --
 -- Why the trigger is paused: visits_before_write sets every new time to now(), so this check
 -- could not make visits that are more than 24 hours old.
--- Why January 2000: no real visit can count on those dates, and Toronto is on EST (UTC-5) then.
--- D1 = 2000-01-01 and D2 = 2000-01-02, both Toronto dates.
+-- Why the year 2000: no real visit can count on those dates. Toronto is on EST (UTC-5) in
+-- January and on EDT (UTC-4) in July.
+-- D1 = 2000-01-01, D2 = 2000-01-02, D3 = 2000-07-01, D4 = 2000-07-02, all Toronto dates.
 --
--- The synthetic visits (all site A and not demo, unless the line says so):
+-- The synthetic visits (all site A and not demo, unless the line says so). As in the app, every
+-- visit triaged as not eligible has a CTAS level, and Mark arrived sets closed_at = arrived_at:
 --   5A  desk, CTAS 4, triaged and offered D1, called 12:00, arrived 12:30 D1 (1800 s)
 --   5B  desk, CTAS 5, triaged and offered D1 23:30, arrived D2 00:30 (2400 s): the midnight case
 --   5C  desk, CTAS 4, triaged and offered D1, declined
---   5D  desk, not eligible (no CTAS), triaged D1
+--   5D  desk, CTAS 5, not eligible, triaged D1
 --   5E  desk, CTAS 4, triaged and offered D1, no-show closed D2 01:00
 --   5F  desk, CTAS 5, triaged and offered D2, unable to reach closed D2
---   5G  home, created D1 22:00, triaged and offered D2, arrived 20 min after the call (1200 s),
---       closed D2, survey 10
+--   5G  home, created D1 22:00, triaged and offered D2, arrived 20 min after the call (1200 s), survey 10
 --   5H  home, created D2, never triaged (pre_arrival)
---   5J  desk, CTAS 5, triaged and offered D2, came to the desk without a call, closed D2, survey 6
---   5K  site B, demo, CTAS 4, triaged D2, still waiting
---   5P  24 hours 5 minutes old: deleted (it counts on a real date, so it is not in the rows)
+--   5J  desk, CTAS 5, triaged and offered D2, came to the desk without a call, survey 6
+--   5K  site B, demo, CTAS 4, triaged and offered D2, still waiting when deleted
+--   5M  desk, CTAS 4, triaged and offered D2, removed as left
+--   5Q  desk, CTAS 4, triaged and offered D1, arrived 10 min after the call (600 s), survey 9
+--   5R  desk, CTAS 5, triaged and offered D2, arrived 30 min after the call (1800 s), survey 8
+--   5S  desk, CTAS 4, triaged and offered D3 23:00 EDT, called 23:45, arrived D4 00:30 EDT (2700 s).
+--       In UTC its triage is already D4; with a fixed UTC-5 its arrival would still be D3.
+--   5P  24 hours 5 minutes old, CTAS 4, not eligible: deleted. It counts on a real date, so the
+--       check reads that day's row before and after, and compares with a recount.
 --   5N  23 hours old: must stay
 -- A daily_stats row is already there for (D2, A, not demo): 100 triaged, 5 surveys, score sum 40.
--- The clean-up must add to it, not replace it.
+-- The clean-up must add to it, not replace it. A second run must change nothing.
 --
--- Expected result (3 rows, visits_left = 1 on each row, the 23-hour visit 5N):
---   D1 A false  triaged 4  not_eligible 1  offered 4  declined 1  called_and_arrived 1
---               call_to_arrival_seconds 1800  no_shows 0  unable_to_reach 0
---               started_from_home 1  home_reached_triage 1  surveys 0  score_sum 0  9_or_10 0
---   D2 A false  triaged 103  not_eligible 0  offered 3  declined 0  called_and_arrived 2
---               call_to_arrival_seconds 3600  no_shows 1  unable_to_reach 1
---               started_from_home 1  home_reached_triage 0  surveys 7  score_sum 56  9_or_10 1
---   D2 B true   triaged 1, every other number 0
+-- Expected numbers, in this order: triaged, not_eligible, offered, declined,
+-- called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
+-- open_at_deletion, started_from_home, home_reached_triage, surveys, score_sum, 9_or_10
+--   D1 A false  6 1 5 1 2 2400 2 0 0 0 0 1 1 1 9 1
+--   D2 A false  105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1
+--   D2 B true   1 0 1 0 0 0 0 0 0 0 1 0 0 0 0 0
+--   D3 A false  1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0
+--   D4 A false  0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0
 -- Notes: 5B counts as triaged on D1 but as arrived on D2. 5G counts as started from home on D1
--- (its created date) but as triaged on D2. 5J has no call time, so it is not in called_and_arrived.
+-- (its created date) but as triaged on D2. 5J has no call time, so it is in arrived but not in
+-- called_and_arrived. 5K counts as open at deletion on its triaged date.
 
 begin;
 
@@ -49,16 +59,16 @@ insert into public.visits
 values
   ('ZZZZ5A', 'ZZZZZZZZZZZZZZZZZZZZZZZZD0', 'A', 'desk', 4, 'arrived', null, false,
    '2000-01-01 10:00 America/Toronto', '2000-01-01 10:00 America/Toronto', '2000-01-01 10:05 America/Toronto',
-   '2000-01-01 12:00 America/Toronto', '2000-01-01 12:30 America/Toronto', null, null),
+   '2000-01-01 12:00 America/Toronto', '2000-01-01 12:30 America/Toronto', '2000-01-01 12:30 America/Toronto', null),
   ('ZZZZ5B', 'ZZZZZZZZZZZZZZZZZZZZZZZZD1', 'A', 'desk', 5, 'arrived', null, false,
    '2000-01-01 23:30 America/Toronto', '2000-01-01 23:30 America/Toronto', '2000-01-01 23:35 America/Toronto',
-   '2000-01-01 23:50 America/Toronto', '2000-01-02 00:30 America/Toronto', null, null),
+   '2000-01-01 23:50 America/Toronto', '2000-01-02 00:30 America/Toronto', '2000-01-02 00:30 America/Toronto', null),
   ('ZZZZ5C', 'ZZZZZZZZZZZZZZZZZZZZZZZZD2', 'A', 'desk', 4, 'declined', null, false,
    '2000-01-01 09:00 America/Toronto', '2000-01-01 09:00 America/Toronto', '2000-01-01 09:05 America/Toronto',
-   null, null, null, null),
-  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZD3', 'A', 'desk', null, 'not_eligible', null, false,
+   null, null, '2000-01-01 09:05 America/Toronto', null),
+  ('ZZZZ5D', 'ZZZZZZZZZZZZZZZZZZZZZZZZD3', 'A', 'desk', 5, 'not_eligible', null, false,
    '2000-01-01 08:00 America/Toronto', '2000-01-01 08:00 America/Toronto', null,
-   null, null, null, null),
+   null, null, '2000-01-01 08:00 America/Toronto', null),
   ('ZZZZ5E', 'ZZZZZZZZZZZZZZZZZZZZZZZZD4', 'A', 'desk', 4, 'removed', 'no_show', false,
    '2000-01-01 14:00 America/Toronto', '2000-01-01 14:00 America/Toronto', '2000-01-01 14:05 America/Toronto',
    '2000-01-01 20:00 America/Toronto', null, '2000-01-02 01:00 America/Toronto', null),
@@ -67,31 +77,111 @@ values
    '2000-01-02 09:00 America/Toronto', null, '2000-01-02 10:00 America/Toronto', null),
   ('ZZZZ5G', 'ZZZZZZZZZZZZZZZZZZZZZZZZD6', 'A', 'home', 4, 'arrived', null, false,
    '2000-01-01 22:00 America/Toronto', '2000-01-02 01:00 America/Toronto', '2000-01-02 01:05 America/Toronto',
-   '2000-01-02 03:00 America/Toronto', '2000-01-02 03:20 America/Toronto', '2000-01-02 05:00 America/Toronto', 10),
+   '2000-01-02 03:00 America/Toronto', '2000-01-02 03:20 America/Toronto', '2000-01-02 03:20 America/Toronto', 10),
   ('ZZZZ5H', 'ZZZZZZZZZZZZZZZZZZZZZZZZD7', 'A', 'home', null, 'pre_arrival', null, false,
    '2000-01-02 06:00 America/Toronto', null, null,
    null, null, null, null),
   ('ZZZZ5J', 'ZZZZZZZZZZZZZZZZZZZZZZZZD8', 'A', 'desk', 5, 'arrived', null, false,
    '2000-01-02 11:00 America/Toronto', '2000-01-02 11:00 America/Toronto', '2000-01-02 11:05 America/Toronto',
-   null, '2000-01-02 12:00 America/Toronto', '2000-01-02 12:30 America/Toronto', 6),
+   null, '2000-01-02 12:00 America/Toronto', '2000-01-02 12:00 America/Toronto', 6),
   ('ZZZZ5K', 'ZZZZZZZZZZZZZZZZZZZZZZZZD9', 'B', 'desk', 4, 'waiting', null, true,
-   '2000-01-02 07:00 America/Toronto', '2000-01-02 07:00 America/Toronto', null,
+   '2000-01-02 07:00 America/Toronto', '2000-01-02 07:00 America/Toronto', '2000-01-02 07:05 America/Toronto',
    null, null, null, null),
-  ('ZZZZ5P', 'ZZZZZZZZZZZZZZZZZZZZZZZZE0', 'A', 'desk', null, 'not_eligible', null, false,
+  ('ZZZZ5M', 'ZZZZZZZZZZZZZZZZZZZZZZZZE2', 'A', 'desk', 4, 'removed', 'left', false,
+   '2000-01-02 13:00 America/Toronto', '2000-01-02 13:00 America/Toronto', '2000-01-02 13:05 America/Toronto',
+   null, null, '2000-01-02 14:00 America/Toronto', null),
+  ('ZZZZ5Q', 'ZZZZZZZZZZZZZZZZZZZZZZZZE3', 'A', 'desk', 4, 'arrived', null, false,
+   '2000-01-01 09:30 America/Toronto', '2000-01-01 09:30 America/Toronto', '2000-01-01 09:35 America/Toronto',
+   '2000-01-01 10:00 America/Toronto', '2000-01-01 10:10 America/Toronto', '2000-01-01 10:10 America/Toronto', 9),
+  ('ZZZZ5R', 'ZZZZZZZZZZZZZZZZZZZZZZZZE4', 'A', 'desk', 5, 'arrived', null, false,
+   '2000-01-02 14:00 America/Toronto', '2000-01-02 14:00 America/Toronto', '2000-01-02 14:05 America/Toronto',
+   '2000-01-02 15:00 America/Toronto', '2000-01-02 15:30 America/Toronto', '2000-01-02 15:30 America/Toronto', 8),
+  ('ZZZZ5S', 'ZZZZZZZZZZZZZZZZZZZZZZZZE5', 'A', 'desk', 4, 'arrived', null, false,
+   '2000-07-01 23:00 America/Toronto', '2000-07-01 23:00 America/Toronto', '2000-07-01 23:00 America/Toronto',
+   '2000-07-01 23:45 America/Toronto', '2000-07-02 00:30 America/Toronto', '2000-07-02 00:30 America/Toronto', null),
+  ('ZZZZ5P', 'ZZZZZZZZZZZZZZZZZZZZZZZZE0', 'A', 'desk', 4, 'not_eligible', null, false,
    now() - interval '24 hours 5 minutes', now() - interval '24 hours 5 minutes', null,
-   null, null, null, null),
+   null, null, now() - interval '24 hours 5 minutes', null),
   ('ZZZZ5N', 'ZZZZZZZZZZZZZZZZZZZZZZZZE1', 'A', 'desk', 4, 'waiting', null, false,
-   now() - interval '23 hours', now() - interval '23 hours', null,
+   now() - interval '23 hours', now() - interval '23 hours', now() - interval '23 hours',
    null, null, null, null);
 
+-- 5P's real day: its not_eligible total now, and a recount of the old not-eligible visits that
+-- the clean-up must add to it (5P and any real ones). now() is the same all through one transaction.
+create temp table real_day as
+select d.day,
+       coalesce((select s.not_eligible from public.daily_stats s
+                 where s.day = d.day and s.site = 'A' and not s.is_demo), 0) as before,
+       (select count(*) from public.visits v
+        where v.created_at < now() - interval '24 hours' and v.status = 'not_eligible'
+          and v.triaged_at is not null and v.site = 'A' and not v.is_demo
+          and (v.triaged_at at time zone 'America/Toronto')::date = d.day) as to_add
+from (select ((now() - interval '24 hours 5 minutes') at time zone 'America/Toronto')::date as day) d;
+
+select public.delete_old_visits();
+
+-- A second run must change nothing.
+create temp table after_first as select * from public.daily_stats;
 select public.delete_old_visits();
 
-select s.day, s.site, s.is_demo,
-       s.triaged_ctas_4_5, s.not_eligible, s.offered, s.declined,
-       s.called_and_arrived, s.call_to_arrival_seconds, s.no_shows, s.unable_to_reach,
-       s.started_from_home, s.home_reached_triage,
-       s.survey_responses, s.survey_score_sum, s.survey_9_or_10,
-       (select count(*) from public.visits where code like 'ZZZZ5%') as visits_left
+-- One daily_stats row as one line of numbers, in the order of the expected list above.
+create function pg_temp.stats_line(d date, s text, demo boolean) returns text language sql as $$
+  select concat_ws(' ', triaged_ctas_4_5, not_eligible, offered, declined,
+    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
+    open_at_deletion, started_from_home, home_reached_triage,
+    survey_responses, survey_score_sum, survey_9_or_10)
+  from public.daily_stats where day = d and site = s and is_demo = demo
+$$;
+
+do $$
+declare
+  want record;
+  got text;
+  r real_day%rowtype;
+  now_ne integer;
+begin
+  for want in
+    select * from (values
+      ('2000-01-01'::date, 'A', false, '6 1 5 1 2 2400 2 0 0 0 0 1 1 1 9 1'),
+      ('2000-01-02'::date, 'A', false, '105 0 5 0 3 5400 4 1 1 1 0 1 0 8 64 1'),
+      ('2000-01-02'::date, 'B', true,  '1 0 1 0 0 0 0 0 0 0 1 0 0 0 0 0'),
+      ('2000-07-01'::date, 'A', false, '1 0 1 0 0 0 0 0 0 0 0 0 0 0 0 0'),
+      ('2000-07-02'::date, 'A', false, '0 0 0 0 1 2700 1 0 0 0 0 0 0 0 0 0')
+    ) as w(day, site, is_demo, line)
+  loop
+    got := pg_temp.stats_line(want.day, want.site, want.is_demo);
+    if got is distinct from want.line then
+      raise exception '% % %: got "%", expected "%"', want.day, want.site, want.is_demo, got, want.line;
+    end if;
+  end loop;
+
+  if (select count(*) from public.daily_stats where day < '2001-01-01') <> 5 then
+    raise exception 'expected 5 rows in the year 2000, got %',
+      (select count(*) from public.daily_stats where day < '2001-01-01');
+  end if;
+
+  select * into r from real_day;
+  select coalesce(max(not_eligible), 0) into now_ne from public.daily_stats
+    where day = r.day and site = 'A' and not is_demo;
+  if r.to_add < 1 or now_ne <> r.before + r.to_add then
+    raise exception '5P day %: not_eligible was %, is %, expected % (recount %)',
+      r.day, r.before, now_ne, r.before + r.to_add, r.to_add;
+  end if;
+
+  if exists (select * from public.daily_stats except select * from after_first)
+     or exists (select * from after_first except select * from public.daily_stats) then
+    raise exception 'the second run changed daily_stats';
+  end if;
+
+  if (select array_agg(code) from public.visits where code like 'ZZZZ5%') is distinct from array['ZZZZ5N'] then
+    raise exception 'expected only ZZZZ5N left, got %',
+      (select array_agg(code) from public.visits where code like 'ZZZZ5%');
+  end if;
+end;
+$$;
+
+-- All checks passed. The 5 rows, for a last look.
+select s.day, s.site, s.is_demo, pg_temp.stats_line(s.day, s.site, s.is_demo) as numbers
 from public.daily_stats s
 where s.day < '2001-01-01'
 order by s.day, s.site, s.is_demo;
diff --git a/supabase/migrations/20261116100000_daily_stats_and_cleanup.sql b/supabase/migrations/20261116100000_daily_stats_and_cleanup.sql
index fa3a0b0..a4b0bbc 100644
--- a/supabase/migrations/20261116100000_daily_stats_and_cleanup.sql
+++ b/supabase/migrations/20261116100000_daily_stats_and_cleanup.sql
@@ -14,10 +14,14 @@ create table public.daily_stats (
   not_eligible integer not null default 0,         -- status not_eligible, on the triaged_at date
   offered integer not null default 0,              -- offered_at set, on the offered_at date
   declined integer not null default 0,             -- status declined, on the offered_at date
-  called_and_arrived integer not null default 0,   -- called_at and arrived_at set, on the arrived_at date
+  called_and_arrived integer not null default 0,   -- status arrived with called_at set, on the arrived_at date
   call_to_arrival_seconds bigint not null default 0, -- sum for those visits; divide by called_and_arrived
+  arrived integer not null default 0,              -- status arrived (with or without a call), on the arrived_at date
   no_shows integer not null default 0,             -- removed as no_show, on the closed_at date
+  removed_left integer not null default 0,         -- removed as left, on the closed_at date
   unable_to_reach integer not null default 0,      -- status unable_to_reach, on the closed_at date
+  open_at_deletion integer not null default 0,     -- still open when deleted (waiting, called, on_the_way or
+                                                   -- needs_reassessment), on the triaged_at date
   started_from_home integer not null default 0,    -- source home, on the created_at date
   home_reached_triage integer not null default 0,  -- source home and triaged, on the created_at date
   survey_responses integer not null default 0,     -- survey_score set, on the closed_at date
@@ -31,12 +35,23 @@ alter table public.daily_stats enable row level security;
 revoke all on public.daily_stats from anon, authenticated;
 
 -- 2. The clean-up. One statement, so the delete and the totals succeed or fail together.
+-- Two guards come first: if another run is busy (a slow run when the next 15 minutes start), or
+-- if no visit is old enough, it stops without a write. Without the second guard, the statement
+-- trigger visits_changed would fire every 15 minutes and wake every open screen for nothing.
 create function public.delete_old_visits()
 returns void
-language sql
+language plpgsql
 security definer
 set search_path = ''
 as $$
+begin
+  if not pg_try_advisory_xact_lock(hashtext('delete_old_visits')) then
+    return;
+  end if;
+  if not exists (select 1 from public.visits where created_at < now() - interval '24 hours') then
+    return;
+  end if;
+
   with gone as (
     delete from public.visits
     where created_at < now() - interval '24 hours'
@@ -57,11 +72,20 @@ as $$
       where status = 'declined' and offered_at is not null
     union all
     select site, is_demo, arrived_at, 'called_and_arrived', 1 from gone
-      where called_at is not null and arrived_at is not null
+      where status = 'arrived' and called_at is not null and arrived_at is not null
     union all
     select site, is_demo, arrived_at, 'call_to_arrival_seconds',
            round(extract(epoch from arrived_at - called_at))::bigint from gone
-      where called_at is not null and arrived_at is not null
+      where status = 'arrived' and called_at is not null and arrived_at is not null
+    union all
+    select site, is_demo, arrived_at, 'arrived', 1 from gone
+      where status = 'arrived' and arrived_at is not null
+    union all
+    select site, is_demo, closed_at, 'removed_left', 1 from gone
+      where status = 'removed' and removed_reason = 'left' and closed_at is not null
+    union all
+    select site, is_demo, triaged_at, 'open_at_deletion', 1 from gone
+      where status in ('waiting', 'called', 'on_the_way', 'needs_reassessment') and triaged_at is not null
     union all
     select site, is_demo, closed_at, 'no_shows', 1 from gone
       where status = 'removed' and removed_reason = 'no_show' and closed_at is not null
@@ -93,8 +117,11 @@ as $$
       coalesce(sum(amount) filter (where metric = 'declined'), 0) as declined,
       coalesce(sum(amount) filter (where metric = 'called_and_arrived'), 0) as called_and_arrived,
       coalesce(sum(amount) filter (where metric = 'call_to_arrival_seconds'), 0) as call_to_arrival_seconds,
+      coalesce(sum(amount) filter (where metric = 'arrived'), 0) as arrived,
       coalesce(sum(amount) filter (where metric = 'no_shows'), 0) as no_shows,
+      coalesce(sum(amount) filter (where metric = 'removed_left'), 0) as removed_left,
       coalesce(sum(amount) filter (where metric = 'unable_to_reach'), 0) as unable_to_reach,
+      coalesce(sum(amount) filter (where metric = 'open_at_deletion'), 0) as open_at_deletion,
       coalesce(sum(amount) filter (where metric = 'started_from_home'), 0) as started_from_home,
       coalesce(sum(amount) filter (where metric = 'home_reached_triage'), 0) as home_reached_triage,
       coalesce(sum(amount) filter (where metric = 'survey_responses'), 0) as survey_responses,
@@ -106,11 +133,13 @@ as $$
   -- A day already in daily_stats gets the new numbers added to it, never replaced.
   insert into public.daily_stats as s (
     day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
-    called_and_arrived, call_to_arrival_seconds, no_shows, unable_to_reach,
+    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
+    open_at_deletion,
     started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10
   )
   select day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
-    called_and_arrived, call_to_arrival_seconds, no_shows, unable_to_reach,
+    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
+    open_at_deletion,
     started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10
   from totals
   on conflict (day, site, is_demo) do update set
@@ -120,17 +149,22 @@ as $$
     declined = s.declined + excluded.declined,
     called_and_arrived = s.called_and_arrived + excluded.called_and_arrived,
     call_to_arrival_seconds = s.call_to_arrival_seconds + excluded.call_to_arrival_seconds,
+    arrived = s.arrived + excluded.arrived,
     no_shows = s.no_shows + excluded.no_shows,
+    removed_left = s.removed_left + excluded.removed_left,
     unable_to_reach = s.unable_to_reach + excluded.unable_to_reach,
+    open_at_deletion = s.open_at_deletion + excluded.open_at_deletion,
     started_from_home = s.started_from_home + excluded.started_from_home,
     home_reached_triage = s.home_reached_triage + excluded.home_reached_triage,
     survey_responses = s.survey_responses + excluded.survey_responses,
     survey_score_sum = s.survey_score_sum + excluded.survey_score_sum,
     survey_9_or_10 = s.survey_9_or_10 + excluded.survey_9_or_10;
+end;
 $$;
 
--- Only the cron job (and the owner in the SQL Editor) runs it; patients and staff cannot.
-revoke execute on function public.delete_old_visits() from public, anon, authenticated;
+-- Only the cron job (and the owner in the SQL Editor) runs it; patients, staff and the
+-- service key cannot.
+revoke execute on function public.delete_old_visits() from public, anon, authenticated, service_role;
 
 -- 3. The schedule: pg_cron inside the database, every 15 minutes. A visit is gone at most
 -- 24 hours and 15 minutes after it was created. A later schedule with the same name changes
@@ -140,3 +174,8 @@ grant usage on schema cron to postgres;
 grant all privileges on all tables in schema cron to postgres;
 
 select cron.schedule('delete-old-visits', '*/15 * * * *', 'select public.delete_old_visits()');
+
+-- 4. pg_cron keeps one log row per run (96 a day). Once a day at 03:00 UTC, delete the rows
+-- older than 7 days, so the log does not grow without end.
+select cron.schedule('delete-old-cron-logs', '0 3 * * *',
+  $$delete from cron.job_run_details where end_time < now() - interval '7 days'$$);
```

## Checked
- The owner ran the migration and the whole check file in the SQL Editor on 2026-11-16: the 5 rows were as expected, and no assert stopped the run.
- `cron.job` has both jobs, active. Only `postgres` can run `delete_old_visits()`.
- 301 unit tests, lint and build pass.

## Not checked
- A real run in `cron.job_run_details`.
- A real visit deleted after 24 hours on the live database.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-16. Pasted by the owner, word for word:
### 1. `events` CTE vs. column comments (double-counting or missed visits)

No single visit is counted twice within the same metric (`gone` deletes each row once, and each metric has one `UNION ALL` branch; overlaps like `called_and_arrived` $\subset$ `arrived` and `not_eligible` $\subset$ `triaged_ctas_4_5` are intentional subsets). However, four cases can silently miss visits or corrupt totals:

* **`open_at_deletion` misses open visits with `status = 'pre_arrival'` (or `triaged_at is null`)**
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, lines 23–24 and 87–88 (`where status in ('waiting', 'called', 'on_the_way', 'needs_reassessment') and triaged_at is not null`).
* **Concrete case:** A home-started visit that never reached triage (`status = 'pre_arrival'`, like `5H` in `daily_stats.sql` line 82) is still open when deleted after 24 hours, yet it is excluded from `open_at_deletion`—and even if `'pre_arrival'` were added to the list, `triaged_at is not null` would still drop it because `triaged_at` is `NULL`. Similarly, any row in those four open statuses with a `NULL` `triaged_at` is silently dropped.
* **Smallest fix:** Use `coalesce(triaged_at, created_at)` as the event timestamp so open rows cannot be dropped on `NULL` `triaged_at` (and add `'pre_arrival'` if `open_at_deletion` is meant to cover all unclosed visits rather than only triaged ones).


* **`removed_left` and `no_shows` miss `status = 'removed'` rows whose `removed_reason` is `NULL` or unexpected**
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, lines 84–85 and 90–91 (`where status = 'removed' and removed_reason = 'left'` / `'no_show'`).
* **Concrete case:** If a row is updated to `status = 'removed'` with `removed_reason is null` (or any string other than `'left'` / `'no_show'`), neither `removed_left` nor `no_shows` increments, so the closed visit disappears from all outcome counts.
* **Smallest fix:** Enforce `check (status <> 'removed' or removed_reason in ('no_show', 'left'))` on `public.visits`, or count `status = 'removed' and removed_reason is distinct from 'no_show'` in `removed_left`.


* **`arrived`, `called_and_arrived`, and `declined` miss rows if `arrived_at` or `offered_at` is `NULL**`
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, lines 71–72, 74–75, and 81–82 (`and offered_at is not null` / `and arrived_at is not null`).
* **Concrete case:** If a visit is marked `status = 'arrived'` with `closed_at` populated but `arrived_at is null` (or `status = 'declined'` with `closed_at` populated but `offered_at is null`), `triaged_ctas_4_5` counts it on `triaged_at`, while `arrived` / `declined` drops it completely.
* **Smallest fix:** Use `coalesce(arrived_at, closed_at)` for `arrived` and `coalesce(offered_at, closed_at)` for `declined` (filtering `where coalesce(...) is not null`).


* **`call_to_arrival_seconds` can emit negative durations**
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, lines 77–79 (`round(extract(epoch from arrived_at - called_at))::bigint`).
* **Concrete case:** If `called_at` is `12:05` and `arrived_at` is `12:00` (clock skew or manual data correction), `arrived_at - called_at` produces `-300`, subtracting 300 seconds from that day's `call_to_arrival_seconds`.
* **Smallest fix:** Wrap the expression in `greatest(0, round(extract(epoch from arrived_at - called_at))::bigint)`.



---

### 2. Concurrency and `exists` guard

Two concurrent runs **cannot** both delete: `pg_try_advisory_xact_lock` holds an exclusive transaction-level lock until `COMMIT`/`ROLLBACK`, so an overlapping run gets `false` and returns immediately, and any run starting after `COMMIT` sees the rows already deleted. However, two cases can stop a run that should delete:

* **32-bit `hashtext` lock collision across the database-wide advisory lock namespace**
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, line 47 (`if not pg_try_advisory_xact_lock(hashtext('delete_old_visits')) then`).
* **Concrete case:** `hashtext(text)` returns a 32-bit `int4` (widened to `bigint`), sharing the single-argument advisory lock keyspace with every other single-argument advisory lock in the database (including `start_home_visit` if a site string ever hashes to the same 32-bit integer). While that colliding lock is held, `delete_old_visits()` gets `false` and silently skips deleting overdue visits.
* **Smallest fix:** Switch to the two-argument 64-bit namespace `pg_try_advisory_xact_lock(hashtext('vwr'), hashtext('delete_old_visits'))` (or `hashtextextended('delete_old_visits', 0)`).


* **Transaction-frozen `now()` skips visits that cross the 24-hour mark inside an outer transaction**
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, lines 50 and 55 (`where created_at < now() - interval '24 hours'`).
* **Concrete case:** In PostgreSQL, `now()` returns `transaction_timestamp()`. For standalone `pg_cron` calls this is fine, but if an admin script or maintenance batch opens `BEGIN;`, runs other statements for 10 minutes, and then calls `select public.delete_old_visits();`, visits that became 24 hours old during those 10 minutes fail the `exists` test because `now()` is still pinned to the outer `BEGIN`.
* **Smallest fix:** Compute one local cutoff variable `cutoff timestamptz := clock_timestamp() - interval '24 hours';` at the start of `delete_old_visits()` and use `cutoff` in both `exists` and `delete`.



---

### 3. Ways `supabase/checks/daily_stats.sql` can pass while the migration is wrong

* **`closed_at = arrived_at` and `closed_at = triaged_at` on every synthetic row masks wrong date grouping**
* **Line:** `supabase/checks/daily_stats.sql`, lines 60–65, 79, 86, 92, 95, 98, and 101.
* **Concrete case:** Every synthetic `arrived` row sets `closed_at = arrived_at`, and `5D` (`not_eligible`) sets `closed_at = triaged_at`. If the migration grouped `arrived`, `called_and_arrived`, or `call_to_arrival_seconds` by `closed_at` instead of `arrived_at` (or `not_eligible` by `closed_at` instead of `triaged_at`), every assertion in lines 146–155 still passes.
* **Smallest fix:** Set `closed_at` on one arrived row (e.g., `5J`) and on `5D` to the following Toronto day (`2000-01-03` and `2000-01-02`) while keeping `arrived_at` / `triaged_at` on their original days.


* **`real_day` check for `5P` asserts only `not_eligible`, never `triaged_ctas_4_5**`
* **Line:** `supabase/checks/daily_stats.sql`, lines 102–104, 111–118, and 164–170.
* **Concrete case:** `5P` has `ctas_level = 4` and `status = 'not_eligible'`, so it must increment both `triaged_ctas_4_5` and `not_eligible` on its real Toronto day. Because `real_day` only snapshots and asserts `not_eligible`, a bug that fails to increment `triaged_ctas_4_5` on real dates passes line 167.
* **Smallest fix:** Also record `before_triaged` and `to_add_triaged` (`ctas_level in (4, 5)`) in `real_day` and assert both columns on `r.day`.


* **The second-run assertion never tests re-execution when old visits exist or when the advisory lock is held**
* **Line:** `supabase/checks/daily_stats.sql`, lines 124–125 and 172–175.
* **Concrete case:** `after_first` is captured *after* the first `delete_old_visits()` already deleted every old row, so the second `delete_old_visits()` exits immediately at `if not exists (...) return;`. Even if the advisory lock guard were missing or broken, lines 172–175 pass.
* **Smallest fix:** Acquire `pg_try_advisory_xact_lock(...)` in a separate check or assert that `delete_old_visits()` returns early without deleting an old row when the lock is already held, and explicitly assert `not exists (select 1 from public.visits where created_at < now() - interval '24 hours')` after the first run.


* **Three open statuses (`called`, `on_the_way`, `needs_reassessment`) and non-`arrived` rows with `arrived_at` set are untested**
* **Line:** `supabase/checks/daily_stats.sql`, lines 72–73 and 87–88.
* **Concrete case:** Only `5K` (`waiting`) tests `open_at_deletion`, and neither `5E` (`no_show`) nor `5F` (`unable_to_reach`) has `arrived_at` populated. If the migration misspelled `'on_the_way'` or `'needs_reassessment'`, or omitted `status = 'arrived'` on `called_and_arrived`, the check file still passes.
* **Smallest fix:** Add one synthetic visit in `needs_reassessment` (or `on_the_way`) for `open_at_deletion`, and populate `arrived_at` on `5E` (`removed` / `no_show`) to prove `called_and_arrived` ignores non-`arrived` statuses.


* **`day < '2001-01-01'` row-count check ignores spurious rows written to dates $\ge$ `2001-01-01**`
* **Line:** `supabase/checks/daily_stats.sql`, line 159 (`where day < '2001-01-01'`).
* **Concrete case:** If a date-conversion bug wrote a synthetic visit onto a date in `2001` or `2026` (while another synthetic visit still created the expected year-2000 row), the count of rows `< '2001-01-01'` remains `5` and the check passes.
* **Smallest fix:** Record total `count(*)` of `public.daily_stats` before the first `delete_old_visits()` call and assert the exact total row count across all dates afterward.



---

### 4. Cron log clean-up safety

* **`end_time < now() - interval '7 days'` never deletes crashed or orphaned job runs where `end_time IS NULL**`
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, line 180 (`where end_time < now() - interval '7 days'`).
* **Concrete case:** `pg_cron` inserts a row into `cron.job_run_details` with `start_time = now()` and `end_time = NULL` when a job starts. If the worker crashes or the database restarts before completion, `end_time` stays `NULL` forever; `NULL < now() - interval '7 days'` evaluates to `UNKNOWN`, so crashed rows are never pruned.
* **Smallest fix:** Change the predicate to `where coalesce(end_time, start_time) < now() - interval '7 days'`.


* **Unscoped `DELETE` wipes >7-day history for all `pg_cron` jobs in the database, including failed runs**
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, line 180.
* **Concrete case:** Because `cron.job_run_details` is shared across every scheduled job in the database and the `DELETE` has no `jobid` or `status` filter, adding another `pg_cron` job later—or needing to inspect a failure older than 7 days—loses those log rows automatically.
* **Smallest fix:** Scope the deletion to this feature's jobs (`and jobid in (select jobid from cron.job where jobname in ('delete-old-visits', 'delete-old-cron-logs'))`) or retain `'failed'` rows longer (e.g., 30 days).


* **Overly broad `ALL PRIVILEGES` grant on all tables in schema `cron**`
* **Line:** `20261116100000_daily_stats_and_cleanup.sql`, line 174 (`grant all privileges on all tables in schema cron to postgres;`).
* **Concrete case:** Granting `ALL PRIVILEGES` on every table in `cron` grants `TRUNCATE` and direct writes on `cron.job` when log cleanup only needs `SELECT` and `DELETE` on `cron.job_run_details`.
* **Smallest fix:** Replace line 174 with `grant select, delete on table cron.job_run_details to postgres;` (plus `grant select on table cron.job to postgres;` if filtering by `jobname`).

## Claude's check of the response

I numbered the points 1.1 to 4.3 in the order of the answer.

1.1 `open_at_deletion` misses `pre_arrival` and null `triaged_at`: reject. The four open statuses come only after triage (`applyTriage` in `lib/visitActions.ts` sets `triaged_at` for every outcome), so `triaged_at` is never null on them. The column means "triaged and still open", by design. A `pre_arrival` visit that never got triage is already countable: `started_from_home` minus `home_reached_triage`.

1.2 `removed` with no reason: reject. It cannot happen. `removed_reason` has `check (removed_reason in ('left', 'no_show'))`, and `removed_has_reason` is `check ((status = 'removed') = (removed_reason is not null))` (`20261110060756_tables_and_security.sql`, lines 39 and 56).

1.3 `arrived` with no `arrived_at`, or `declined` with no `offered_at`: reject. `markArrived` always sets `arrived_at`, and `applyTriage` sets `offered_at` for `declined`. A `coalesce` to `closed_at` would hide a bug in place of showing it.

1.4 negative seconds: reject. The `visits_before_write` trigger sets each time to `now()` when it is set, so a later step always has a later time. `greatest(0, ...)` would hide a bug.

2.1 `hashtext` collision: optional. Checked through the read-only connection on 2026-11-16: `hashtext('delete_old_visits')` = -799087885, `hashtext('start_home_visit:A')` = -1205423538, `hashtext('start_home_visit:B')` = 490688594. They are all different, and these are the only advisory locks in the project. If a collision came, the cost is one skipped run (15 minutes). The two-argument form is cheap, but the risk is zero now.

2.2 `now()` frozen in an outer transaction: reject. Only pg_cron (one statement per run) or the owner calls the function.

3.1 `closed_at` the same as `arrived_at` or `triaged_at` in the check: accept. Move `closed_at` of 5A and 5D to D2. 5A has no survey, so no expected number changes. Not 5J, as Gemini says: its survey counts on `closed_at`.

3.2 5P `triaged_ctas_4_5` not asserted: accept. Add `before_triaged` and `to_add_triaged` to `real_day` and assert them.

3.3 second run: accept in part. Add an assert that no visit older than 24 hours is left after the first run. Reject the held-lock test: the same session takes its own advisory lock again, so a test in one SQL Editor run cannot show the guard. The second run tests that a run with nothing to do changes nothing.

3.4 the other open statuses and the status filter: accept. Add visits in `called`, `on_the_way` and `needs_reassessment`, and give 5E an `arrived_at`, to prove the status filter on `called_and_arrived` and `arrived`.

3.5 rows on dates after 2000: reject. Each year-2000 row is checked to the exact numbers, so an event on a wrong date makes a number in its right row too low.

4.1 `end_time` null: accept. `coalesce(end_time, start_time)` is cheap. The first migration has already run, so this needs a new migration that schedules the job again with the same name.

4.2 delete the log rows of these jobs only: reject. The database has only these 2 jobs.

4.3 `grant all` on schema `cron`: reject. It is the Supabase documented setup, and it goes to `postgres` only, not to patients or staff.
