// The numbers for the 7 past days, per site, for the trend table and the CSV download.
// Each day is counted by the same rule as "Today" (dashboardNumbers), on the date of each event.

import type { CsvDay } from "./dashboardCsv";
import { dashboardNumbers, type DailyStatsRow, type DashboardVisit, type SiteNumbers } from "./dashboardNumbers";
import { pastDays } from "./pastDays";
import type { Site } from "./visit";

export type TrendDay = { day: string; numbers: Record<Site, SiteNumbers> };

/** One entry per past day, oldest first. */
export function trendNumbers(
  visits: DashboardVisit[],
  stats: DailyStatsRow[],
  today: string,
  isDemo: boolean,
): TrendDay[] {
  return pastDays(today).map((day) => ({ day, numbers: dashboardNumbers(visits, stats, day, isDemo) }));
}

/** The CSV rows: day by day, and site A before site B in each day. */
export function trendCsvRows(trend: TrendDay[]): CsvDay[] {
  return trend.flatMap(({ day, numbers }) => [
    { day, site: "A" as const, numbers: numbers.A },
    { day, site: "B" as const, numbers: numbers.B },
  ]);
}

// The counts that each start with an event on a date. The 3 "Now" counts are left out: they are the same on every date.
// The other SiteNumbers fields (declined, accepted, seconds, scores, bands) only grow when one of these grows.
const EVENT_COUNTS = [
  "startedFromHome", "homeReachedTriage", "triaged", "offered", "recalled",
  "arrivedAfterRecall", "noShows", "unableToReach", "left", "surveyResponses",
] as const;

/** True when any past day has a number to download. False gives "No past days to download yet." */
export function hasPastData(trend: TrendDay[]): boolean {
  return trend.some((d) =>
    EVENT_COUNTS.some((key) => d.numbers.A[key] > 0 || d.numbers.B[key] > 0),
  );
}
