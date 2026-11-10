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

describe("ties in triage time", () => {
  it("gives two patients triaged at the same moment different places, matching the staff order", () => {
    const visits = [visit("b", 5), visit("a", 5)];
    const places = visits.map((v) => placeInLine(visits, v));
    expect(places.sort()).toEqual([1, 2]);
    const staffOrder = activeLine(visits, "A").map((v) => v.id);
    expect(staffOrder).toEqual(["a", "b"]);
    expect(placeInLine(visits, visits[1])).toBe(1); // "a" is first in both
  });
});

describe("line order with times as the database writes them", () => {
  const triagedAt = (id: string, triaged_at: string) => visit(id, 0, { triaged_at });

  it("orders by the moment, whatever the number of decimals", () => {
    const line = activeLine(
      [
        triagedAt("d", "2026-11-10T09:13:09.82226+00:00"),
        triagedAt("c", "2026-11-10T09:13:09.82+00:00"),
        triagedAt("b", "2026-11-10T09:13:09.5+00:00"),
        triagedAt("a", "2026-11-10T09:13:09+00:00"),
        triagedAt("e", "2026-11-10T09:13:09.822261+00:00"),
      ],
      "A",
    );
    expect(line.map((v) => v.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("orders a browser-style time and a database-style time by the moment", () => {
    const line = activeLine(
      [triagedAt("late", "2026-11-10T09:13:10.000Z"), triagedAt("early", "2026-11-10T09:13:09.9+00:00")],
      "A",
    );
    expect(line.map((v) => v.id)).toEqual(["early", "late"]);
  });
});
