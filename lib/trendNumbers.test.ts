import { describe, expect, it } from "vitest";
import type { DailyStatsRow, DashboardVisit } from "./dashboardNumbers";
import { hasPastData, trendCsvRows, trendNumbers } from "./trendNumbers";

const today = "2026-11-18";

// A live visit with every time empty, so each test sets only what it needs.
function visit(overrides: Partial<DashboardVisit> = {}): DashboardVisit {
  return {
    site: "A", source: "desk", ctas_level: 4, status: "waiting", removed_reason: null,
    created_at: "2026-11-18T15:00:00.000Z", triaged_at: null, offered_at: null, called_at: null,
    arrived_at: null, closed_at: null, survey_score: null, is_demo: false, ...overrides,
  };
}

// A daily_stats row for site A, real visits, with every number at 0.
function statsRow(overrides: Partial<DailyStatsRow>): DailyStatsRow {
  return {
    day: "2026-11-12", site: "A", is_demo: false, triaged_ctas_4_5: 0, not_eligible: 0, offered: 0, declined: 0,
    called_and_arrived: 0, call_to_arrival_seconds: 0, arrived: 0, no_shows: 0, removed_left: 0,
    unable_to_reach: 0, open_at_deletion: 0, started_from_home: 0, home_reached_triage: 0,
    survey_responses: 0, survey_score_sum: 0, survey_9_or_10: 0, called: 0, offer_to_call_seconds: 0,
    wait_under_30: 0, wait_30_to_59: 0, wait_60_to_119: 0, wait_120_plus: 0, ...overrides,
  };
}

describe("trendNumbers", () => {
  it("gives the 7 past days, oldest first, each counted on its own date", () => {
    // Offered at 12:00 on 2026-11-17 in Toronto: it counts on the 17th only, not today.
    const trend = trendNumbers([visit({ offered_at: "2026-11-17T17:00:00.000Z" })], [], today, false);
    expect(trend.map((d) => d.day)).toEqual([
      "2026-11-11", "2026-11-12", "2026-11-13", "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17",
    ]);
    expect(trend.map((d) => d.numbers.A.offered)).toEqual([0, 0, 0, 0, 0, 0, 1]);
  });

  it("adds a stats row to its own day and site, and not demo rows to real numbers", () => {
    const trend = trendNumbers(
      [],
      [statsRow({ offered: 3 }), statsRow({ site: "B", offered: 2 }), statsRow({ is_demo: true, offered: 9 })],
      today,
      false,
    );
    expect(trend[1].numbers.A.offered).toBe(3);
    expect(trend[1].numbers.B.offered).toBe(2);
    expect(trend[0].numbers.A.offered).toBe(0);
  });
});

describe("trendCsvRows", () => {
  it("gives one row per day and site, day by day, site A before site B", () => {
    const rows = trendCsvRows(trendNumbers([], [], today, false));
    expect(rows).toHaveLength(14);
    expect(rows.slice(0, 3).map((r) => `${r.day} ${r.site}`)).toEqual(["2026-11-11 A", "2026-11-11 B", "2026-11-12 A"]);
  });
});

describe("hasPastData", () => {
  it("is false with no visits and no stats", () => {
    expect(hasPastData(trendNumbers([], [], today, false))).toBe(false);
  });

  it("is false when the only visit is waiting now, because the Now counts are not past-day numbers", () => {
    expect(hasPastData(trendNumbers([visit({ status: "waiting" })], [], today, false))).toBe(false);
  });

  it("is true when a stats row has a number on a past day", () => {
    expect(hasPastData(trendNumbers([], [statsRow({ site: "B", offered: 2 })], today, false))).toBe(true);
  });

  it("is true when a live visit had an event on a past day", () => {
    const trend = trendNumbers([visit({ offered_at: "2026-11-17T17:00:00.000Z" })], [], today, false);
    expect(hasPastData(trend)).toBe(true);
  });
});
