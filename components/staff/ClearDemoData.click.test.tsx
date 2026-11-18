// @vitest-environment happy-dom
// Presses the "Clear demo data" buttons in a test browser (happy-dom): one tap only asks, Cancel
// calls nothing, Yes clears once and reports the count, and a failed clear keeps the question open.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearDemoData } from "@/data/demoData";
import { ClearDemoData } from "./ClearDemoData";

// The words are the owner's; the test only checks which result they were given.
vi.mock("@/data/demoData", () => ({ clearDemoData: vi.fn() }));
vi.mock("@/lib/clearDemoMessage", () => ({
  clearDemoMessage: (result: number | "failed") => "words:" + String(result),
}));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function show(onResult = vi.fn()) {
  act(() => root.render(<ClearDemoData onResult={onResult} />));
  return onResult;
}

/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

const question = () => container.querySelector<HTMLElement>('[data-testid="clear-demo-confirm"]');

async function press(words: string) {
  const target = button(words);
  if (!target) throw new Error(`No button "${words}"`);
  // A real tap or Enter key puts focus on the button first; happy-dom's click() alone does not.
  target.focus();
  await act(async () => target.click());
}

/** Lets the pending save and the panel's one-tick focus wait (setTimeout 0) run. */
const nextTick = () => act(async () => new Promise((resolve) => setTimeout(resolve, 0)));

beforeEach(() => {
  vi.mocked(clearDemoData).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ClearDemoData taps", () => {
  it("asks first: one tap clears nothing and moves focus to the question", async () => {
    const onResult = show();
    await press("Clear demo data");
    await nextTick();
    expect(clearDemoData).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(question()?.textContent).toContain("Clear all demo data?");
    expect(button("Clear demo data")).toBeUndefined();
    expect(document.activeElement).toBe(question()?.querySelector("h3"));
  });

  it("Cancel closes the question, clears nothing, and brings focus back to Clear demo data", async () => {
    const onResult = show();
    await press("Clear demo data");
    await press("Cancel");
    await nextTick();
    expect(clearDemoData).not.toHaveBeenCalled();
    expect(onResult).not.toHaveBeenCalled();
    expect(question()).toBeNull();
    expect(document.activeElement).toBe(button("Clear demo data"));
  });

  it("Yes clears once, reports the count, and closes the question", async () => {
    vi.mocked(clearDemoData).mockResolvedValue(3);
    const onResult = show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(clearDemoData).toHaveBeenCalledTimes(1);
    expect(onResult).toHaveBeenCalledWith("words:3");
    expect(question()).toBeNull();
  });

  it("when the clear fails, reports the failure and keeps the question open", async () => {
    vi.mocked(clearDemoData).mockResolvedValue("failed");
    const onResult = show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(onResult).toHaveBeenCalledWith("words:failed");
    expect(question()).not.toBeNull();
    expect(button("Yes, clear demo data")).toBeDefined();
  });

  it("while a clear is pending, a second Yes and Cancel do nothing; after it ends, focus is on Clear demo data", async () => {
    let finish!: (v: number | "failed") => void;
    vi.mocked(clearDemoData).mockReturnValue(
      new Promise<number | "failed">((resolve) => {
        finish = resolve;
      }),
    );
    show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    // The Yes button now reads "Saving…", so it is found by that text.
    await press("Saving…");
    expect(clearDemoData).toHaveBeenCalledTimes(1);
    await press("Cancel");
    expect(question()).not.toBeNull();
    await act(async () => finish(3));
    await nextTick();
    expect(question()).toBeNull();
    expect(document.activeElement).toBe(button("Clear demo data"));
  });
});
