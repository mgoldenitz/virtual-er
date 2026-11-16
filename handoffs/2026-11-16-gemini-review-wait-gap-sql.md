# Gemini review: wait gap SQL (2026-11-16)

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Hydrogen 4 credits: Gemini 3.6 Flash, High.
Branch: `phase3-review-fixes`, commit `fad560c`. Not run on the database yet.

## Text to paste into the new chat

You review one SQL change for a concept prototype of a virtual ER waiting room (synthetic data only, no hospital systems). Low-acuity patients wait off-site and see their place in line and a wait range on their phone. Find problems. Do not confirm what looks right; list every way this can give a wrong number, fail to run, or leak data.

Context:
- Supabase Postgres. `public.visits` has one row per visit: `site` ('A' or 'B'), `status`, `triaged_at`, `called_at` and more (timestamptz).
- A trigger `visits_before_write` sets any newly filled time to `now()`, so the database clock sets every time. "Recall all" is one UPDATE of many rows, so all those rows get the same `called_at` (`now()` is the transaction start time).
- `get_patient_visit(p_token)` is `security definer`, `set search_path = ''`, callable by anon with the visit's secret token. It returns one row for the phone.
- The phone computes the wait as place x gap, shown as 80% to 125%, rounded out to 5 minutes. When `average_gap_minutes` is null it uses 15 minutes per place. It never uses less than 5 minutes per place.
- Before this change, the gap was the average over the last 6 `called_at` rows (no `distinct`, no time limit). A "Recall all" of 5 visits gave 4 gaps of 0 minutes, and call-backs from hours ago still counted.

The change (only `average_gap_minutes` changes; the 12 returned columns are the same, so `create or replace` keeps the grants):

```sql
-- Readiness review 2026-11-16, task 1: a fairer wait estimate on the patient's phone.
-- get_patient_visit changes in one part only, average_gap_minutes:
-- 1. Distinct call-back moments only. "Recall all" is one database update, so the trigger gives
--    every recalled visit the same called_at. Before, each of them counted as a gap of 0 minutes.
--    Now one "Recall all" counts as one moment.
-- 2. Only call-backs of the last 3 hours count, so a quiet night does not use old numbers.
-- 3. With fewer than 2 distinct moments the value is null, as before. The phone then uses
--    15 minutes per place, and never less than 5 minutes per place (lib/patientViewFromRow.ts).
-- The returned columns do not change, so "create or replace" keeps the function and its rights.

create or replace function public.get_patient_visit(p_token text)
returns table (
  code text,
  site text,
  language text,
  status text,
  place_in_line integer,
  -- Average minutes between the last 6 distinct call-back moments of the last 3 hours at this
  -- site, rounded to whole minutes so it cannot be used to work out exactly when other patients
  -- were called. Null with fewer than 2 distinct moments.
  average_gap_minutes integer,
  called_at timestamptz,
  last_still_here_at timestamptz,
  seen boolean,
  closed boolean,
  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
  expired boolean,
  -- When this visit was triaged (the start of off-site waiting).
  triaged_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    me.code,
    me.site,
    me.language,
    me.status,
    case when me.status = 'waiting' and me.triaged_at is not null then (
      select count(*)::integer + 1
      from public.visits other
      where other.site = me.site
        and other.status = 'waiting'
        and other.triaged_at is not null
        and (other.triaged_at, other.id) < (me.triaged_at, me.id)
    ) end,
    case when me.status = 'waiting' then (
      -- The average of the gaps between 6 moments is (last - first) / 5.
      select case when count(*) >= 2
        then round(extract(epoch from max(moments.called_at) - min(moments.called_at)) / 60 / (count(*) - 1))::integer
      end
      from (
        select distinct other.called_at
        from public.visits other
        where other.site = me.site
          and other.called_at is not null
          and other.called_at >= now() - interval '3 hours'
        order by other.called_at desc
        limit 6
      ) moments
    ) end,
    me.called_at,
    me.last_still_here_at,
    me.seen_at is not null,
    me.closed_at is not null,
    me.status = 'pre_arrival' and me.triaged_at is null
      and me.created_at <= now() - interval '6 hours',
    me.triaged_at
  from public.visits me
  where me.access_token = p_token;
$$;
```

The check the owner runs in the SQL Editor after the migration (inside begin ... rollback):

```sql
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
```

Questions:
1. Is the average gap right? Is (max - min) / (count - 1) over the distinct moments the same as the mean of the gaps between them, after `limit 6`?
2. Is `select distinct ... order by ... limit 6` valid and does it keep the newest 6 distinct moments?
3. Can two call-backs that staff think of as one "Recall all" get different `called_at` values, or can two separate call-backs get the same value? What does each do to the number?
4. Is 3 hours with a fallback of 15 minutes sensible, or does the number jump in a confusing way when the oldest moment leaves the window?
5. Is `called_at` ever cleared or changed (for example by Undo) in a way that breaks this?
6. Performance: is an index needed for `site, called_at` at about 100 visits a day per site?
7. Privacy: can a patient work out when other patients were called from the rounded number?
8. The check file: does it run in the Supabase SQL Editor as written? Is disabling the trigger and clearing real `called_at` values inside begin ... rollback safe? Are the expected numbers (25 for site A, null for site B) right?

Give each problem with the line, what goes wrong, and a fix. Say "no problem found" for a question only after you checked it.

## Checked
- `npm test`: 51 files, 291 tests pass (2026-11-16, after commit `98a3b8c`).
- `npm run lint` and `npm run build` pass (same date).
- Tests for the 5-minute floor in `lib/queue.test.ts` and `lib/patientViewFromRow.test.ts` failed before the fix and pass after it.

## Not checked
- The migration and the check file on the real database (not run yet).
- That the old function gave 46 for the check data (worked out by hand only).
