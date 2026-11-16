// @vitest-environment happy-dom
// Checks that the "Turn on sound" box tells the page when it leaves while focus is inside it,
// so the page can move focus to the status heading.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { textFor } from "@/lib/text";
import { playAlert, stopVibration, unlockSound } from "./alertSound";
import { SoundSwitch } from "./SoundSwitch";

// Replace the real sound player.
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = textFor("en").sound;

let container: HTMLDivElement;
let root: Root;

const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
  target.focus();
  await act(async () => target.click());
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

describe("SoundSwitch leaving the page", () => {
  it("tells the page when the box leaves while focus is on Sound is on", async () => {
    const onFocusLost = vi.fn();
    act(() => root.render(<SoundSwitch status="called" language="en" onFocusLost={onFocusLost} />));
    await press(t.turnOn);
    expect(document.activeElement?.textContent).toBe(t.on);
    // Staff mark the visit arrived, so the page takes the box away.
    act(() => root.render(<></>));
    expect(onFocusLost).toHaveBeenCalledTimes(1);
  });

  it("does not tell the page when focus is on another button as the box leaves", async () => {
    const onFocusLost = vi.fn();
    const screen = (withBox: boolean) => (
      <>
        <button>Other</button>
        {withBox && <SoundSwitch status="called" language="en" onFocusLost={onFocusLost} />}
      </>
    );
    act(() => root.render(screen(true)));
    await press(t.turnOn);
    button("Other")?.focus();
    act(() => root.render(screen(false)));
    expect(onFocusLost).not.toHaveBeenCalled();
  });
});
