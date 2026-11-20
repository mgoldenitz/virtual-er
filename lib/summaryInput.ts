// Picks the only numbers that may leave for the Claude dashboard summary, and reads the request body that asks for one.
// Each field is copied by name, so a field added later to SiteNumbers is never sent by accident (SPEC rule 1).

import type { SiteNumbers } from "./dashboardNumbers";
import type { Site } from "./visit";

/** What the summary route sends to Claude: the two sites' totals and whether the numbers are demo numbers. */
export type SummaryInput = { isDemo: boolean; sites: Record<Site, SiteNumbers> };

/** Copies the 17 SiteNumbers fields for sites A and B into new objects, and nothing else. */
export function summaryInput(numbers: Record<Site, SiteNumbers>, isDemo: boolean): SummaryInput {
  return { isDemo, sites: { A: siteTotals(numbers.A), B: siteTotals(numbers.B) } };
}

/** The body the staff browser sends: `{ isDemo: true }` or `{ isDemo: false }`. Anything else gives null. */
export function parseSummaryBody(body: unknown): { isDemo: boolean } | null {
  if (typeof body !== "object" || body === null || Array.isArray(body)) return null;
  const isDemo = (body as { isDemo?: unknown }).isDemo;
  if (typeof isDemo !== "boolean") return null;
  return { isDemo };
}

// Copies one site's 17 fields by name.
function siteTotals(n: SiteNumbers): SiteNumbers {
  return {
    waitingNow: n.waitingNow,
    recalledNow: n.recalledNow,
    reassessmentNow: n.reassessmentNow,
    triaged: n.triaged,
    offered: n.offered,
    declined: n.declined,
    accepted: n.accepted,
    arrivedAfterRecall: n.arrivedAfterRecall,
    recallToArrivalSeconds: n.recallToArrivalSeconds,
    noShows: n.noShows,
    unableToReach: n.unableToReach,
    left: n.left,
    startedFromHome: n.startedFromHome,
    homeReachedTriage: n.homeReachedTriage,
    surveyResponses: n.surveyResponses,
    surveyScoreSum: n.surveyScoreSum,
    survey9or10: n.survey9or10,
  };
}
