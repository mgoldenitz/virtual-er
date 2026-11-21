// Checks the dashboard numbers against 20 synthetic visits written by Gemini 3.6 Flash, High, on 2026-11-18,
// with every expected number checked by hand by Claude (handoffs/archive/2026-11-18-gemini-flash-dashboard-synthetic-visits.md).
// The visits test Toronto midnight, yesterday's offers, demo visits and empty bottoms (null shares).

import { describe, expect, it } from "vitest";
import { dashboardNumbers, type DashboardVisit } from "./dashboardNumbers";
import { averageMinutes, averageScore, share } from "./dashboardShare";

// Makes one visit; the fields come in the same order as the handoff JSON.
function v(
  site: "A" | "B",
  source: "home" | "desk",
  ctas_level: 4 | 5 | null,
  status: DashboardVisit["status"],
  removed_reason: "left" | "no_show" | null,
  times: [string, string | null, string | null, string | null, string | null, string | null],
  survey_score: number | null,
  is_demo = false,
): DashboardVisit {
  const [created_at, triaged_at, offered_at, called_at, arrived_at, closed_at] = times;
  return { site, source, ctas_level, status, removed_reason, created_at, triaged_at, offered_at, called_at, arrived_at, closed_at, survey_score, is_demo };
}

// Times: created, triaged, offered, called, arrived, closed. The comment is the visit's number in the handoff.
const visits: DashboardVisit[] = [
  /* 0 */ v("A", "home", 4, "removed", "no_show", ["2026-11-18T04:10:00Z", "2026-11-18T04:20:00Z", "2026-11-18T04:25:00Z", "2026-11-18T04:35:00Z", null, "2026-11-18T04:58:00Z"], 10),
  /* 1 */ v("A", "desk", 4, "arrived", null, ["2026-11-18T04:30:00Z", "2026-11-18T04:40:00Z", "2026-11-18T04:45:00Z", "2026-11-18T04:50:00Z", "2026-11-18T05:02:30Z", "2026-11-18T05:15:00Z"], 0),
  /* 2 */ v("A", "desk", 5, "declined", null, ["2026-11-17T23:10:00-05:00", "2026-11-17T23:20:00-05:00", "2026-11-17T23:25:00-05:00", null, null, "2026-11-18T00:10:00-05:00"], null),
  /* 3 */ v("A", "desk", 4, "declined", null, ["2026-11-18T08:00:00-05:00", "2026-11-18T08:10:00-05:00", "2026-11-18T08:12:00-05:00", null, null, "2026-11-18T08:12:00-05:00"], null),
  /* 4 */ v("A", "home", 4, "arrived", null, ["2026-11-18T09:00:00-05:00", "2026-11-18T09:20:00-05:00", "2026-11-18T09:25:00-05:00", "2026-11-18T10:00:00-05:00", "2026-11-18T10:12:30-05:00", "2026-11-18T10:45:00-05:00"], 10),
  /* 5 */ v("A", "desk", 5, "arrived", null, ["2026-11-18T11:00:00-05:00", "2026-11-18T11:10:00-05:00", "2026-11-18T11:15:00-05:00", null, "2026-11-18T11:40:00-05:00", "2026-11-18T12:00:00-05:00"], 9),
  /* 6 */ v("A", "desk", 4, "removed", "no_show", ["2026-11-18T12:10:00-05:00", "2026-11-18T12:20:00-05:00", "2026-11-18T12:25:00-05:00", "2026-11-18T13:00:00-05:00", null, "2026-11-18T13:30:00-05:00"], 8),
  /* 7 */ v("A", "home", 5, "removed", "left", ["2026-11-18T13:40:00-05:00", "2026-11-18T14:00:00-05:00", "2026-11-18T14:05:00-05:00", null, null, "2026-11-18T14:30:00-05:00"], null),
  /* 8 */ v("A", "desk", 4, "unable_to_reach", null, ["2026-11-17T21:50:00-05:00", "2026-11-17T22:00:00-05:00", "2026-11-17T22:05:00-05:00", "2026-11-17T23:30:00-05:00", null, "2026-11-18T00:05:00-05:00"], null),
  /* 9 */ v("A", "desk", null, "not_eligible", null, ["2026-11-18T15:00:00-05:00", "2026-11-18T15:05:00-05:00", null, null, null, "2026-11-18T15:05:00-05:00"], null),
  /* 10 */ v("A", "desk", 4, "waiting", null, ["2026-11-17T22:30:00-05:00", "2026-11-17T22:40:00-05:00", "2026-11-17T22:45:00-05:00", null, null, null], null),
  /* 11 */ v("A", "desk", 5, "not_eligible", null, ["2026-11-18T16:00:00-05:00", "2026-11-18T16:08:00-05:00", null, null, null, "2026-11-18T16:08:00-05:00"], null),
  /* 12 */ v("A", "desk", 4, "on_the_way", null, ["2026-11-17T23:00:00-05:00", "2026-11-17T23:10:00-05:00", "2026-11-17T23:15:00-05:00", "2026-11-18T21:45:00-05:00", null, null], null),
  /* 13 */ v("A", "desk", 5, "needs_reassessment", null, ["2026-11-17T23:05:00-05:00", "2026-11-17T23:15:00-05:00", "2026-11-17T23:20:00-05:00", "2026-11-18T17:00:00-05:00", "2026-11-18T17:10:00-05:00", null], null),
  /* 14 */ v("A", "home", 5, "removed", "left", ["2026-11-19T05:01:00Z", "2026-11-19T05:05:00Z", "2026-11-19T05:08:00Z", null, null, "2026-11-19T05:15:00Z"], 10),
  /* 15 */ v("A", "home", 5, "not_eligible", null, ["2026-11-19T04:30:00Z", "2026-11-19T04:50:00Z", null, null, null, "2026-11-19T04:50:00Z"], null),
  /* 16 */ v("A", "home", null, "pre_arrival", null, ["2026-11-18T22:15:00-05:00", null, null, null, null, null], null),
  /* 17 */ v("A", "home", 4, "arrived", null, ["2026-11-18T14:00:00-05:00", "2026-11-18T14:10:00-05:00", "2026-11-18T14:15:00-05:00", "2026-11-18T14:30:00-05:00", "2026-11-18T16:30:00-05:00", "2026-11-18T17:00:00-05:00"], 10, true),
  /* 18 */ v("B", "desk", 4, "called", null, ["2026-11-17T23:30:00-05:00", "2026-11-17T23:45:00-05:00", "2026-11-18T00:15:00-05:00", "2026-11-18T00:45:00-05:00", null, null], null),
  /* 19 */ v("B", "home", 5, "waiting", null, ["2026-11-18T10:00:00-05:00", "2026-11-18T10:15:00-05:00", "2026-11-18T10:20:00-05:00", null, null, null], null, true),
];

const numbers = dashboardNumbers(visits, [], "2026-11-18", false);

describe("dashboard numbers: Gemini's synthetic visits", () => {
  it("gives the hand-checked counts for site A", () => {
    expect(numbers.A).toEqual({
      waitingNow: 1, recalledNow: 1, reassessmentNow: 1,
      triaged: 7, offered: 5, declined: 1, accepted: 4,
      arrivedAfterRecall: 2, recallToArrivalSeconds: 1500,
      noShows: 1, left: 1, unableToReach: 1,
      startedFromHome: 4, homeReachedTriage: 3,
      surveyResponses: 4, surveyScoreSum: 27, survey9or10: 2,
    });
  });

  // Visit 18 was triaged before midnight and offered after it. Since the owner decision of
  // 2026-11-21 (fault 2), an offer counts on the triage day, so site B has no offer today.
  it("gives the hand-checked counts for site B (no triage today, no offer)", () => {
    expect(numbers.B).toEqual({
      waitingNow: 0, recalledNow: 1, reassessmentNow: 0,
      triaged: 0, offered: 0, declined: 0, accepted: 0,
      arrivedAfterRecall: 0, recallToArrivalSeconds: 0,
      noShows: 0, left: 0, unableToReach: 0,
      startedFromHome: 0, homeReachedTriage: 0,
      surveyResponses: 0, surveyScoreSum: 0, survey9or10: 0,
    });
  });

  it("gives the shown values, with halves rounded up and null for an empty bottom", () => {
    const { A, B } = numbers;
    expect(share(A.offered, A.triaged)).toBe(71);
    expect(share(A.accepted, A.offered)).toBe(80);
    expect(averageMinutes(A.recallToArrivalSeconds, A.arrivedAfterRecall)).toBe(13);
    expect(averageScore(A.surveyScoreSum, A.surveyResponses)).toBe(6.8);
    expect(share(A.survey9or10, A.surveyResponses)).toBe(50);
    expect(share(B.offered, B.triaged)).toBeNull();
    expect(share(B.accepted, B.offered)).toBeNull();
    expect(averageMinutes(B.recallToArrivalSeconds, B.arrivedAfterRecall)).toBeNull();
    expect(averageScore(B.surveyScoreSum, B.surveyResponses)).toBeNull();
  });

  it("counts only the two demo visits when the Demo switch is on", () => {
    const demo = dashboardNumbers(visits, [], "2026-11-18", true);
    expect(demo.A.arrivedAfterRecall).toBe(1);
    expect(demo.A.recallToArrivalSeconds).toBe(7200);
    expect(demo.B.waitingNow).toBe(1);
    expect(demo.B.triaged).toBe(1);
  });
});
