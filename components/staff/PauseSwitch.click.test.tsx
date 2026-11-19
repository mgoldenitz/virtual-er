// @vitest-environment happy-dom
// Presses the pause buttons in a test browser (happy-dom): while a pause is being saved, Cancel
// must not close the "Pause off-site waiting" question.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setSitePaused } from "@/data/sitePauses";
import { PauseSwitch } from "./PauseSwitch";

vi.mock("@/data/sitePauses", () => ({ setSitePaused: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function show() {
  act(() => root.render(<PauseSwitch site="A" paused={false} offSiteCount={2} onResult={vi.fn()} />));
}

/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

const pauseQuestion = () => container.querySelector<HTMLElement>('[data-testid="pause-confirm"]');

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
  target.focus();
  await act(async () => target.click());
}

/** Lets the pending save and the switch's one-tick focus wait (setTimeout 0) run. */
const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  vi.mocked(setSitePaused).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("PauseSwitch taps", () => {
  it("while a pause is pending, Cancel does not close the question; it closes after the save ends", async () => {
    let finish!: (v: "saved") => void;
    vi.mocked(setSitePaused).mockReturnValue(
      new Promise<"saved">((resolve) => {
        finish = resolve;
      }),
    );
    show();
    await press("Pause off-site waiting at Demo Site A");
    await press("Yes, pause off-site waiting");
    await press("Cancel");
    expect(pauseQuestion()).not.toBeNull();
    await act(async () => finish("saved"));
    await nextTick();
    expect(pauseQuestion()).toBeNull();
  });
});
