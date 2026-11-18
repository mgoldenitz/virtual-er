// @vitest-environment happy-dom
// Presses the "Recall patient" buttons in a test browser (happy-dom): one tap only asks, the
// question names the visit, where focus goes, and that "Yes" does nothing while a change is saving.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecallPanel } from "./RecallPanel";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function show(saving: boolean, onConfirm = vi.fn()) {
  act(() => root.render(<RecallPanel code="ABC234" saving={saving} onConfirm={onConfirm} />));
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

describe("RecallPanel taps", () => {
  it("asks first: one tap recalls nothing, names the visit, and moves focus to Yes", async () => {
    const onConfirm = show(false);
    await press("Recall patient");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(container.textContent).toContain(
      `Recall visit ABC234? The patient's phone will show "Please head back now". There is no undo.`,
    );
    expect(button("Recall patient")).toBeUndefined();
    expect(button("Cancel")).toBeDefined();
    expect(document.activeElement).toBe(button("Yes, recall patient"));
  });

  it("Cancel closes the question, recalls nothing, and brings focus back to Recall patient", async () => {
    const onConfirm = show(false);
    await press("Recall patient");
    await press("Cancel");
    await nextTick();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button("Yes, recall patient")).toBeUndefined();
    expect(document.activeElement).toBe(button("Recall patient"));
  });

  it("Yes recalls once", async () => {
    const onConfirm = show(false);
    await press("Recall patient");
    await press("Yes, recall patient");
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Yes does nothing while a change is still saving", async () => {
    const onConfirm = show(false);
    await press("Recall patient");
    show(true, onConfirm);
    await press("Yes, recall patient");
    expect(onConfirm).not.toHaveBeenCalled();
    expect(button("Yes, recall patient")).toBeDefined();
  });

  it("Recall patient does not open the question again while the recall is still saving", async () => {
    const onConfirm = show(false);
    await press("Recall patient");
    await press("Yes, recall patient");
    show(true, onConfirm);
    await press("Recall patient");
    expect(button("Yes, recall patient")).toBeUndefined();
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("Yes is described by the question, so a screen reader hears the code and There is no undo", async () => {
    show(false);
    await press("Recall patient");
    const yes = button("Yes, recall patient");
    const id = yes?.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    expect(document.getElementById(id ?? "")?.textContent).toContain("Recall visit ABC234?");
    expect(document.getElementById(id ?? "")?.textContent).toContain("There is no undo.");
  });

  it("two open questions for the same code each have their own question id", async () => {
    act(() =>
      root.render(
        <>
          <div data-testid="first"><RecallPanel code="ABC234" saving={false} onConfirm={vi.fn()} /></div>
          <div data-testid="second"><RecallPanel code="ABC234" saving={false} onConfirm={vi.fn()} /></div>
        </>,
      ),
    );
    for (const panel of ["first", "second"]) {
      const open = container.querySelector(`[data-testid="${panel}"] button`) as HTMLButtonElement;
      await act(async () => open.click());
    }
    for (const panel of ["first", "second"]) {
      const box = container.querySelector(`[data-testid="${panel}"]`) as HTMLElement;
      const yes = [...box.querySelectorAll("button")].find((b) => b.textContent?.startsWith("Yes"));
      const question = document.getElementById(yes?.getAttribute("aria-describedby") ?? "");
      expect(box.contains(question)).toBe(true);
    }
  });
});
