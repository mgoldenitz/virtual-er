// The recall and off-site wait numbers (SPEC: Recalled, Average minutes from offer to recall, Wait bands).
// The same rules as delete_old_visits() in 20261121010000_wait_stats_on_triage_day.sql
// (first made in 20261120030000_wait_and_recall_stats.sql).
import { describe, expect, it } from "vitest";
import { dashboardNumbers, type DailyStatsRow, type DashboardVisit } from "./dashboardNumbers";

// Toronto is on EST (UTC-5) on this date, so 10:00 Toronto is 15:00Z.
const today = "2026-11-18";

// A recalled visit at site A, offered and called at the given times.
function recalled(offered_at: string | null, called_at: string, overrides: Partial<DashboardVisit> = {}): DashboardVisit {
  return {
    site: "A",
    source: "desk",
    ctas_level: 4,
    status: "called",
    removed_reason: null,
    created_at: "2026-11-18T14:00:00.000Z",
    triaged_at: "2026-11-18T14:00:00.000Z",
    offered_at,
    called_at,
    arrived_at: null,
    closed_at: null,
    survey_score: null,
    is_demo: false,
    ...overrides,
  };
}

// A daily_stats row for today, site A, real visits, with every number at 0.
function statsRow(overrides: Partial<DailyStatsRow> = {}): DailyStatsRow {
  return {
    day: today, site: "A", is_demo: false,
    triaged_ctas_4_5: 0, not_eligible: 0, offered: 0, declined: 0, called_and_arrived: 0,
    call_to_arrival_seconds: 0, arrived: 0, no_shows: 0, removed_left: 0, unable_to_reach: 0,
    open_at_deletion: 0, started_from_home: 0, home_reached_triage: 0, survey_responses: 0,
    survey_score_sum: 0, survey_9_or_10: 0,
    called: 0, offer_to_call_seconds: 0, wait_under_30: 0, wait_30_to_59: 0, wait_60_to_119: 0, wait_120_plus: 0,
    ...overrides,
  };
}

function siteA(visits: DashboardVisit[], stats: DailyStatsRow[] = []) {
  return dashboardNumbers(visits, stats, today, false).A;
}

// Only the 6 wait numbers, so each test reads in one line.
function waitNumbers(visits: DashboardVisit[], stats: DailyStatsRow[] = []) {
  const n = siteA(visits, stats);
  return [n.recalled, n.offerToCallSeconds, n.waitUnder30, n.wait30to59, n.wait60to119, n.wait120plus];
}

const offer = "2026-11-18T15:00:00.000Z";

describe("dashboardNumbers: recall and off-site wait", () => {
  it("counts a wait of 1769 seconds (29 minutes) under 30", () => {
    expect(waitNumbers([recalled(offer, "2026-11-18T15:29:29.000Z")])).toEqual([1, 1769, 1, 0, 0, 0]);
  });

  it("rounds 1769.6 seconds to 1770 first, so the wait is 30 minutes", () => {
    expect(waitNumbers([recalled(offer, "2026-11-18T15:29:29.600Z")])).toEqual([1, 1770, 0, 1, 0, 0]);
  });

  it("puts 3570 seconds in 60 to 119 and 7170 seconds in 120 or more", () => {
    expect(waitNumbers([recalled(offer, "2026-11-18T15:59:30.000Z")])).toEqual([1, 3570, 0, 0, 1, 0]);
    expect(waitNumbers([recalled(offer, "2026-11-18T16:59:30.000Z")])).toEqual([1, 7170, 0, 0, 0, 1]);
  });

  it("does not count a recall with no offer time", () => {
    expect(waitNumbers([recalled(null, "2026-11-18T15:30:00.000Z")])).toEqual([0, 0, 0, 0, 0, 0]);
  });

  it("counts a recall on the called_at date, not the offered_at date", () => {
    // Offered 23:50 on 11-17 and called 00:10 on 11-18, Toronto time: counts today.
    const acrossMidnight = recalled("2026-11-18T04:50:00.000Z", "2026-11-18T05:10:00.000Z");
    // Offered today, called 00:10 on 11-19, Toronto time: not today.
    const calledTomorrow = recalled("2026-11-19T04:50:00.000Z", "2026-11-19T05:10:00.000Z");
    expect(waitNumbers([acrossMidnight, calledTomorrow])).toEqual([1, 1200, 1, 0, 0, 0]);
  });

  it("counts a recall whatever happened after it", () => {
    const called = "2026-11-18T15:20:00.000Z";
    const visits = [
      recalled(offer, called, { status: "arrived", arrived_at: "2026-11-18T15:40:00.000Z" }),
      recalled(offer, called, { status: "needs_reassessment" }),
      recalled(offer, called, { status: "removed", removed_reason: "no_show", closed_at: called }),
      recalled(offer, called, { status: "unable_to_reach", closed_at: called }),
    ];
    expect(waitNumbers(visits)).toEqual([4, 4800, 4, 0, 0, 0]);
  });

  it("adds today's daily_stats numbers, but not another day or the other mode", () => {
    const stats = [
      statsRow({ called: 2, offer_to_call_seconds: 3000, wait_under_30: 1, wait_60_to_119: 1 }),
      statsRow({ day: "2026-11-17", called: 5, offer_to_call_seconds: 9000, wait_120_plus: 5 }),
      statsRow({ is_demo: true, called: 7, offer_to_call_seconds: 9000, wait_30_to_59: 7 }),
    ];
    expect(waitNumbers([recalled(offer, "2026-11-18T15:29:29.000Z")], stats)).toEqual([3, 4769, 2, 0, 1, 0]);
  });
});
