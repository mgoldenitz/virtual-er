import { describe, expect, it } from "vitest";
import { pastDays } from "./pastDays";

describe("pastDays", () => {
  it("gives the 7 dates before the day, oldest first, without the day itself", () => {
    expect(pastDays("2026-11-21")).toEqual([
      "2026-11-14", "2026-11-15", "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20",
    ]);
  });

  it("goes back across a month end", () => {
    expect(pastDays("2026-12-03")).toEqual([
      "2026-11-26", "2026-11-27", "2026-11-28", "2026-11-29", "2026-11-30", "2026-12-01", "2026-12-02",
    ]);
  });

  it("goes back across a year end", () => {
    expect(pastDays("2027-01-02")[0]).toBe("2026-12-26");
  });

  it("does not skip or repeat a date at the 2026-11-01 clock change", () => {
    expect(pastDays("2026-11-04")).toEqual([
      "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02", "2026-11-03",
    ]);
  });

  it("does not skip or repeat a date at the 2026-03-08 clock change", () => {
    expect(pastDays("2026-03-10")).toEqual([
      "2026-03-03", "2026-03-04", "2026-03-05", "2026-03-06", "2026-03-07", "2026-03-08", "2026-03-09",
    ]);
  });
});
