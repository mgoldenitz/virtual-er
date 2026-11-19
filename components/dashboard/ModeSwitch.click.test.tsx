// @vitest-environment happy-dom
// Presses the Real and Demo buttons in a test browser (happy-dom): the pressed one must say so,
// and a press on Demo must report it.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ModeSwitch } from "./ModeSwitch";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

/** The button whose text is exactly `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ModeSwitch", () => {
  it("marks Real as pressed when isDemo is false", () => {
    act(() => root.render(<ModeSwitch isDemo={false} onChange={vi.fn()} />));
    expect(button("Real")?.getAttribute("aria-pressed")).toBe("true");
    expect(button("Demo")?.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onChange(true) when Demo is pressed", async () => {
    const onChange = vi.fn();
    act(() => root.render(<ModeSwitch isDemo={false} onChange={onChange} />));
    const demo = button("Demo");
    if (!demo) throw new Error('No button "Demo"');
    await act(async () => demo.click());
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
