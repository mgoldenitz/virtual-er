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

## Response

Gemini Hydrogen 4, High, 2026-11-16. Its points are kept; the wording is shortened.

1. Average gap. `(max - min) / (count - 1)` is the exact mean of the gaps (the gaps add up to max - min). Two details: `round()` on `double precision` rounds a tie such as 2.5 to the even number (2), so cast to `numeric` for half-up rounding. And the current moment is not counted: with call-backs at 10:00 and 10:05 and none after, the value at 12:55 is still 5, not the 170-minute stall. Consider a fallback to null sooner than 3 hours.
2. `select distinct ... order by ... limit 6` is valid and keeps the newest 6. But `distinct` only joins times from the same transaction; two staff taps 1 microsecond apart count as two moments with a gap of 0. Fix: bucket times (for example `date_trunc('minute', ...)`) if quick single recalls should count as one.
3. One "Recall all" with different times: yes, if it were many requests; with one UPDATE all rows share `now()`. Two separate call-backs with the same time: rare, except in a script with many UPDATEs in one transaction. Fix: keep "Recall all" one UPDATE; tests that need different times must not run several UPDATEs in one transaction.
4. Cliffs: when the second-newest moment passes 3 hours, the value jumps to null (15 per place). Example: 10:00 and 10:05 give 5; at 13:00:01 the phone goes from 15-25 to 50-75 minutes. Also 10:00, 12:40, 12:50 give 85 at 12:59 and 10 at 13:00:01. Acceptable if intended; or widen to 4 hours, or explain in the patient text.
5. Undo: if Undo or a re-triage leaves an old `called_at`, or the trigger only fills `called_at` when it was null, a second recall is not seen. Cancelled, removed and unable-to-reach visits still count, which is fine. Fix: check that Undo and reopen clear `called_at`.
6. Index: not needed at about 100 visits a day; suggests `create index if not exists visits_site_called_at_idx on public.visits (site, called_at desc) where called_at is not null;` as the table grows without cleanup.
7. Privacy: a polling patient learns within about 15 seconds that someone at the site was just called, and with exactly 2 moments can work out the earlier call-back time to about 30 seconds. The `waiting`-only gate is good. For a real hospital: round to 5 minutes or cache the value for 2 to 3 minutes. Whole minutes are enough for synthetic data.
8. Check file: runs as `postgres`; `disable trigger` takes an exclusive lock on `visits` until `rollback`, so other requests wait while it runs. Danger if run line by line without `begin`. Expected numbers are right: site A 25, site B null, old function 46. Missing: more than 6 distinct moments (to prove `limit 6` keeps the newest), and a patient who is not `waiting` (to prove the value is null).

## Claude's check of the response (2026-11-16)

1. Mean: agrees. Tie rounding: correct but harmless (a tie needs a gap of exactly x.5 minutes, and the phone then rounds the range out to 5 minutes anyway). Not changed. Stall since the last call-back: a real point, and a product choice. Today, when staff stop calling back, the place in line and the estimate both stay still. Option for the owner: count "now" as a moment when the time since the last call-back is longer than the average, so the estimate grows during a stall. Not changed.
2. Valid and newest 6: agrees. Two single recalls a few seconds apart are two patients called, so a gap near 0 there is the true pace; joining them would hide it. Not accepted.
3. Checked: "Recall all" is one update (`data/staffActions.ts:134`, `.update({ status: "called", ... })` for the listed ids). The check file uses one insert, not several UPDATEs, and pauses the trigger. No change.
4. Cliff: agrees that it jumps; the 3-hour window was the owner's choice in readiness review task 1. Owner may want a softer end (option, not changed).
5. Checked: Undo is for closures only and keeps `called_at` (`Closure` in `lib/visitActions.ts` holds `status`, `removed_reason`, `arrived_at`, `closed_at`). A re-triage clears `called_at` (`applyTriage`, "fresh"), and the trigger sets a new `now()` whenever `called_at` changes to a new value (`20261110090134_visit_version_and_database_times.sql:38`), so a second recall is seen. Side effect, accepted: a re-triaged visit's first call-back leaves the pace history. Gemini's worry does not apply.
6. Index: not needed now (YAGNI). Revisit with 24-hour cleanup in Phase 4 or 5.
7. Privacy: agrees, and the place in line already shows the same event (it drops when someone ahead is called). Accepted for synthetic data; noted for a real deployment.
8. Check file: the trigger change and the cleared times roll back with the transaction (Postgres `alter table` is transactional), and an error aborts the whole transaction, so nothing is saved. The lock lasts well under a second. Line-by-line use is the real risk: add a line at the top "Run the whole file at once". The two missing cases are cheap and worth adding: (a) after the first select, add 6 more distinct call-backs at site B (20, 40, 60, 80, 100 and 170 minutes ago) to the one at 30; the newest 6 give (100 - 20) / 5 = 16, the oldest 6 would give 28, no limit 25; (b) a site A patient whose status is not `waiting` gets null. Not done yet (owner to choose).

Not checked: the migration and the check file on the real database.
