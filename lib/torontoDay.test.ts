import { describe, expect, it } from "vitest";
import { torontoDay } from "./torontoDay";

describe("torontoDay", () => {
  it("uses winter time (UTC minus 5) in November", () => {
    expect(torontoDay("2026-11-19T04:30:00.000Z")).toBe("2026-11-18");
    expect(torontoDay("2026-11-19T05:30:00.000Z")).toBe("2026-11-19");
  });

  it("uses summer time (UTC minus 4) in July", () => {
    expect(torontoDay("2026-07-15T03:30:00.000Z")).toBe("2026-07-14");
    expect(torontoDay("2026-07-15T04:30:00.000Z")).toBe("2026-07-15");
  });

  it("handles the fall-back day (2026-11-01) at 00:30 summer time", () => {
    expect(torontoDay("2026-11-01T04:30:00.000Z")).toBe("2026-11-01");
  });
});
