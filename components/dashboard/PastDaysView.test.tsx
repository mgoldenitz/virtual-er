// @vitest-environment happy-dom
// Draws the past 7 days part of the dashboard in a test browser (happy-dom): one line when no past day
// has a number, or the 2 site tables and the CSV button when one does. Owner decision 2026-11-21.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { trendNumbers, type TrendDay } from "@/lib/trendNumbers";
import { PastDaysView } from "./PastDaysView";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The 7 days before 2026-11-25, all empty, and the same days with one offer on 2026-11-22 for site B.
const empty = trendNumbers([], [], "2026-11-25", false);
const withData: TrendDay[] = empty.map((d) =>
  d.day === "2026-11-22" ? { day: d.day, numbers: { A: d.numbers.A, B: { ...d.numbers.B, offered: 2 } } } : d,
);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("PastDaysView", () => {
  it("shows only one line, with no table and no button, when no past day has a number", () => {
    act(() => root.render(<PastDaysView trend={empty} today="2026-11-25" isDemo={false} />));
    expect(container.textContent).toBe("No past days with visits yet.");
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector("button")).toBeNull();
  });

  it("shows the 2 site tables and the CSV button when a past day has a number", () => {
    act(() => root.render(<PastDaysView trend={withData} today="2026-11-25" isDemo={false} />));
    const headings = [...container.querySelectorAll("h2")].map((h) => h.textContent);
    expect(headings).toEqual(["Demo Site A, past 7 days", "Demo Site B, past 7 days"]);
    expect(container.querySelectorAll("table")).toHaveLength(2);
    expect(container.querySelector("button")?.textContent).toBe("Download past 7 days (CSV)");
    expect(container.textContent).not.toContain("No past days with visits yet.");
  });
});
