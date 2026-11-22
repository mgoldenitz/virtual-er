import { describe, expect, it } from "vitest";
import type { SiteNumbers } from "./dashboardNumbers";
import { CHAT_RULES, chatMessages, chatSystemPrompt } from "./chatPrompt";
import { summaryInput } from "./summaryInput";
import { SUMMARY_NUMBER_RULES } from "./summaryPrompt";

const zero: SiteNumbers = {
  waitingNow: 0, recalledNow: 0, reassessmentNow: 0, triaged: 0, offered: 0, declined: 0, accepted: 0,
  arrivedAfterRecall: 0, recallToArrivalSeconds: 0, noShows: 0, unableToReach: 0, left: 0,
  startedFromHome: 0, homeReachedTriage: 0, surveyResponses: 0, surveyScoreSum: 0, survey9or10: 0,
  recalled: 0, offerToCallSeconds: 0, waitUnder30: 0, wait30to59: 0, wait60to119: 0, wait120plus: 0,
};

const input = (isDemo: boolean) => summaryInput({ A: { ...zero, waitingNow: 4 }, B: zero }, isDemo);

describe("chat prompt", () => {
  it("has the rules in the brief's order", () => {
    const prompt = chatSystemPrompt(input(false));
    let last = -1;
    for (const rule of CHAT_RULES.slice(0, 4)) {
      const at = prompt.indexOf(rule);
      expect(at).toBeGreaterThan(last);
      last = at;
    }
  });

  it("refuses patient, clinical and triage questions with the exact sentence (SPEC rule 2)", () => {
    expect(chatSystemPrompt(input(false))).toContain("\"I can only answer questions about today's totals.\"");
  });

  it("includes every number rule from lib/summaryPrompt.ts", () => {
    const prompt = chatSystemPrompt(input(false));
    for (const rule of SUMMARY_NUMBER_RULES) expect(prompt).toContain(rule);
  });

  it("includes the totals as JSON", () => {
    const prompt = chatSystemPrompt(input(false));
    expect(prompt).toContain(JSON.stringify(input(false).sites, null, 2));
    expect(prompt).toContain("\"waitingNow\": 4");
  });

  it("says the numbers are demo numbers when isDemo is true", () => {
    expect(chatSystemPrompt(input(true))).toContain("demo (made-up) visits");
    expect(chatSystemPrompt(input(false))).not.toContain("demo (made-up) visits");
  });
});

describe("chat messages", () => {
  it("puts the history in order, then the new question as a user turn", () => {
    const history = [{ role: "user" as const, text: "How many waiting?" }, { role: "assistant" as const, text: "Four." }];
    expect(chatMessages(history, "And recalled?")).toEqual([
      { role: "user", content: "How many waiting?" },
      { role: "assistant", content: "Four." },
      { role: "user", content: "And recalled?" },
    ]);
  });

  it("gives just the question when there is no history", () => {
    expect(chatMessages([], "How many waiting?")).toEqual([{ role: "user", content: "How many waiting?" }]);
  });
});
