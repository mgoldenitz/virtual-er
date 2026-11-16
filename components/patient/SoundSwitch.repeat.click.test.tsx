// @vitest-environment happy-dom
// Checks the repeat beep of the "Turn on sound" box while the visit is called: a tap right after a
// failed beep, the "still wanted?" answer while the phone is locked, and a new try when it unlocks.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { textFor } from "@/lib/text";
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

/** Copies a locked phone (the page is hidden) or an unlocked one. */
function hidePage(hidden: boolean) {
  if (hidden) Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
  else delete (document as { visibilityState?: string }).visibilityState;
}

let container: HTMLDivElement;
let root: Root;

const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);

/** Shows the box for a called visit, taps "Turn on sound", and gives back the repeat beep that waits. */
async function soundOnWhileCalled() {
  const beep = later<boolean>();
  vi.mocked(playAlert).mockReturnValue(beep.promise);
  act(() => root.render(<SoundSwitch status="called" language="en" />));
  const turnOn = button(t.turnOn);
  turnOn?.focus();
  await act(async () => turnOn?.click());
  return beep;
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
  hidePage(false);
});

describe("SoundSwitch repeat beep", () => {
  it("moves focus to Turn on sound after a tap on Turn off sound that comes right after a failed beep", async () => {
    const beep = await soundOnWhileCalled();
    // A phone tap elsewhere put focus on the page body, so the failed beep alone must not take focus.
    (document.activeElement as HTMLElement | null)?.blur();
    await act(async () => {
      beep.finish(false);
      await Promise.resolve();
      await Promise.resolve();
      // The tap comes before React shows the result of the failed beep.
      button(t.turnOff)?.click();
    });
    expect(document.activeElement).toBe(button(t.turnOn));
  });

  it("answers no to 'still wanted?' while the phone is locked, before the box leaves", async () => {
    await soundOnWhileCalled();
    const stillWanted = vi.mocked(playAlert).mock.calls[0][0];
    expect(stillWanted?.()).toBe(true);
    hidePage(true);
    expect(stillWanted?.()).toBe(false);
  });

  it("tries the beep again when the phone is unlocked", async () => {
    const beep = await soundOnWhileCalled();
    hidePage(true);
    await act(async () => beep.finish(false));
    hidePage(false);
    await act(async () => document.dispatchEvent(new Event("visibilitychange")));
    expect(playAlert).toHaveBeenCalledTimes(2);
  });
});
