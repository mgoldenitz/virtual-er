// @vitest-environment happy-dom
// Checks that the summary panel has one live status box before a click, and that the same box shows the summary text after it.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchDashboardSummary } from "@/data/dashboardSummary";
import { SummaryPanel } from "./SummaryPanel";

// The summary call is replaced, so the test does not reach the server or the sign-in store.
vi.mock("@/data/dashboardSummary", () => ({ fetchDashboardSummary: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SUMMARY = "Today 12 visits were checked in, and 3 are waiting off-site.";

let container: HTMLDivElement;
let root: Root;

/** The live status boxes on the page (role="status"). */
const statusBoxes = () => [...container.querySelectorAll('[role="status"]')];

/** The "Write a short summary" button. */
const summaryButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent === "Write a short summary");

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(fetchDashboardSummary).mockReset().mockResolvedValue({ kind: "text", text: SUMMARY });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SummaryPanel status box", () => {
  it("has one status box before the click, and the same box shows the summary text after it", async () => {
    act(() => root.render(<SummaryPanel isDemo={false} />));
    expect(statusBoxes()).toHaveLength(1);
    const box = statusBoxes()[0];

    await act(async () => summaryButton()?.click());

    expect(statusBoxes()).toHaveLength(1);
    expect(statusBoxes()[0]).toBe(box);
    expect(statusBoxes()[0].textContent).toContain(SUMMARY);
  });
});
