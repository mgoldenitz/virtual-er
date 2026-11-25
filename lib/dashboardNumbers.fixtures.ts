// Shared test data for the dashboardNumbers tests.
import { dashboardNumbers, type DailyStatsRow, type DashboardVisit } from "./dashboardNumbers";

export const today = "2026-11-18";
export const thisDay = "2026-11-18T18:00:00.000Z";
export const yesterday = "2026-11-17T18:00:00.000Z";

// A live visit with every time empty, so each test sets only what it needs.
export function visit(overrides: Partial<DashboardVisit> = {}): DashboardVisit {
  return {
    site: "A",
    source: "desk",
    ctas_level: 4,
    status: "waiting",
    removed_reason: null,
    created_at: thisDay,
    triaged_at: null,
    offered_at: null,
    called_at: null,
    arrived_at: null,
    closed_at: null,
    survey_score: null,
    is_demo: false,
    ...overrides,
  };
}

// A daily_stats row for today, site A, real visits, with every number at 0.
export function statsRow(overrides: Partial<DailyStatsRow> = {}): DailyStatsRow {
  return {
    day: today,
    site: "A",
    is_demo: false,
    triaged_ctas_4_5: 0,
    not_eligible: 0,
    offered: 0,
    declined: 0,
    called_and_arrived: 0,
    call_to_arrival_seconds: 0,
    arrived: 0,
    no_shows: 0,
    removed_left: 0,
    unable_to_reach: 0,
    open_at_deletion: 0,
    started_from_home: 0,
    home_reached_triage: 0,
    survey_responses: 0,
    survey_score_sum: 0,
    survey_9_or_10: 0,
    called: 0,
    offer_to_call_seconds: 0,
    wait_under_30: 0,
    wait_30_to_59: 0,
    wait_60_to_119: 0,
    wait_120_plus: 0,
    ...overrides,
  };
}

// Site A numbers for real (not demo) data.
export function siteA(visits: DashboardVisit[], stats: DailyStatsRow[] = []) {
  return dashboardNumbers(visits, stats, today, false).A;
}
