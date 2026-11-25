import { describe, expect, it } from "vitest";
import { siteA, statsRow, thisDay, visit, yesterday } from "./dashboardNumbers.fixtures";

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

  // A decline counts only with an offer time (Gemini review of the Phase 5 fixes, point 4b, 2026-11-21).
  it("does not count a declined visit with no offer time", () => {
    const n = siteA([visit({ status: "declined", triaged_at: thisDay, offered_at: null })]);
    expect(n.offered).toBe(0);
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
