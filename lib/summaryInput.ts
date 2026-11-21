// Picks the only numbers that may leave for the Claude dashboard summary, and reads the request body that asks for one.
// Each field is copied by name, so a field added later to SiteNumbers is never sent by accident (SPEC rule 1).

import type { SiteNumbers } from "./dashboardNumbers";
import type { Site } from "./visit";

/** The 23 numbers per site that may go to Claude, named one by one.
 * A field added later to SiteNumbers is not in this list, so it is not sent. */
type SummarySite = Pick<
  SiteNumbers,
  | "waitingNow"
  | "recalledNow"
  | "reassessmentNow"
  | "triaged"
  | "offered"
  | "declined"
  | "accepted"
  | "arrivedAfterRecall"
  | "recallToArrivalSeconds"
  | "noShows"
  | "unableToReach"
  | "left"
  | "startedFromHome"
  | "homeReachedTriage"
  | "surveyResponses"
  | "surveyScoreSum"
  | "survey9or10"
  | "recalled"
  | "offerToCallSeconds"
  | "waitUnder30"
  | "wait30to59"
  | "wait60to119"
  | "wait120plus"
>;

/** What the summary route sends to Claude: the two sites' totals and whether the numbers are demo numbers.
 * The wait numbers were added with the owner's OK on 2026-11-21. */
export type SummaryInput = { isDemo: boolean; sites: Record<Site, SummarySite> };

/** Copies the 23 SiteNumbers fields for sites A and B into new objects, and nothing else. */
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

// Copies one site's 23 fields by name.
function siteTotals(n: SiteNumbers): SummarySite {
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
    recalled: n.recalled,
    offerToCallSeconds: n.offerToCallSeconds,
    waitUnder30: n.waitUnder30,
    wait30to59: n.wait30to59,
    wait60to119: n.wait60to119,
    wait120plus: n.wait120plus,
  };
}
