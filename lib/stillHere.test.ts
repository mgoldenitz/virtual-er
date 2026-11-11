// Checks when the "I'm still here" prompt is due and when a tap counts as missed.

import { describe, expect, it } from "vitest";
import { stillHereState } from "./stillHere";

const triaged = "2026-11-10T12:00:00Z";
const at = (time: string) => new Date(`2026-11-10T${time}:00Z`);
const waiting = { status: "waiting" as const, triagedAt: triaged, lastStillHereAt: null };

describe("stillHereState", () => {
  it("is not due for the first 30 minutes after triage", () => {
    expect(stillHereState(waiting, at("12:29"))).toBe("not_due");
  });

  it("is due from 30 minutes, and missed from 40 minutes without a tap", () => {
    expect(stillHereState(waiting, at("12:30"))).toBe("due");
    expect(stillHereState(waiting, at("12:39"))).toBe("due");
    expect(stillHereState(waiting, at("12:40"))).toBe("missed");
  });

  it("starts the clock again at each tap", () => {
    const tapped = { ...waiting, lastStillHereAt: "2026-11-10T12:35:00Z" };
    expect(stillHereState(tapped, at("12:40"))).toBe("not_due");
    expect(stillHereState(tapped, at("13:05"))).toBe("due");
    expect(stillHereState(tapped, at("13:15"))).toBe("missed");
  });

  it("ignores a tap older than triage (a reopened visit starts fresh)", () => {
    const old = { ...waiting, lastStillHereAt: "2026-11-10T11:00:00Z" };
    expect(stillHereState(old, at("12:10"))).toBe("not_due");
  });

  it("is never due unless waiting off-site and triaged", () => {
    expect(stillHereState({ ...waiting, status: "called" }, at("14:00"))).toBe("not_due");
    expect(stillHereState({ ...waiting, status: "declined" }, at("14:00"))).toBe("not_due");
    expect(stillHereState({ ...waiting, triagedAt: null }, at("14:00"))).toBe("not_due");
  });
});
