// Checks the wait, band and step numbers against 18 synthetic visits written by Gemini 3.6 Flash, High, on 2026-11-21,
// with every expected number checked by hand by Claude (handoffs/archive/2026-11-21-gemini-flash-wait-funnel-synthetic-visits.md).
// The visits test the 3 band edges, Toronto midnight, offers from yesterday, a call with no offer and a demo visit.

import { describe, expect, it } from "vitest";
import { dashboardNumbers, type DashboardVisit } from "./dashboardNumbers";
import { averageMinutes } from "./dashboardShare";

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
  /* 0 */ v("A", "desk", 4, "arrived", null, ["2026-11-21T04:30:00Z", "2026-11-21T04:40:00Z", "2026-11-21T04:45:00Z", "2026-11-21T05:14:29Z", "2026-11-21T00:24:49-05:00", "2026-11-21T00:40:00-05:00"], 8),
  /* 1 */ v("A", "home", 5, "removed", "no_show", ["2026-11-20T22:00:00-05:00", "2026-11-20T23:10:00-05:00", "2026-11-20T23:35:00-05:00", "2026-11-21T00:04:30-05:00", null, "2026-11-21T00:45:00-05:00"], 0),
  /* 2 */ v("A", "desk", 4, "unable_to_reach", null, ["2026-11-20T22:50:00-05:00", "2026-11-20T23:00:00-05:00", "2026-11-20T23:05:00-05:00", "2026-11-21T00:04:29-05:00", null, "2026-11-21T00:40:00-05:00"], null),
  /* 3 */ v("A", "desk", 5, "on_the_way", null, ["2026-11-20T22:40:00-05:00", "2026-11-20T22:55:00-05:00", "2026-11-20T23:10:00-05:00", "2026-11-21T00:09:30-05:00", null, null], null),
  /* 4 */ v("A", "home", 4, "arrived", null, ["2026-11-21T20:00:00-05:00", "2026-11-21T21:15:00-05:00", "2026-11-21T21:20:00-05:00", "2026-11-22T04:19:29Z", "2026-11-22T04:34:49Z", "2026-11-22T04:50:00Z"], 7),
  /* 5 */ v("A", "desk", 5, "called", null, ["2026-11-21T10:00:00-05:00", "2026-11-21T10:15:00-05:00", "2026-11-21T10:20:00-05:00", "2026-11-21T12:19:30-05:00", null, null], null),
  /* 6 */ v("A", "home", 4, "declined", null, ["2026-11-20T23:50:00-05:00", "2026-11-21T00:20:00-05:00", "2026-11-21T00:25:00-05:00", null, null, "2026-11-21T00:26:00-05:00"], 5),
  /* 7 */ v("A", "home", null, "pre_arrival", null, ["2026-11-21T14:00:00-05:00", null, null, null, null, null], null),
  /* 8 */ v("A", "home", null, "not_eligible", null, ["2026-11-21T15:00:00-05:00", "2026-11-21T15:30:00-05:00", null, null, null, "2026-11-21T15:30:00-05:00"], null),
  /* 9 */ v("A", "home", 4, "waiting", null, ["2026-11-21T23:50:00-05:00", "2026-11-22T00:10:00-05:00", "2026-11-22T00:15:00-05:00", null, null, null], null),
  /* 10 */ v("A", "desk", 4, "arrived", null, ["2026-11-20T22:00:00-05:00", "2026-11-20T22:15:00-05:00", "2026-11-20T22:20:00-05:00", "2026-11-20T23:50:00-05:00", "2026-11-21T00:10:50-05:00", "2026-11-21T00:30:00-05:00"], null),
  /* 11 */ v("A", "desk", 5, "arrived", null, ["2026-11-21T16:00:00-05:00", "2026-11-21T16:10:00-05:00", "2026-11-21T16:15:00-05:00", null, "2026-11-21T16:45:00-05:00", "2026-11-21T17:00:00-05:00"], 10),
  /* 12 */ v("A", "home", 4, "arrived", null, ["2026-11-21T03:00:00Z", "2026-11-21T03:30:00Z", "2026-11-21T03:35:00Z", "2026-11-21T04:05:00Z", "2026-11-21T04:15:00Z", "2026-11-21T04:30:00Z"], 9),
  /* 13 */ v("B", "desk", 4, "called", null, ["2026-11-21T11:00:00-05:00", "2026-11-21T11:05:00-05:00", null, "2026-11-21T11:20:00-05:00", null, null], null),
  /* 14 */ v("B", "home", 5, "arrived", null, ["2026-11-21T22:30:00-05:00", "2026-11-21T23:30:00-05:00", "2026-11-22T04:40:00Z", "2026-11-22T05:10:00Z", "2026-11-22T05:25:00Z", "2026-11-22T05:50:00Z"], 9),
  /* 15 */ v("B", "desk", 4, "declined", null, ["2026-11-21T13:00:00-05:00", "2026-11-21T13:10:00-05:00", "2026-11-21T13:15:00-05:00", null, null, "2026-11-21T13:15:00-05:00"], null),
  /* 16 */ v("B", "home", 5, "removed", "left", ["2026-11-21T09:00:00-05:00", "2026-11-21T09:40:00-05:00", "2026-11-21T09:45:00-05:00", null, null, "2026-11-21T10:30:00-05:00"], 6),
  /* 17 */ v("B", "home", 4, "arrived", null, ["2026-11-21T08:00:00-05:00", "2026-11-21T08:10:00-05:00", "2026-11-21T08:15:00-05:00", "2026-11-21T08:25:00-05:00", "2026-11-21T08:35:00-05:00", "2026-11-21T09:00:00-05:00"], 10, true),
];

const numbers = dashboardNumbers(visits, [], "2026-11-21", false);

describe("wait, band and step numbers: Gemini's synthetic visits of 2026-11-21", () => {
  it("gives the hand-checked counts for site A (recalled 6 is larger than offered 4)", () => {
    expect(numbers.A).toMatchObject({
      // Home: 4, 7, 8 and 9 started today; 7 has no triage time.
      startedFromHome: 4, homeReachedTriage: 3,
      // 4, 5, 6 and 11; 8 has no CTAS level, 9 was triaged after midnight.
      triaged: 4, offered: 4, declined: 1, accepted: 3,
      // 0 to 5, called today after an offer. Waits: 1769, 1770, 3569, 3570, 7169 and 7170 s.
      recalled: 6, offerToCallSeconds: 25017,
      waitUnder30: 1, wait30to59: 2, wait60to119: 2, wait120plus: 1,
      // 0 (620 s), 4 (920 s) and 10 (1250 s, called yesterday, arrived today).
      arrivedAfterRecall: 3, recallToArrivalSeconds: 2790,
      // 0 (8), 1 (0), 4 (7), 6 (5) and 11 (10). A score of 0 still counts.
      surveyResponses: 5, surveyScoreSum: 30,
    });
  });

  it("gives the hand-checked counts for site B (no recall today)", () => {
    expect(numbers.B).toMatchObject({
      startedFromHome: 2, homeReachedTriage: 2,
      triaged: 4, offered: 3, declined: 1, accepted: 2,
      // 13 was called with no offer; 14 was called after midnight; 17 is demo.
      recalled: 0, offerToCallSeconds: 0,
      waitUnder30: 0, wait30to59: 0, wait60to119: 0, wait120plus: 0,
      arrivedAfterRecall: 0, recallToArrivalSeconds: 0,
      surveyResponses: 1, surveyScoreSum: 6,
    });
  });

  it("gives the shown averages from the sums, not from rounded minutes for each visit", () => {
    const { A, B } = numbers;
    // 25017 / 6 / 60 = 69.49, so 69. The rounded minutes for each visit would give 69.5, so 70.
    expect(averageMinutes(A.offerToCallSeconds, A.recalled)).toBe(69);
    // 2790 / 3 / 60 = 15.5, rounded up to 16.
    expect(averageMinutes(A.recallToArrivalSeconds, A.arrivedAfterRecall)).toBe(16);
    expect(averageMinutes(B.offerToCallSeconds, B.recalled)).toBeNull();
    expect(averageMinutes(B.recallToArrivalSeconds, B.arrivedAfterRecall)).toBeNull();
  });

  it("counts only the demo visit when the Demo switch is on", () => {
    const demo = dashboardNumbers(visits, [], "2026-11-21", true);
    expect(demo.A.recalled).toBe(0);
    // 17: offered 08:15, called 08:25 (600 s), arrived 08:35 (600 s).
    expect(demo.B).toMatchObject({ recalled: 1, offerToCallSeconds: 600, waitUnder30: 1, arrivedAfterRecall: 1, recallToArrivalSeconds: 600 });
  });
});
