import { describe, expect, it } from "vitest";
import type { SiteNumbers } from "./dashboardNumbers";
import { summaryInput } from "./summaryInput";
import { SUMMARY_RULES, summarySystemPrompt, summaryUserMessage } from "./summaryPrompt";

const zero: SiteNumbers = {
  waitingNow: 0, recalledNow: 0, reassessmentNow: 0, triaged: 0, offered: 0, declined: 0, accepted: 0,
  arrivedAfterRecall: 0, recallToArrivalSeconds: 0, noShows: 0, unableToReach: 0, left: 0,
  startedFromHome: 0, homeReachedTriage: 0, surveyResponses: 0, surveyScoreSum: 0, survey9or10: 0,
};

describe("summary prompt", () => {
  it("forbids clinical advice (SPEC rule 2)", () => {
    expect(summarySystemPrompt()).toMatch(/never give medical or clinical advice/i);
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
