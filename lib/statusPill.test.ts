import { describe, expect, it } from "vitest";
import type { VisitStatus } from "./visit";
import { PILL_CLASS, sitePausePill, visitPill, type PillTone } from "./statusPill";

describe("visitPill", () => {
  // One case per status in VisitStatus (all ten).
  const cases: [VisitStatus, { label: string; tone: PillTone } | null][] = [
    ["pre_arrival", null],
    ["waiting", { label: "Waiting", tone: "wait" }],
    ["called", { label: "Called", tone: "called" }],
    ["on_the_way", { label: "On the way", tone: "called" }],
    ["arrived", null],
    ["unable_to_reach", null],
    ["needs_reassessment", null],
    ["removed", null],
    ["declined", null],
    ["not_eligible", null],
  ];

  it.each(cases)("gives the right pill for %s", (status, expected) => {
    expect(visitPill(status)).toEqual(expected);
  });

  it("has a class entry for each tone", () => {
    const tones: PillTone[] = ["wait", "called", "stop"];
    for (const tone of tones) {
      expect(PILL_CLASS[tone]).toMatch(/\S/);
    }
  });
});

describe("sitePausePill", () => {
  it("shows Paused with the stop tone when paused", () => {
    expect(sitePausePill(true)).toEqual({ label: "Paused", tone: "stop" });
  });

  it("shows Open with the wait tone when not paused", () => {
    expect(sitePausePill(false)).toEqual({ label: "Open", tone: "wait" });
  });

  it("shows no pill when the pause state is not known", () => {
    expect(sitePausePill(null)).toBeNull();
  });
});
