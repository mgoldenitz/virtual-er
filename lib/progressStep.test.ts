import { describe, expect, it } from "vitest";
import { progressStep } from "@/lib/progressStep";
import type { VisitStatus } from "@/lib/visit";

describe("progressStep", () => {
  it("maps each line status to its step", () => {
    expect(progressStep("pre_arrival", false, false)).toBe(1);
    expect(progressStep("waiting", false, false)).toBe(2);
    expect(progressStep("called", false, false)).toBe(3);
    expect(progressStep("on_the_way", false, false)).toBe(3);
    expect(progressStep("arrived", false, false)).toBe(4);
  });

  it("shows no steps for a visit that left the line", () => {
    const gone: VisitStatus[] = ["declined", "not_eligible", "removed", "unable_to_reach", "needs_reassessment"];
    for (const status of gone) expect(progressStep(status, false, false)).toBeNull();
  });

  it("shows no steps for an ended or expired visit", () => {
    expect(progressStep("waiting", true, false)).toBeNull();
    expect(progressStep("arrived", false, true)).toBeNull();
  });
});
