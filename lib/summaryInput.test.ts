import { describe, expect, it } from "vitest";
import type { SiteNumbers } from "./dashboardNumbers";
import { parseSummaryBody, summaryInput } from "./summaryInput";

const KEYS = [
  "waitingNow",
  "recalledNow",
  "reassessmentNow",
  "triaged",
  "offered",
  "declined",
  "accepted",
  "arrivedAfterRecall",
  "recallToArrivalSeconds",
  "noShows",
  "unableToReach",
  "left",
  "startedFromHome",
  "homeReachedTriage",
  "surveyResponses",
  "surveyScoreSum",
  "survey9or10",
  "recalled",
  "offerToCallSeconds",
  "waitUnder30",
  "wait30to59",
  "wait60to119",
  "wait120plus",
];

function numbers(base: number): SiteNumbers {
  const out = {} as Record<string, number>;
  KEYS.forEach((k, i) => {
    out[k] = base + i;
  });
  return out as unknown as SiteNumbers;
}

describe("summary input", () => {
  it("gives each site exactly the 23 SiteNumbers keys, all numbers", () => {
    const out = summaryInput({ A: numbers(1), B: numbers(100) }, true);
    expect(Object.keys(out.sites).sort()).toEqual(["A", "B"]);
    for (const site of ["A", "B"] as const) {
      expect(Object.keys(out.sites[site]).sort()).toEqual([...KEYS].sort());
      for (const value of Object.values(out.sites[site])) {
        expect(typeof value).toBe("number");
      }
    }
    expect(out.sites.B.waitingNow).toBe(100);
    expect(out.sites.A.survey9or10).toBe(1 + 16);
    // The wait numbers (owner OK, 2026-11-21) keep their own values.
    expect(out.sites.A.recalled).toBe(1 + 17);
    expect(out.sites.A.offerToCallSeconds).toBe(1 + 18);
    expect(out.sites.B.wait120plus).toBe(100 + 22);
  });

  it("leaves out an extra field that is not a SiteNumbers field, such as a visit code", () => {
    const withCode = { ...numbers(1), code: "ABC234" } as unknown as SiteNumbers;
    const out = summaryInput({ A: withCode, B: numbers(100) }, false);
    expect(Object.keys(out.sites.A)).not.toContain("code");
    expect(JSON.stringify(out)).not.toContain("ABC234");
  });

  it("carries isDemo over", () => {
    expect(summaryInput({ A: numbers(1), B: numbers(1) }, true).isDemo).toBe(true);
    expect(summaryInput({ A: numbers(1), B: numbers(1) }, false).isDemo).toBe(false);
  });
});

describe("summary body", () => {
  it("accepts a boolean isDemo", () => {
    expect(parseSummaryBody({ isDemo: true })).toEqual({ isDemo: true });
    expect(parseSummaryBody({ isDemo: false })).toEqual({ isDemo: false });
  });

  it("refuses a non-boolean isDemo, a missing isDemo, and a body that is not a plain object", () => {
    expect(parseSummaryBody({ isDemo: "yes" })).toBeNull();
    expect(parseSummaryBody({})).toBeNull();
    expect(parseSummaryBody(null)).toBeNull();
    expect(parseSummaryBody([])).toBeNull();
    expect(parseSummaryBody("x")).toBeNull();
  });

  it("ignores extra fields and returns only isDemo", () => {
    expect(parseSummaryBody({ isDemo: true, other: 1 })).toEqual({ isDemo: true });
  });
});
