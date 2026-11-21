import { describe, expect, it } from "vitest";
import type { SiteNumbers } from "./dashboardNumbers";
import { CSV_HEADER, dashboardCsv } from "./dashboardCsv";

const zero: SiteNumbers = {
  waitingNow: 0, recalledNow: 0, reassessmentNow: 0, triaged: 0, offered: 0, declined: 0, accepted: 0,
  arrivedAfterRecall: 0, recallToArrivalSeconds: 0, noShows: 0, unableToReach: 0, left: 0,
  startedFromHome: 0, homeReachedTriage: 0, surveyResponses: 0, surveyScoreSum: 0, survey9or10: 0,
  recalled: 0, offerToCallSeconds: 0, waitUnder30: 0, wait30to59: 0, wait60to119: 0, wait120plus: 0,
};

const busy: SiteNumbers = {
  ...zero,
  triaged: 10, offered: 8, accepted: 6,
  arrivedAfterRecall: 2, recallToArrivalSeconds: 1500,
  recalled: 3, offerToCallSeconds: 5400,
  surveyResponses: 4, surveyScoreSum: 27,
};

// The lines of the CSV text, without the empty string after the last line end.
function lines(text: string): string[] {
  return text.split("\r\n").slice(0, -1);
}

describe("dashboardCsv", () => {
  it("starts with the header line in a fixed column order", () => {
    expect(CSV_HEADER).toBe(
      "day,site,is_demo,triaged,offered,offered_percent,accepted,arrived_after_recall," +
        "recall_to_arrival_minutes,recalled,offer_to_recall_minutes,survey_responses,survey_average",
    );
    expect(lines(dashboardCsv([], false))).toEqual([CSV_HEADER]);
  });

  it("gives the counts with each share or average next to them, rounded as on the screen", () => {
    const text = dashboardCsv([{ day: "2026-11-22", site: "A", numbers: busy }], false);
    // 8 of 10 is 80%; 1500 s over 2 is 12.5 minutes, rounded to 13; 5400 s over 3 is 30; 27 over 4 is 6.75, to 6.8.
    expect(lines(text)[1]).toBe("2026-11-22,A,false,10,8,80,6,2,13,3,30,4,6.8");
  });

  it("gives an empty cell, not a dash, when a share or average has nothing to divide by", () => {
    const text = dashboardCsv([{ day: "2026-11-22", site: "B", numbers: zero }], true);
    expect(lines(text)[1]).toBe("2026-11-22,B,true,0,0,,0,0,,0,,0,");
  });

  it("leaves the wait cells empty for a day before the wait start date (2026-11-21)", () => {
    const text = dashboardCsv([{ day: "2026-11-20", site: "A", numbers: busy }], false);
    expect(lines(text)[1]).toBe("2026-11-20,A,false,10,8,80,6,2,13,,,4,6.8");
  });

  it("keeps the rows in the order given, one line each, with Windows line ends", () => {
    const text = dashboardCsv(
      [
        { day: "2026-11-21", site: "A", numbers: zero },
        { day: "2026-11-21", site: "B", numbers: zero },
      ],
      false,
    );
    expect(text.endsWith("\r\n")).toBe(true);
    expect(lines(text).map((line) => line.slice(0, 12))).toEqual([CSV_HEADER.slice(0, 12), "2026-11-21,A", "2026-11-21,B"]);
  });
});
