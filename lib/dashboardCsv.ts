// Turns the past days' numbers into CSV text for the staff download: a header line, then one line per day and site.
// Only counts, shares and averages go in: no codes, tokens or visit times.

import type { SiteNumbers } from "./dashboardNumbers";
import { averageMinutes, averageScore, share } from "./dashboardShare";
import type { Site } from "./visit";
import { WAIT_START_DAY } from "./waitStart";

export type CsvDay = { day: string; site: Site; numbers: SiteNumbers };

export const CSV_HEADER =
  "day,site,is_demo,triaged,offered,offered_percent,accepted,arrived_after_recall," +
  "recall_to_arrival_minutes,recalled,offer_to_recall_minutes,survey_responses,survey_average";

// A share or average with nothing to divide by is an empty cell, not "-", so a spreadsheet reads it as blank.
function cell(value: number | null): string {
  return value === null ? "" : String(value);
}

function csvLine({ day, site, numbers: n }: CsvDay, isDemo: boolean): string {
  // The dates are "YYYY-MM-DD", so comparing the text compares the dates.
  const hasWait = day >= WAIT_START_DAY;
  return [
    day,
    site,
    String(isDemo),
    cell(n.triaged),
    cell(n.offered),
    cell(share(n.offered, n.triaged)),
    cell(n.accepted),
    cell(n.arrivedAfterRecall),
    cell(averageMinutes(n.recallToArrivalSeconds, n.arrivedAfterRecall)),
    hasWait ? cell(n.recalled) : "",
    hasWait ? cell(averageMinutes(n.offerToCallSeconds, n.recalled)) : "",
    cell(n.surveyResponses),
    cell(averageScore(n.surveyScoreSum, n.surveyResponses)),
  ].join(",");
}

/** The CSV text, with Windows line ends ("\r\n"), which the CSV standard (RFC 4180) uses and Excel reads. */
export function dashboardCsv(rows: CsvDay[], isDemo: boolean): string {
  return [CSV_HEADER, ...rows.map((row) => csvLine(row, isDemo))].map((line) => `${line}\r\n`).join("");
}
