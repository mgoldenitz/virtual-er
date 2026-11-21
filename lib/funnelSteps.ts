// Turns one site's numbers for today into the funnel steps, in order, as label and count (no percent, owner 2026-11-20).

import type { SiteNumbers } from "./dashboardNumbers";

export type FunnelStep = { label: string; count: number };

/** The 8 steps from home start to survey. Desk patients join at "Triaged", so a lower step can be larger. */
export function funnelSteps(n: SiteNumbers): FunnelStep[] {
  return [
    { label: "Started from home", count: n.startedFromHome },
    { label: "Started from home today and reached triage", count: n.homeReachedTriage },
    { label: "Triaged CTAS 4 or 5 (home and desk)", count: n.triaged },
    { label: "Offered", count: n.offered },
    { label: "Accepted", count: n.accepted },
    { label: "Recalled", count: n.recalled },
    { label: "Arrived after recall", count: n.arrivedAfterRecall },
    { label: "Answered survey", count: n.surveyResponses },
  ];
}
