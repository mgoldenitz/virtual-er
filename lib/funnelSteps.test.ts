import { describe, expect, it } from "vitest";
import type { SiteNumbers } from "./dashboardNumbers";
import { funnelSteps } from "./funnelSteps";

// Each field has its own number, so a step that reads the wrong field gives a wrong count.
const numbers: SiteNumbers = {
  waitingNow: 101, recalledNow: 102, reassessmentNow: 103, triaged: 3, offered: 4, declined: 104, accepted: 5,
  arrivedAfterRecall: 7, recallToArrivalSeconds: 105, noShows: 106, unableToReach: 107, left: 108,
  startedFromHome: 1, homeReachedTriage: 2, surveyResponses: 8, surveyScoreSum: 109, survey9or10: 110,
  recalled: 6, offerToCallSeconds: 111, waitUnder30: 112, wait30to59: 113, wait60to119: 114, wait120plus: 115,
};

describe("funnelSteps", () => {
  it("gives the 8 steps in order, each with its count only", () => {
    expect(funnelSteps(numbers)).toEqual([
      { label: "Started from home", count: 1 },
      { label: "Reached triage (from home)", count: 2 },
      { label: "Triaged CTAS 4 or 5 (home and desk)", count: 3 },
      { label: "Offered", count: 4 },
      { label: "Accepted", count: 5 },
      { label: "Recalled", count: 6 },
      { label: "Arrived after recall", count: 7 },
      { label: "Answered survey", count: 8 },
    ]);
  });

  it("keeps a lower step that is larger than the step above it", () => {
    const steps = funnelSteps({ ...numbers, startedFromHome: 0, triaged: 9 });
    expect(steps[0].count).toBe(0);
    expect(steps[2].count).toBe(9);
  });
});
