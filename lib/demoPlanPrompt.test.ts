import { describe, expect, it } from "vitest";
import { PLAN_FIELDS } from "./demoPlan";
import { demoPlanSystemPrompt, demoPlanUserMessage } from "./demoPlanPrompt";

describe("demo day plan prompt", () => {
  it("names every plan field with its range, and the date", () => {
    const message = demoPlanUserMessage("2026-11-20");
    expect(message).toContain("2026-11-20");
    for (const field of PLAN_FIELDS) expect(message).toContain(`- ${field}:`);
    expect(message).toContain("Range 0.3 to 0.95");
  });

  it("says the visits are made up", () => {
    expect(demoPlanSystemPrompt()).toContain("made up");
  });

  it("asks for a theme for the day, so days differ", () => {
    expect(demoPlanSystemPrompt()).toContain("theme");
  });

  it("has no TODO left in the rules", () => {
    expect(demoPlanSystemPrompt()).not.toContain("TODO");
  });
});
