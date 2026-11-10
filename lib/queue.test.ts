import { describe, expect, it } from "vitest";
import { activeLine, averageCallGap, minutesBetween, placeInLine, waitRange } from "./queue";
import type { Visit } from "./visit";
import { checkInAtDesk } from "./visitActions";

const at = (min: number) => new Date(Date.UTC(2026, 10, 9, 20, min));

function visit(id: string, triagedMin: number, extra: Partial<Visit> = {}): Visit {
  const v = checkInAtDesk(
    { id, code: id, access_token: id, site: "A", ctas_level: 4, language: "en" },
    "waiting",
    at(triagedMin),
  );
  // created_at deliberately in the reverse order, to prove it is not used for the line.
  return { ...v, created_at: at(100 - triagedMin).toISOString(), ...extra };
}

describe("line order", () => {
  it("orders by triage time, not creation time, and skips closed visits and other sites", () => {
    const visits = [
      visit("late", 30),
      visit("early", 10),
      visit("closed", 5, { status: "arrived" }),
      visit("siteB", 1, { site: "B" }),
      visit("called", 20, { status: "called" }),
    ];
    expect(activeLine(visits, "A").map((v) => v.id)).toEqual(["early", "called", "late"]);
  });

  it("counts only waiting patients ahead", () => {
    const visits = [visit("a", 10), visit("b", 20, { status: "called" }), visit("c", 30)];
    expect(placeInLine(visits, visits[0])).toBe(1);
    expect(placeInLine(visits, visits[2])).toBe(2);
    expect(placeInLine(visits, visits[1])).toBeNull();
  });
});

describe("wait range", () => {
  it("uses 15 minutes per patient until there is call-back history", () => {
    expect(averageCallGap([visit("a", 1)], "A")).toBe(15);
    expect(waitRange(3, 15)).toEqual({ low: 35, high: 60 });
  });

  it("averages the gaps between the last call-backs", () => {
    const visits = [0, 10, 30].map((m, i) =>
      visit(`v${i}`, m, { status: "arrived", called_at: at(m).toISOString() }),
    );
    expect(averageCallGap(visits, "A")).toBe(15); // gaps 10 and 20
  });

  it("never shows a range below 5 minutes or with equal ends", () => {
    expect(waitRange(1, 1)).toEqual({ low: 5, high: 10 });
  });

  it("counts whole minutes", () => {
    expect(minutesBetween(at(0).toISOString(), at(42))).toBe(42);
    expect(minutesBetween(at(10).toISOString(), at(0))).toBe(0);
  });
});
