// @vitest-environment happy-dom
// Presses the buttons of the "Turn on sound" box in a test browser (happy-dom): late results of an
// earlier tap change nothing, a double tap runs once, and focus never drops to the page.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";
import { playAlert, stopVibration, unlockSound } from "./alertSound";
import { SoundSwitch } from "./SoundSwitch";

// Replace the real sound player; each test chooses what it gives and when.
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = textFor("en").sound;

/** A promise that the test finishes later, to copy a slow phone. */
function later<T>() {
  let finish!: (value: T) => void;
  const promise = new Promise<T>((resolve) => (finish = resolve));
  return { promise, finish };
}

let container: HTMLDivElement;
let root: Root;

function show(status: VisitStatus) {
  act(() => root.render(<SoundSwitch status={status} language="en" />));
}

const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);
const statusBox = () => container.querySelector('[role="status"]');

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
  target.focus();
  await act(async () => target.click());
}

/** Finishes a slow promise and lets React show the result. */
async function settle<T>(slow: { finish: (value: T) => void }, value: T) {
  await act(async () => slow.finish(value));
}

beforeEach(() => {
  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
  vi.mocked(playAlert).mockReset().mockResolvedValue(true);
  vi.mocked(stopVibration).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SoundSwitch taps", () => {
  it("stays off when Turn off is tapped while the test beep still waits", async () => {
    const beep = later<boolean>();
    vi.mocked(playAlert).mockReturnValue(beep.promise);
    show("waiting");
    await press(t.turnOn);
    await press(t.turnOff);
    await settle(beep, false);
    expect(button(t.turnOn)).toBeDefined();
    expect(container.textContent).not.toContain(t.failed);
  });

  it("can be turned on again after Turn off, even while the old test beep still waits", async () => {
    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
    show("waiting");
    await press(t.turnOn);
    await press(t.turnOff);
    await press(t.turnOn);
    expect(unlockSound).toHaveBeenCalledTimes(2);
  });

  it("runs a double tap once", async () => {
    const unlock = later<boolean>();
    vi.mocked(unlockSound).mockReturnValue(unlock.promise);
    show("waiting");
    await press(t.turnOn);
    await press(t.turnOn);
    await settle(unlock, true);
    expect(unlockSound).toHaveBeenCalledTimes(1);
  });

  it("shows the failed line in the status box when the sound cannot start", async () => {
    vi.mocked(unlockSound).mockResolvedValue(false);
    show("waiting");
    await press(t.turnOn);
    expect(statusBox()?.textContent).toBe(t.failed);
  });

  it("stops the vibration and moves focus to Turn on sound after Turn off", async () => {
    show("waiting");
    await press(t.turnOn);
    await press(t.turnOff);
    expect(stopVibration).toHaveBeenCalled();
    expect(document.activeElement).toBe(button(t.turnOn));
  });

  it("moves focus to Turn on sound when the test beep fails", async () => {
    vi.mocked(playAlert).mockResolvedValue(false);
    show("waiting");
    await press(t.turnOn);
    expect(document.activeElement).toBe(button(t.turnOn));
  });
});

describe("SoundSwitch while called", () => {
  it("does not start a new beep while the last one still waits for the player", async () => {
    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
    show("called");
    await press(t.turnOn);
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(playAlert).toHaveBeenCalledTimes(1);
  });

  it("ignores a late failed beep from before Turn off and Turn on", async () => {
    const oldBeep = later<boolean>();
    vi.mocked(playAlert).mockReturnValueOnce(oldBeep.promise);
    show("called");
    await press(t.turnOn);
    await press(t.turnOff);
    await press(t.turnOn);
    await settle(oldBeep, false);
    expect(container.textContent).toContain(t.on);
    // The second Turn on beeps again; the old beep that still waited must not block it.
    expect(playAlert).toHaveBeenCalledTimes(2);
  });

  it("beeps once when the visit is called while the sound is still starting", async () => {
    const unlock = later<boolean>();
    vi.mocked(unlockSound).mockReturnValue(unlock.promise);
    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
    show("waiting");
    await press(t.turnOn);
    show("called");
    await settle(unlock, true);
    expect(playAlert).toHaveBeenCalledTimes(1);
  });

  it("stops the vibration when the box goes away while a beep still waits", async () => {
    vi.mocked(playAlert).mockReturnValue(later<boolean>().promise);
    show("called");
    await press(t.turnOn);
    vi.mocked(stopVibration).mockClear();
    // "I'm on my way" takes the sound box off the page.
    act(() => root.render(<></>));
    expect(stopVibration).toHaveBeenCalledTimes(1);
  });

  it("moves focus to Turn on sound when a beep fails and the sound goes off", async () => {
    vi.mocked(playAlert).mockResolvedValue(false);
    show("called");
    await press(t.turnOn);
    expect(button(t.turnOn)).toBeDefined();
    expect(document.activeElement).toBe(button(t.turnOn));
  });
});
