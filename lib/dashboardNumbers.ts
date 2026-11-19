// Counts the staff dashboard numbers for one day, per site: the live visits plus the daily_stats totals.
// Raw counts and sums only. Percentages and averages are worked out by another file.

import { torontoDay } from "./torontoDay";
import type { Site, Visit } from "./visit";

/** One row of daily_stats (see supabase/migrations/20261116100000_daily_stats_and_cleanup.sql). */
export type DailyStatsRow = {
  day: string;
  site: Site;
  is_demo: boolean;
  triaged_ctas_4_5: number;
  not_eligible: number;
  offered: number;
  declined: number;
  called_and_arrived: number;
  call_to_arrival_seconds: number;
  arrived: number;
  no_shows: number;
  removed_left: number;
  unable_to_reach: number;
  open_at_deletion: number;
  started_from_home: number;
  home_reached_triage: number;
  survey_responses: number;
  survey_score_sum: number;
  survey_9_or_10: number;
};

/** The visit fields the dashboard reads. */
export type DashboardVisit = Pick<
  Visit,
  | "site"
  | "source"
  | "ctas_level"
  | "status"
  | "removed_reason"
  | "created_at"
  | "triaged_at"
  | "offered_at"
  | "called_at"
  | "arrived_at"
  | "closed_at"
  | "survey_score"
  | "is_demo"
>;

/** Raw counts and sums for one site. */
export type SiteNumbers = {
  waitingNow: number;
  recalledNow: number;
  reassessmentNow: number;
  triaged: number;
  offered: number;
  declined: number;
  accepted: number;
  arrivedAfterRecall: number;
  recallToArrivalSeconds: number;
  noShows: number;
  unableToReach: number;
  left: number;
  startedFromHome: number;
  homeReachedTriage: number;
  surveyResponses: number;
  surveyScoreSum: number;
  survey9or10: number;
};

/** Counts every number for both sites. Only rows whose is_demo equals isDemo are used. */
export function dashboardNumbers(
  visits: DashboardVisit[],
  stats: DailyStatsRow[],
  today: string,
  isDemo: boolean,
): Record<Site, SiteNumbers> {
  return {
    A: siteNumbers("A", visits, stats, today, isDemo),
    B: siteNumbers("B", visits, stats, today, isDemo),
  };
}

function siteNumbers(
  site: Site,
  allVisits: DashboardVisit[],
  allStats: DailyStatsRow[],
  today: string,
  isDemo: boolean,
): SiteNumbers {
  const visits = allVisits.filter((v) => v.site === site && v.is_demo === isDemo);
  const stats = allStats.filter((s) => s.site === site && s.is_demo === isDemo && s.day === today);

  // True when this moment falls on today's Toronto date.
  const on = (iso: string | null): boolean => iso !== null && torontoDay(iso) === today;
  // Count the live visits that pass a test.
  const countVisits = (test: (v: DashboardVisit) => boolean): number => visits.filter(test).length;
  // Add up one daily_stats column over today's rows.
  const fromStats = (column: (s: DailyStatsRow) => number): number =>
    stats.reduce((total, s) => total + column(s), 0);

  // Visits that were called, then arrived today (the set behind the call-to-arrival average).
  const calledAndArrived = visits.filter(
    (v) => v.status === "arrived" && v.called_at !== null && on(v.arrived_at),
  );
  // Visits that answered a survey today (closed today with a score).
  const surveyed = visits.filter((v) => v.survey_score !== null && on(v.closed_at));
  // Visits started from home today.
  const startedHome = visits.filter((v) => v.source === "home" && on(v.created_at));

  const offered = countVisits((v) => on(v.offered_at)) + fromStats((s) => s.offered);
  const declined =
    countVisits((v) => v.status === "declined" && on(v.offered_at)) + fromStats((s) => s.declined);

  return {
    // Live now: no date test, because daily_stats has no "now" numbers.
    waitingNow: countVisits((v) => v.status === "waiting"),
    recalledNow: countVisits((v) => v.status === "called" || v.status === "on_the_way"),
    reassessmentNow: countVisits((v) => v.status === "needs_reassessment"),

    // CTAS 4 or 5 patients triaged today.
    triaged:
      countVisits((v) => (v.ctas_level === 4 || v.ctas_level === 5) && on(v.triaged_at)) +
      fromStats((s) => s.triaged_ctas_4_5),
    // Visits offered off-site waiting today.
    offered,
    // Offered today and then declined.
    declined,
    // Offered minus declined.
    accepted: offered - declined,

    // Called, then arrived today.
    arrivedAfterRecall: calledAndArrived.length + fromStats((s) => s.called_and_arrived),
    // Total seconds from call-back to arrival, rounded to whole seconds per visit.
    recallToArrivalSeconds:
      calledAndArrived.reduce((total, v) => total + secondsBetween(v.called_at, v.arrived_at), 0) +
      fromStats((s) => s.call_to_arrival_seconds),

    // Removed today as no-shows, or as left.
    noShows:
      countVisits((v) => v.status === "removed" && v.removed_reason === "no_show" && on(v.closed_at)) +
      fromStats((s) => s.no_shows),
    left:
      countVisits((v) => v.status === "removed" && v.removed_reason === "left" && on(v.closed_at)) +
      fromStats((s) => s.removed_left),
    // Confirmed unable to reach today.
    unableToReach:
      countVisits((v) => v.status === "unable_to_reach" && on(v.closed_at)) +
      fromStats((s) => s.unable_to_reach),

    // Started from home today, and of those, reached triage.
    startedFromHome: startedHome.length + fromStats((s) => s.started_from_home),
    homeReachedTriage:
      startedHome.filter((v) => v.triaged_at !== null).length + fromStats((s) => s.home_reached_triage),

    // Survey answers given today: the count, the score total, and the 9 or 10 scores.
    surveyResponses: surveyed.length + fromStats((s) => s.survey_responses),
    surveyScoreSum:
      surveyed.reduce((total, v) => total + (v.survey_score ?? 0), 0) + fromStats((s) => s.survey_score_sum),
    survey9or10:
      surveyed.filter((v) => v.survey_score === 9 || v.survey_score === 10).length +
      fromStats((s) => s.survey_9_or_10),
  };
}

// Whole seconds from one time to another (0 if either time is missing).
function secondsBetween(from: string | null, to: string | null): number {
  if (from === null || to === null) return 0;
  return Math.round((Date.parse(to) - Date.parse(from)) / 1000);
}
