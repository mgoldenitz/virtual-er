// @vitest-environment happy-dom
// Presses the buttons of the lost-phone panel in a test browser (happy-dom): the confirm question,
// where focus goes, and that "Yes" does nothing while a change is still saving.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NewLinkPanel } from "./NewLinkPanel";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function show(saving: boolean, onConfirm = vi.fn()) {
  act(() => root.render(<NewLinkPanel code="ABC234" saving={saving} onConfirm={onConfirm} />));
  return onConfirm;
}

/** The button whose words start with `words` (some buttons also hold hidden words for screen readers). */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
  target.focus();
  await act(async () => target.click());
}

/** Lets the panel's one-tick focus wait (setTimeout 0) run. */
const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("NewLinkPanel taps", () => {
  it("asks first: Issue a new link shows Yes and Cancel, and focus moves to Yes", async () => {
    show(false);
    await press("Issue a new link");
    expect(button("Yes, issue a new link")).toBeDefined();
    expect(button("Cancel")).toBeDefined();
    expect(button("Issue a new link")).toBeUndefined();
    expect(document.activeElement).toBe(button("Yes, issue a new link"));
  });

  it("Cancel closes the question, issues nothing, and brings focus back to Issue a new link", async () => {
    const onConfirm = show(false);
    await press("Issue a new link");
    await press("Cancel");
    await nextTick();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button("Yes, issue a new link")).toBeUndefined();
    expect(document.activeElement).toBe(button("Issue a new link"));
  });

  it("Yes issues the link once and brings focus back to Issue a new link", async () => {
    const onConfirm = show(false);
    await press("Issue a new link");
    await press("Yes, issue a new link");
    await nextTick();
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(button("Issue a new link"));
  });

  it("Yes does nothing while a change is still saving", async () => {
    const onConfirm = show(false);
    await press("Issue a new link");
    show(true, onConfirm);
    await press("Yes, issue a new link");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button("Yes, issue a new link")).toBeDefined();
  });
});
