// Checks when the patient screen beeps and vibrates: only while called, with sound on, and the page on screen.

import { describe, expect, it } from "vitest";
import type { VisitStatus } from "./visit";
import { ALERT_REPEAT_MS, shouldAlert, soundNote } from "./calledAlert";

describe("shouldAlert", () => {
  it("alerts while called, with sound on and the page on screen", () => {
    expect(shouldAlert("called", true, true)).toBe(true);
  });

  it("does not alert before the patient taps Turn on sound", () => {
    expect(shouldAlert("called", false, true)).toBe(false);
  });

  it("does not alert while the page is hidden", () => {
    expect(shouldAlert("called", true, false)).toBe(false);
  });

  it("does not alert for any other status, including on the way", () => {
    const others: VisitStatus[] = ["waiting", "on_the_way", "arrived", "pre_arrival", "removed", "unable_to_reach"];
    for (const status of others) {
      expect(shouldAlert(status, true, true)).toBe(false);
    }
  });
});

describe("ALERT_REPEAT_MS", () => {
  it("repeats every 30 seconds", () => {
    expect(ALERT_REPEAT_MS).toBe(30_000);
  });
});

describe("soundNote", () => {
  it("shows the failed line when the phone would not start the sound", () => {
    expect(soundNote("waiting", "failed")).toBe("failed");
  });

  it("keeps the failed line while called, because it already says to watch the screen", () => {
    expect(soundNote("called", "failed")).toBe("failed");
  });

  it("asks to turn on sound only while called with the sound off", () => {
    expect(soundNote("called", "off")).toBe("offWhileCalled");
    expect(soundNote("waiting", "off")).toBeNull();
    expect(soundNote("on_the_way", "off")).toBeNull();
  });

  it("shows no line while the sound is on", () => {
    expect(soundNote("called", "on")).toBeNull();
    expect(soundNote("waiting", "on")).toBeNull();
  });
});
