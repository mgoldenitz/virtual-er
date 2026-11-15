import { describe, expect, it } from "vitest";
import { formatMinutes } from "./duration";

describe("formatMinutes", () => {
  it("keeps minutes under an hour as they are now", () => {
    expect(formatMinutes(0)).toBe("0 min");
    expect(formatMinutes(1)).toBe("1 min");
    expect(formatMinutes(59)).toBe("59 min");
  });

  it("shows hours and minutes from 60", () => {
    expect(formatMinutes(61)).toBe("1h 1min");
    expect(formatMinutes(95)).toBe("1h 35min");
    expect(formatMinutes(166)).toBe("2h 46min");
  });

  it("leaves out 0min for whole hours", () => {
    expect(formatMinutes(60)).toBe("1h");
    expect(formatMinutes(120)).toBe("2h");
  });

  it("gives 0 min for a negative or broken number", () => {
    expect(formatMinutes(-5)).toBe("0 min");
    expect(formatMinutes(Number.NaN)).toBe("0 min");
  });

  it("drops part minutes", () => {
    expect(formatMinutes(95.9)).toBe("1h 35min");
  });
});
