import { describe, expect, it } from "vitest";
import { trendHasScores } from "./trendHasScores";
import { trendNumbers } from "./trendNumbers";

const empty = trendNumbers([], [], "2026-11-25", false);

describe("trendHasScores", () => {
  it("is false when the site has no survey responses in the 7 days", () => {
    expect(trendHasScores(empty, "A")).toBe(false);
  });

  it("is true when one day has a response, for that site only", () => {
    const trend = empty.map((d, i) =>
      i === 3 ? { ...d, numbers: { ...d.numbers, B: { ...d.numbers.B, surveyResponses: 1 } } } : d,
    );
    expect(trendHasScores(trend, "B")).toBe(true);
    expect(trendHasScores(trend, "A")).toBe(false);
  });
});
