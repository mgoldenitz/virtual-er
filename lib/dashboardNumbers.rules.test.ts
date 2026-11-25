import { describe, expect, it } from "vitest";
import { dashboardNumbers } from "./dashboardNumbers";
import { siteA, statsRow, thisDay, today, visit, yesterday } from "./dashboardNumbers.fixtures";

describe("dashboardNumbers: demo and site rules", () => {
  it("counts demo visits and demo stats only when isDemo is true", () => {
    const visits = [visit({ is_demo: true, status: "waiting" }), visit({ status: "waiting" })];
    const stats = [statsRow({ is_demo: true, offered: 4 })];

    const real = dashboardNumbers(visits, stats, today, false).A;
    expect(real.waitingNow).toBe(1);
    expect(real.offered).toBe(0);

    const demo = dashboardNumbers(visits, stats, today, true).A;
    expect(demo.waitingNow).toBe(1);
    expect(demo.offered).toBe(4);
  });

  it("keeps site A and site B apart", () => {
    const numbers = dashboardNumbers(
      [visit({ site: "B", status: "waiting" }), visit({ site: "A", status: "called" })],
      [statsRow({ site: "B", offered: 2 })],
      today,
      false,
    );
    expect(numbers.A.waitingNow).toBe(0);
    expect(numbers.A.recalledNow).toBe(1);
    expect(numbers.A.offered).toBe(0);
    expect(numbers.B.waitingNow).toBe(1);
    expect(numbers.B.offered).toBe(2);
  });

  it("uses the Toronto date, so 04:30 UTC on the 19th is still the 18th", () => {
    const n = siteA([visit({ triaged_at: "2026-11-19T04:30:00.000Z", offered_at: "2026-11-19T04:30:00.000Z" })]);
    expect(n.offered).toBe(1);
  });

  it("does not count an event from the day before", () => {
    const n = siteA([visit({ offered_at: "2026-11-17T18:00:00.000Z", ctas_level: 5, triaged_at: yesterday })]);
    expect(n.offered).toBe(0);
    expect(n.triaged).toBe(0);
  });

  it("ignores a stats row for another day", () => {
    const n = siteA([], [statsRow({ day: "2026-11-17", offered: 9, survey_responses: 9 })]);
    expect(n.offered).toBe(0);
    expect(n.surveyResponses).toBe(0);
  });

  it("adds stats to live visits", () => {
    const n = siteA(
      [visit({ triaged_at: thisDay, offered_at: thisDay }), visit({ triaged_at: thisDay, offered_at: thisDay })],
      [statsRow({ offered: 3 })],
    );
    expect(n.offered).toBe(5);
  });
});

describe("dashboardNumbers: empty day", () => {
  it("gives 0 for every number when there are no visits and no stats", () => {
    const n = siteA([], []);
    expect(n).toEqual({
      waitingNow: 0,
      recalledNow: 0,
      reassessmentNow: 0,
      triaged: 0,
      offered: 0,
      declined: 0,
      accepted: 0,
      arrivedAfterRecall: 0,
      recallToArrivalSeconds: 0,
      noShows: 0,
      unableToReach: 0,
      left: 0,
      startedFromHome: 0,
      homeReachedTriage: 0,
      surveyResponses: 0,
      surveyScoreSum: 0,
      survey9or10: 0,
      recalled: 0,
      offerToCallSeconds: 0,
      waitUnder30: 0,
      wait30to59: 0,
      wait60to119: 0,
      wait120plus: 0,
    });
  });
});
