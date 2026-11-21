import { describe, expect, it } from "vitest";
import type { SiteNumbers } from "./dashboardNumbers";
import { summaryInput } from "./summaryInput";
import { SUMMARY_RULES, summarySystemPrompt, summaryUserMessage } from "./summaryPrompt";

const zero: SiteNumbers = {
  waitingNow: 0, recalledNow: 0, reassessmentNow: 0, triaged: 0, offered: 0, declined: 0, accepted: 0,
  arrivedAfterRecall: 0, recallToArrivalSeconds: 0, noShows: 0, unableToReach: 0, left: 0,
  startedFromHome: 0, homeReachedTriage: 0, surveyResponses: 0, surveyScoreSum: 0, survey9or10: 0,
  recalled: 0, offerToCallSeconds: 0, waitUnder30: 0, wait30to59: 0, wait60to119: 0, wait120plus: 0,
};

describe("summary prompt", () => {
  it("forbids clinical advice (SPEC rule 2)", () => {
    expect(summarySystemPrompt()).toMatch(/never give medical or clinical advice/i);
  });

  // Gemini review 2026-11-21 and the owner's choices for 1 and 0 recalled visits.
  it("tells Claude how to read the wait total: minutes, rounded, one visit, and none at a site", () => {
    const waitRule = SUMMARY_RULES.find((r) => r.startsWith("offerToCallSeconds"));
    expect(waitRule).toBeDefined();
    expect(waitRule).toMatch(/sum/i);
    expect(waitRule).toMatch(/divide it by recalled, then by 60, and round to the nearest whole minute/i);
    expect(waitRule).toMatch(/if recalled is 1, .*one recalled visit, not as an average/i);
    expect(waitRule).toMatch(/if recalled is 0 at a site, give no wait numbers for that site/i);
  });

  it("tells Claude the 4 bands count recalled visits by rounded minutes", () => {
    const bandRule = SUMMARY_RULES.find((r) => r.includes("waitUnder30"));
    expect(bandRule).toBeDefined();
    for (const band of ["wait30to59", "wait60to119", "wait120plus"]) expect(bandRule).toContain(band);
    expect(bandRule).toMatch(/rounded to the nearest whole minute/i);
    expect(bandRule).toMatch(/under 30, 30 to 59, 60 to 119, and 120 or more/);
  });

  it("no longer says 'no wait data yet', which did not name a site", () => {
    expect(summarySystemPrompt()).not.toMatch(/no wait data yet/i);
  });

  it("tells Claude to turn recallToArrivalSeconds into rounded minutes too", () => {
    const rule = SUMMARY_RULES.find((r) => r.includes("recallToArrivalSeconds"));
    expect(rule).toMatch(/by arrivedAfterRecall, then by 60, and round to the nearest whole minute/);
  });

  it("has one rule per line", () => {
    expect(summarySystemPrompt().split("\n")).toHaveLength(SUMMARY_RULES.length);
  });

  it("says demo or real in the user message", () => {
    const sites = { A: zero, B: zero };
    expect(summaryUserMessage(summaryInput(sites, true))).toContain("demo (made-up) visits");
    expect(summaryUserMessage(summaryInput(sites, false))).toContain("real visits");
  });

  it("sends only the site totals, not the isDemo flag or anything else", () => {
    const message = summaryUserMessage(summaryInput({ A: { ...zero, waitingNow: 4 }, B: zero }, false));
    const json = JSON.parse(message.slice(message.indexOf("\n") + 1));
    expect(Object.keys(json)).toEqual(["A", "B"]);
    expect(json.A.waitingNow).toBe(4);
  });
});
