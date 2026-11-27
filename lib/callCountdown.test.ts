import { describe, expect, it } from "vitest";
import { minutesLeftToTap } from "./callCountdown";

const called = "2026-11-27T10:00:00Z";
const at = (min: number) => new Date(new Date(called).getTime() + min * 60_000);

describe("minutesLeftToTap", () => {
  it("counts down whole minutes from 20", () => {
    expect(minutesLeftToTap(called, at(0))).toBe(20);
    expect(minutesLeftToTap(called, at(1.5))).toBe(19);
    expect(minutesLeftToTap(called, at(2))).toBe(18);
  });

  it("stops at 0", () => {
    expect(minutesLeftToTap(called, at(20))).toBe(0);
    expect(minutesLeftToTap(called, at(45))).toBe(0);
  });

  it("is null with no call time", () => {
    expect(minutesLeftToTap(null, at(0))).toBeNull();
  });
});
