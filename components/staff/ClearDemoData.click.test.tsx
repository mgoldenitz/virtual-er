// @vitest-environment happy-dom
// Presses the "Clear demo data" buttons in a test browser (happy-dom): one tap only asks, Cancel
// calls nothing, Yes clears once and shows the count in the status line, and a failed clear keeps the question open.

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

function show() {
  act(() => root.render(<ClearDemoData />));
}

/** The button whose words start with `words`. */
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent?.startsWith(words));

const question = () => container.querySelector<HTMLElement>('[data-testid="clear-demo-confirm"]');

/** The words in the status line under the buttons. */
const status = () => container.querySelector('[role="status"]')?.textContent;

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
    show();
    await press("Clear demo data");
    await nextTick();
    expect(clearDemoData).not.toHaveBeenCalled();
    expect(status()).toBe("");
    expect(question()?.textContent).toContain("Clear all demo data?");
    expect(button("Clear demo data")).toBeUndefined();
    expect(document.activeElement).toBe(question()?.querySelector("h3"));
  });

  it("Cancel closes the question, clears nothing, and brings focus back to Clear demo data", async () => {
    show();
    await press("Clear demo data");
    await press("Cancel");
    await nextTick();
    expect(clearDemoData).not.toHaveBeenCalled();
    expect(status()).toBe("");
    expect(question()).toBeNull();
    expect(document.activeElement).toBe(button("Clear demo data"));
  });

  it("Yes clears once, shows the count in the status line, and closes the question", async () => {
    vi.mocked(clearDemoData).mockResolvedValue(3);
    show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(clearDemoData).toHaveBeenCalledTimes(1);
    expect(status()).toBe("words:3");
    expect(question()).toBeNull();
  });

  it("when the clear fails, shows the failure and keeps the question open", async () => {
    vi.mocked(clearDemoData).mockResolvedValue("failed");
    show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(status()).toBe("words:failed");
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
    expect(status()).toBe("");
    // The Yes button now reads "Saving…", so it is found by that text.
    await press("Saving…");
    expect(clearDemoData).toHaveBeenCalledTimes(1);
    await press("Cancel");
    expect(question()).not.toBeNull();
    expect(status()).toBe("");
    await act(async () => finish(3));
    await nextTick();
    expect(question()).toBeNull();
    expect(document.activeElement).toBe(button("Clear demo data"));
  });

  it("the same result twice is shown again", async () => {
    vi.mocked(clearDemoData).mockResolvedValue(0);
    show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(status()).toBe("words:0");

    let finish!: (v: number | "failed") => void;
    vi.mocked(clearDemoData).mockReturnValue(
      new Promise<number | "failed">((resolve) => {
        finish = resolve;
      }),
    );
    await press("Clear demo data");
    await press("Yes, clear demo data");
    expect(status()).toBe("");

    await act(async () => finish(0));
    await nextTick();
    expect(status()).toBe("words:0");
  });

  it("a failed clear pressed again: the same failure words are shown again", async () => {
    vi.mocked(clearDemoData).mockResolvedValue("failed");
    show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(status()).toBe("words:failed");

    let finish!: (v: number | "failed") => void;
    vi.mocked(clearDemoData).mockReturnValue(
      new Promise<number | "failed">((resolve) => {
        finish = resolve;
      }),
    );
    // The question stays open after a failure, so Yes is pressed again without reopening it.
    await press("Yes, clear demo data");
    expect(status()).toBe("");

    await act(async () => finish("failed"));
    await nextTick();
    expect(status()).toBe("words:failed");
  });

  it("opening the question clears an old message", async () => {
    vi.mocked(clearDemoData).mockResolvedValue(3);
    show();
    await press("Clear demo data");
    await press("Yes, clear demo data");
    await nextTick();
    expect(status()).toBe("words:3");
    await press("Clear demo data");
    expect(status()).toBe("");
  });

  it("Yes points to the no-undo text", async () => {
    show();
    await press("Clear demo data");
    const yes = button("Yes, clear demo data");
    expect(yes?.getAttribute("aria-describedby")).toBe("clear-demo-warning");
    expect(container.querySelector("#clear-demo-warning")?.textContent).toContain("There is no undo.");
  });
});
