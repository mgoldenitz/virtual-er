# Gemini review: delete_old_visits after a branch merge

Model: Gemini Hydrogen 4, High, in a new chat. Paste everything below the line.

---

You review a small fix in a Next.js + Supabase (Postgres) prototype. All data is synthetic. Find problems; do not confirm that it is fine. For each problem, give the line, why it is wrong, and the smallest fix. If you find no problem in a part, say "no problem found" for that part.

## Background

A nightly clean-up function `public.delete_old_visits()` deletes visits older than 24 hours and first adds their totals to `daily_stats` (one row per Toronto date, site and demo flag; on a conflict it adds to the old row, never replaces it). Each number counts on the date of its own event.

Two branches each changed this function in their own new migration:

- `20261120030000_wait_and_recall_stats.sql` added 6 columns (`called`, `offer_to_call_seconds`, `wait_under_30`, `wait_30_to_59`, `wait_60_to_119`, `wait_120_plus`) and their events. In it, "offered" and "declined" count on `offered_at`.
- `20261121000000_patient_view_offered_at.sql` (later) moved "offered" and "declined" to `triaged_at` (a decision: a declined visit that staff switch to off-site waiting the next day must not add an offer to a day with no triage). Its copy of the function has no wait events.

Git showed no conflict. Run in name order, the second migration replaces the whole function, so the wait numbers stop. The fix is a third migration with both changes, and a test that reads the migration files.

Settled, do not report: the offer and decline rule (owner decision); "create or replace" plus the repeated `revoke`; the advisory lock; the wait bands round to whole seconds, then to whole minutes (the app does the same).

## Questions

1. Does the new function body have every event and every column of both earlier versions? Does any line differ from them other than the offer and decline events?
2. Can the guard test pass while the newest function is still wrong (for example, a column in the `on conflict` list but missing from `totals` or from the events)? Can it read the wrong file or the wrong function in a file that has 2 functions?
3. Is anything in the migration unsafe to run on a live database that already has the 6 columns and the older function?

## Diff of the function body against 20261120030000 (the only lines that changed)

```
<     select site, is_demo, offered_at, 'offered', 1 from gone
<       where offered_at is not null
---
>     -- Offers and declines count on the triage day, as lib/dashboardNumbers.ts does.
>     select site, is_demo, triaged_at, 'offered', 1 from gone
>       where offered_at is not null and triaged_at is not null
<     select site, is_demo, offered_at, 'declined', 1 from gone
<       where status = 'declined' and offered_at is not null
---
>     select site, is_demo, triaged_at, 'declined', 1 from gone
>       where status = 'declined' and offered_at is not null and triaged_at is not null
```

The new offer and decline lines are the same as in 20261121000000.

## Changed files (line counts)

- `supabase/migrations/20261121010000_wait_stats_on_triage_day.sql`: new, 175 lines (below).
- `lib/cleanupColumns.test.ts`: new, 47 lines (below).
- `lib/dashboardWait.test.ts`: 1 comment line changed (now names the new migration), 100 lines.

## lib/cleanupColumns.test.ts

```ts
// Checks the newest delete_old_visits() in supabase/migrations/: the one the database runs.
// Two branches once each changed this function in their own migration, and the newer one
// dropped the other's columns with no git conflict (known-issues.md, 2026-11-21).
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Every count column of daily_stats: DailyStatsRow in lib/dashboardNumbers.ts without day, site and is_demo.
const COLUMNS = [
  "triaged_ctas_4_5", "not_eligible", "offered", "declined", "called_and_arrived",
  "call_to_arrival_seconds", "arrived", "no_shows", "removed_left", "unable_to_reach",
  "open_at_deletion", "started_from_home", "home_reached_triage", "survey_responses",
  "survey_score_sum", "survey_9_or_10", "called", "offer_to_call_seconds",
  "wait_under_30", "wait_30_to_59", "wait_60_to_119", "wait_120_plus",
];

// The body of the newest "create (or replace) function public.delete_old_visits", up to its "$$;".
function newestCleanupSql(): string {
  const dir = "supabase/migrations";
  const makes = /create\s+(or\s+replace\s+)?function\s+public\.delete_old_visits\s*\(/i;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((name) => makes.test(readFileSync(`${dir}/${name}`, "utf8")));
  const sql = readFileSync(`${dir}/${files[files.length - 1]}`, "utf8");
  const start = sql.search(makes);
  return sql.slice(start, sql.indexOf("$$;", start));
}

describe("the newest delete_old_visits()", () => {
  const body = newestCleanupSql();

  it("adds every daily_stats column on a day that is already there", () => {
    const missing = COLUMNS.filter((c) => !body.includes(`${c} = s.${c} + excluded.${c}`));
    expect(missing).toEqual([]);
  });

  it("puts every daily_stats column in the insert", () => {
    const insert = body.slice(body.indexOf("insert into public.daily_stats"), body.indexOf("from totals"));
    const missing = COLUMNS.filter((c) => !new RegExp(`\\b${c}\\b`).test(insert));
    expect(missing).toEqual([]);
  });

  it("counts offers and declines on the triage day (decision 2026-11-21)", () => {
    expect(body).toContain("triaged_at, 'offered'");
    expect(body).toContain("triaged_at, 'declined'");
  });
});
```

## supabase/migrations/20261121010000_wait_stats_on_triage_day.sql

```sql
-- Joins two earlier changes to the 24-hour clean-up in one function. Two branches each changed
-- delete_old_visits() in their own migration, and the newer one dropped the other's change:
--   20261120030000_wait_and_recall_stats.sql added the recall and wait numbers (6 columns);
--   20261121000000_patient_view_offered_at.sql counts "offered" and "declined" on the triage day
--   (Phase 5 code review, fault 2, 2026-11-21), but its copy has no wait numbers.
-- This copy has both. The columns are already there, so there is no "alter table".
-- Guard test: lib/cleanupColumns.test.ts. Check: supabase/checks/daily_stats.sql (run the whole
-- file after this migration).
-- The wait bands round the wait to whole seconds first, then to whole minutes. The app does the same.
-- "create or replace" keeps the function's owner and rights; the revoke below repeats them.
create or replace function public.delete_old_visits()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not pg_try_advisory_xact_lock(hashtext('virtual_er'), hashtext('delete_old_visits')) then
    return;
  end if;
  if not exists (select 1 from public.visits where created_at < now() - interval '24 hours') then
    return;
  end if;

  with gone as (
    delete from public.visits
    where created_at < now() - interval '24 hours'
    returning *
  ),
  -- One row per number that a deleted visit adds, with the time of the event it counts on.
  events (site, is_demo, at, metric, amount) as (
    select site, is_demo, triaged_at, 'triaged_ctas_4_5', 1 from gone
      where ctas_level in (4, 5) and triaged_at is not null
    union all
    select site, is_demo, triaged_at, 'not_eligible', 1 from gone
      where status = 'not_eligible' and triaged_at is not null
    union all
    -- Offers and declines count on the triage day, as lib/dashboardNumbers.ts does.
    select site, is_demo, triaged_at, 'offered', 1 from gone
      where offered_at is not null and triaged_at is not null
    union all
    select site, is_demo, triaged_at, 'declined', 1 from gone
      where status = 'declined' and offered_at is not null and triaged_at is not null
    union all
    select site, is_demo, arrived_at, 'called_and_arrived', 1 from gone
      where status = 'arrived' and called_at is not null and arrived_at is not null
    union all
    select site, is_demo, arrived_at, 'call_to_arrival_seconds',
           round(extract(epoch from arrived_at - called_at))::bigint from gone
      where status = 'arrived' and called_at is not null and arrived_at is not null
    union all
    select site, is_demo, arrived_at, 'arrived', 1 from gone
      where status = 'arrived' and arrived_at is not null
    union all
    select site, is_demo, closed_at, 'removed_left', 1 from gone
      where status = 'removed' and removed_reason = 'left' and closed_at is not null
    union all
    select site, is_demo, triaged_at, 'open_at_deletion', 1 from gone
      where status in ('waiting', 'called', 'on_the_way', 'needs_reassessment') and triaged_at is not null
    union all
    select site, is_demo, closed_at, 'no_shows', 1 from gone
      where status = 'removed' and removed_reason = 'no_show' and closed_at is not null
    union all
    select site, is_demo, closed_at, 'unable_to_reach', 1 from gone
      where status = 'unable_to_reach' and closed_at is not null
    union all
    select site, is_demo, created_at, 'started_from_home', 1 from gone
      where source = 'home'
    union all
    select site, is_demo, created_at, 'home_reached_triage', 1 from gone
      where source = 'home' and triaged_at is not null
    union all
    select site, is_demo, closed_at, 'survey_responses', 1 from gone
      where survey_score is not null and closed_at is not null
    union all
    select site, is_demo, closed_at, 'survey_score_sum', survey_score from gone
      where survey_score is not null and closed_at is not null
    union all
    select site, is_demo, closed_at, 'survey_9_or_10', 1 from gone
      where survey_score in (9, 10) and closed_at is not null
    union all
    select site, is_demo, called_at, 'called', 1 from gone
      where called_at is not null and offered_at is not null
    union all
    select site, is_demo, called_at, 'offer_to_call_seconds',
           round(extract(epoch from called_at - offered_at))::bigint from gone
      where called_at is not null and offered_at is not null
    union all
    select site, is_demo, called_at, 'wait_under_30', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) < 30
    union all
    select site, is_demo, called_at, 'wait_30_to_59', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) between 30 and 59
    union all
    select site, is_demo, called_at, 'wait_60_to_119', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) between 60 and 119
    union all
    select site, is_demo, called_at, 'wait_120_plus', 1 from gone
      where called_at is not null and offered_at is not null
        and round(round(extract(epoch from called_at - offered_at)) / 60) >= 120
  ),
  -- The events added up per Toronto date, site and demo flag.
  totals as (
    select (at at time zone 'America/Toronto')::date as day, site, is_demo,
      coalesce(sum(amount) filter (where metric = 'triaged_ctas_4_5'), 0) as triaged_ctas_4_5,
      coalesce(sum(amount) filter (where metric = 'not_eligible'), 0) as not_eligible,
      coalesce(sum(amount) filter (where metric = 'offered'), 0) as offered,
      coalesce(sum(amount) filter (where metric = 'declined'), 0) as declined,
      coalesce(sum(amount) filter (where metric = 'called_and_arrived'), 0) as called_and_arrived,
      coalesce(sum(amount) filter (where metric = 'call_to_arrival_seconds'), 0) as call_to_arrival_seconds,
      coalesce(sum(amount) filter (where metric = 'arrived'), 0) as arrived,
      coalesce(sum(amount) filter (where metric = 'no_shows'), 0) as no_shows,
      coalesce(sum(amount) filter (where metric = 'removed_left'), 0) as removed_left,
      coalesce(sum(amount) filter (where metric = 'unable_to_reach'), 0) as unable_to_reach,
      coalesce(sum(amount) filter (where metric = 'open_at_deletion'), 0) as open_at_deletion,
      coalesce(sum(amount) filter (where metric = 'started_from_home'), 0) as started_from_home,
      coalesce(sum(amount) filter (where metric = 'home_reached_triage'), 0) as home_reached_triage,
      coalesce(sum(amount) filter (where metric = 'survey_responses'), 0) as survey_responses,
      coalesce(sum(amount) filter (where metric = 'survey_score_sum'), 0) as survey_score_sum,
      coalesce(sum(amount) filter (where metric = 'survey_9_or_10'), 0) as survey_9_or_10,
      coalesce(sum(amount) filter (where metric = 'called'), 0) as called,
      coalesce(sum(amount) filter (where metric = 'offer_to_call_seconds'), 0) as offer_to_call_seconds,
      coalesce(sum(amount) filter (where metric = 'wait_under_30'), 0) as wait_under_30,
      coalesce(sum(amount) filter (where metric = 'wait_30_to_59'), 0) as wait_30_to_59,
      coalesce(sum(amount) filter (where metric = 'wait_60_to_119'), 0) as wait_60_to_119,
      coalesce(sum(amount) filter (where metric = 'wait_120_plus'), 0) as wait_120_plus
    from events
    group by 1, 2, 3
  )
  -- A day already in daily_stats gets the new numbers added to it, never replaced.
  insert into public.daily_stats as s (
    day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
    open_at_deletion,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10,
    called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus
  )
  select day, site, is_demo, triaged_ctas_4_5, not_eligible, offered, declined,
    called_and_arrived, call_to_arrival_seconds, arrived, no_shows, removed_left, unable_to_reach,
    open_at_deletion,
    started_from_home, home_reached_triage, survey_responses, survey_score_sum, survey_9_or_10,
    called, offer_to_call_seconds, wait_under_30, wait_30_to_59, wait_60_to_119, wait_120_plus
  from totals
  on conflict (day, site, is_demo) do update set
    triaged_ctas_4_5 = s.triaged_ctas_4_5 + excluded.triaged_ctas_4_5,
    not_eligible = s.not_eligible + excluded.not_eligible,
    offered = s.offered + excluded.offered,
    declined = s.declined + excluded.declined,
    called_and_arrived = s.called_and_arrived + excluded.called_and_arrived,
    call_to_arrival_seconds = s.call_to_arrival_seconds + excluded.call_to_arrival_seconds,
    arrived = s.arrived + excluded.arrived,
    no_shows = s.no_shows + excluded.no_shows,
    removed_left = s.removed_left + excluded.removed_left,
    unable_to_reach = s.unable_to_reach + excluded.unable_to_reach,
    open_at_deletion = s.open_at_deletion + excluded.open_at_deletion,
    started_from_home = s.started_from_home + excluded.started_from_home,
    home_reached_triage = s.home_reached_triage + excluded.home_reached_triage,
    survey_responses = s.survey_responses + excluded.survey_responses,
    survey_score_sum = s.survey_score_sum + excluded.survey_score_sum,
    survey_9_or_10 = s.survey_9_or_10 + excluded.survey_9_or_10,
    called = s.called + excluded.called,
    offer_to_call_seconds = s.offer_to_call_seconds + excluded.offer_to_call_seconds,
    wait_under_30 = s.wait_under_30 + excluded.wait_under_30,
    wait_30_to_59 = s.wait_30_to_59 + excluded.wait_30_to_59,
    wait_60_to_119 = s.wait_60_to_119 + excluded.wait_60_to_119,
    wait_120_plus = s.wait_120_plus + excluded.wait_120_plus;
end;
$$;

-- Only the cron job (and the owner in the SQL Editor) runs it; patients, staff and the
-- service key cannot.
revoke execute on function public.delete_old_visits() from public, anon, authenticated, service_role;
```

## Checked (output in this session)

- Before the migration: the guard test gave 2 failed, 1 passed (the 6 wait columns missing).
- After: the guard test 3 passed; `npm test` 115 files, 741 tests pass; lint exit 0; build passed.
- `diff` of the function body against 20261120030000 shows only the lines above.
- The owner ran the migration on the live database with no errors.
- `pg_get_functiondef('public.delete_old_visits()')` on the live database shows the 6 wait events and the `offered` and `declined` events on `triaged_at`.

## Not checked

- `supabase/checks/daily_stats.sql` (a rollback-only SQL check with synthetic visits, 7 expected rows) ran with no errors, but the owner did not paste its 7 rows, so the row values are not checked here.

## Response

