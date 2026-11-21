import { describe, expect, it } from "vitest";
import { dashboardNumbers, type DailyStatsRow, type DashboardVisit } from "./dashboardNumbers";

const today = "2026-11-18";
const thisDay = "2026-11-18T18:00:00.000Z";
const yesterday = "2026-11-17T18:00:00.000Z";

// A live visit with every time empty, so each test sets only what it needs.
function visit(overrides: Partial<DashboardVisit> = {}): DashboardVisit {
  return {
    site: "A",
    source: "desk",
    ctas_level: 4,
    status: "waiting",
    removed_reason: null,
    created_at: thisDay,
    triaged_at: null,
    offered_at: null,
    called_at: null,
    arrived_at: null,
    closed_at: null,
    survey_score: null,
    is_demo: false,
    ...overrides,
  };
}

// A daily_stats row for today, site A, real visits, with every number at 0.
function statsRow(overrides: Partial<DailyStatsRow> = {}): DailyStatsRow {
  return {
    day: today,
    site: "A",
    is_demo: false,
    triaged_ctas_4_5: 0,
    not_eligible: 0,
    offered: 0,
    declined: 0,
    called_and_arrived: 0,
    call_to_arrival_seconds: 0,
    arrived: 0,
    no_shows: 0,
    removed_left: 0,
    unable_to_reach: 0,
    open_at_deletion: 0,
    started_from_home: 0,
    home_reached_triage: 0,
    survey_responses: 0,
    survey_score_sum: 0,
    survey_9_or_10: 0,
    ...overrides,
  };
}

// Site A numbers for real (not demo) data.
function siteA(visits: DashboardVisit[], stats: DailyStatsRow[] = []) {
  return dashboardNumbers(visits, stats, today, false).A;
}

describe("dashboardNumbers: live now", () => {
  it("counts waiting, recalled and needs-reassessment visits", () => {
    const n = siteA([
      visit({ status: "waiting" }),
      visit({ status: "waiting" }),
      visit({ status: "called" }),
      visit({ status: "on_the_way" }),
      visit({ status: "needs_reassessment" }),
      visit({ status: "arrived" }),
    ]);
    expect(n.waitingNow).toBe(2);
    expect(n.recalledNow).toBe(2);
    expect(n.reassessmentNow).toBe(1);
  });
});

describe("dashboardNumbers: triage and offers", () => {
  it("counts CTAS 4 or 5 visits triaged today, and adds stats", () => {
    const n = siteA(
      [visit({ ctas_level: 5, triaged_at: thisDay }), visit({ ctas_level: 4, triaged_at: thisDay })],
      [statsRow({ triaged_ctas_4_5: 3 })],
    );
    expect(n.triaged).toBe(5);
  });

  it("counts offers and declines made today, and works out accepted", () => {
    const n = siteA(
      [
        visit({ triaged_at: thisDay, offered_at: thisDay }),
        visit({ triaged_at: thisDay, offered_at: thisDay, status: "declined" }),
        visit({ triaged_at: thisDay, offered_at: thisDay, status: "declined" }),
      ],
      [statsRow({ offered: 3, declined: 1 })],
    );
    expect(n.offered).toBe(6);
    expect(n.declined).toBe(3);
    expect(n.accepted).toBe(3);
  });

  it("does not count a decline unless the offer was made today", () => {
    const n = siteA([visit({ status: "declined", triaged_at: yesterday, offered_at: yesterday })]);
    expect(n.declined).toBe(0);
  });

  it("counts a switched visit as offered on its triage day, not the switch day", () => {
    const n = siteA([
      visit({ triaged_at: yesterday, offered_at: thisDay, status: "waiting", ctas_level: 4 }),
      visit({ triaged_at: yesterday, offered_at: thisDay, status: "declined", ctas_level: 4 }),
    ]);
    expect(n.offered).toBe(0);
    expect(n.declined).toBe(0);
  });
});

describe("dashboardNumbers: call-back to arrival", () => {
  it("counts called-then-arrived visits and adds up the seconds", () => {
    const n = siteA([
      visit({
        status: "arrived",
        called_at: "2026-11-18T18:00:00.000Z",
        arrived_at: "2026-11-18T18:05:30.000Z",
      }),
      visit({
        status: "arrived",
        called_at: "2026-11-18T18:10:00.000Z",
        arrived_at: "2026-11-18T18:12:00.600Z",
      }),
    ]);
    expect(n.arrivedAfterRecall).toBe(2);
    // 330 seconds, plus 120.6 rounded to 121.
    expect(n.recallToArrivalSeconds).toBe(451);
  });

  it("does not count an arrival with no call", () => {
    const n = siteA([visit({ status: "arrived", called_at: null, arrived_at: thisDay })]);
    expect(n.arrivedAfterRecall).toBe(0);
    expect(n.recallToArrivalSeconds).toBe(0);
  });

  it("adds stats to the live seconds", () => {
    const n = siteA(
      [
        visit({
          status: "arrived",
          called_at: "2026-11-18T18:00:00.000Z",
          arrived_at: "2026-11-18T18:01:00.000Z",
        }),
      ],
      [statsRow({ called_and_arrived: 2, call_to_arrival_seconds: 600 })],
    );
    expect(n.arrivedAfterRecall).toBe(3);
    expect(n.recallToArrivalSeconds).toBe(660);
  });
});

describe("dashboardNumbers: closed visits", () => {
  it("counts no-shows, left and unable to reach on the closed date", () => {
    const n = siteA(
      [
        visit({ status: "removed", removed_reason: "no_show", closed_at: thisDay }),
        visit({ status: "removed", removed_reason: "left", closed_at: thisDay }),
        visit({ status: "unable_to_reach", closed_at: thisDay }),
      ],
      [statsRow({ no_shows: 1, removed_left: 2, unable_to_reach: 1 })],
    );
    expect(n.noShows).toBe(2);
    expect(n.left).toBe(3);
    expect(n.unableToReach).toBe(2);
  });

  it("does not count a closed visit from yesterday", () => {
    const n = siteA([
      visit({ status: "removed", removed_reason: "no_show", closed_at: yesterday }),
      visit({ status: "unable_to_reach", closed_at: yesterday }),
    ]);
    expect(n.noShows).toBe(0);
    expect(n.unableToReach).toBe(0);
  });
});

describe("dashboardNumbers: visits from home", () => {
  it("counts home visits created today, and those that reached triage", () => {
    const n = siteA(
      [
        visit({ source: "home", created_at: thisDay, triaged_at: thisDay }),
        visit({ source: "home", created_at: thisDay }),
        visit({ source: "desk", created_at: thisDay, triaged_at: thisDay }),
        // Started yesterday, triaged today: not counted in either number.
        visit({ source: "home", created_at: yesterday, triaged_at: thisDay }),
      ],
      [statsRow({ started_from_home: 4, home_reached_triage: 2 })],
    );
    expect(n.startedFromHome).toBe(6);
    expect(n.homeReachedTriage).toBe(3);
  });
});

describe("dashboardNumbers: survey", () => {
  it("counts survey answers closed today, their total and the 9 or 10 scores", () => {
    const n = siteA(
      [
        visit({ status: "arrived", closed_at: thisDay, survey_score: 10 }),
        visit({ status: "arrived", closed_at: thisDay, survey_score: 7 }),
        // Closed yesterday: not counted.
        visit({ status: "arrived", closed_at: yesterday, survey_score: 9 }),
        // No score: not a response.
        visit({ status: "arrived", closed_at: thisDay, survey_score: null }),
      ],
      [statsRow({ survey_responses: 1, survey_score_sum: 8, survey_9_or_10: 1 })],
    );
    expect(n.surveyResponses).toBe(3);
    // Live 10 + 7 = 17, plus stats 8.
    expect(n.surveyScoreSum).toBe(25);
    expect(n.survey9or10).toBe(2);
  });
});

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
    });
  });
});
