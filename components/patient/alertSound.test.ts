// Tests for the beep player with a fake browser sound player (no real sound plays).

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** A fake AudioContext. `resumeResult` decides what resume() does. */
class FakeContext {
  /** Every fake player made, so a test can close or pause them as the phone would. */
  static made: FakeContext[] = [];
  static resumeResult: "run" | "hang" | "reject-late" | "slow" = "run";
  state: "suspended" | "running" | "closed" = "suspended";
  currentTime = 0;
  destination = {};
  constructor() {
    FakeContext.made.push(this);
  }
  resume(): Promise<void> {
    if (FakeContext.resumeResult === "run") {
      if (this.state !== "closed") this.state = "running";
      return Promise.resolve();
    }
    if (FakeContext.resumeResult === "hang") return new Promise(() => {});
    if (FakeContext.resumeResult === "slow") {
      return new Promise((resolve) => setTimeout(() => ((this.state = "running"), resolve()), 500));
    }
    return new Promise((_, reject) => setTimeout(() => reject(new Error("late")), 2000));
  }
  createOscillator() {
    return { type: "", frequency: { value: 0 }, connect() {}, start, stop: vi.fn() };
  }
  createGain() {
    return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} };
  }
}

const vibrate = vi.fn();
/** Called when a beep really starts, so a test can see that sound was made, not only a true result. */
const start = vi.fn();

/** A fresh copy of the module, so the shared player starts empty in each test. */
async function load() {
  vi.resetModules();
  return import("./alertSound");
}

/** Sets the state of every fake player, as the phone would. */
function setAll(state: FakeContext["state"]) {
  for (const ctx of FakeContext.made) ctx.state = state;
}

beforeEach(() => {
  FakeContext.made = [];
  FakeContext.resumeResult = "run";
  vibrate.mockClear();
  start.mockClear();
  vi.stubGlobal("window", { AudioContext: FakeContext });
  vi.stubGlobal("navigator", { vibrate });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("unlockSound", () => {
  it("starts the player after a tap", async () => {
    const { unlockSound } = await load();
    expect(await unlockSound()).toBe(true);
    expect(FakeContext.made).toHaveLength(1);
  });

  it("reuses the same player on a second tap", async () => {
    const { unlockSound } = await load();
    await unlockSound();
    await unlockSound();
    expect(FakeContext.made).toHaveLength(1);
  });

  it("makes a new player when the phone closed the old one", async () => {
    const { unlockSound, playAlert } = await load();
    await unlockSound();
    setAll("closed");
    expect(await unlockSound()).toBe(true);
    expect(FakeContext.made).toHaveLength(2);
    expect(await playAlert()).toBe(true);
  });

  it("gives false when the browser has no sound player", async () => {
    vi.stubGlobal("window", {});
    const { unlockSound } = await load();
    expect(await unlockSound()).toBe(false);
  });
});

describe("playAlert", () => {
  it("plays when the player is running", async () => {
    const { unlockSound, playAlert } = await load();
    await unlockSound();
    expect(await playAlert()).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
  });

  it("does not start the beep when it is no longer wanted after the wait for the player", async () => {
    vi.useFakeTimers();
    const { unlockSound, playAlert } = await load();
    await unlockSound();
    setAll("suspended");
    FakeContext.resumeResult = "slow";
    const result = playAlert(() => false);
    await vi.advanceTimersByTimeAsync(500);
    expect(await result).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it("still vibrates when there is no player", async () => {
    const { playAlert } = await load();
    expect(await playAlert()).toBe(false);
    expect(vibrate).toHaveBeenCalledWith([200, 100, 200]);
  });

  it("gives up after 1 second when the player will not start", async () => {
    vi.useFakeTimers();
    const { unlockSound, playAlert } = await load();
    await unlockSound();
    setAll("suspended");
    FakeContext.resumeResult = "hang";
    const result = playAlert();
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it("leaves no unhandled error when resume() fails after the wait", async () => {
    const unhandled = vi.fn();
    process.on("unhandledRejection", unhandled);
    try {
      vi.useFakeTimers();
      const { unlockSound, playAlert } = await load();
      await unlockSound();
      setAll("suspended");
      FakeContext.resumeResult = "reject-late";
      const result = playAlert();
      await vi.advanceTimersByTimeAsync(3000);
      expect(await result).toBe(false);
      // Give Node a short real wait to report an unhandled rejection, if there is one.
      vi.useRealTimers();
      await new Promise((resolve) => setTimeout(resolve, 20));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off("unhandledRejection", unhandled);
    }
  });
});

describe("stopVibration", () => {
  it("stops a running vibration", async () => {
    const { stopVibration } = await load();
    stopVibration();
    expect(vibrate).toHaveBeenCalledWith(0);
  });
});
