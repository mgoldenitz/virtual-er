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
