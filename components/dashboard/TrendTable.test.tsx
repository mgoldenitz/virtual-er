// @vitest-environment happy-dom
// Draws one site's past 7 days table in a test browser (happy-dom) and checks the words in each cell.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dashboardNumbers, type SiteNumbers } from "@/lib/dashboardNumbers";
import { trendNumbers, type TrendDay } from "@/lib/trendNumbers";
import { TrendTable } from "./TrendTable";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const zero: SiteNumbers = dashboardNumbers([], [], "2026-11-18", false).A;
const busy: SiteNumbers = {
  ...zero,
  triaged: 10, offered: 8, accepted: 6,
  arrivedAfterRecall: 2, recallToArrivalSeconds: 1500,
  recalled: 3, offerToCallSeconds: 5400,
  surveyResponses: 4, surveyScoreSum: 27,
};

// The 7 days before 2026-11-25 (2026-11-18 to 2026-11-24), all empty, with one busy day for site A.
function trendWith(busyDay: string): TrendDay[] {
  return trendNumbers([], [], "2026-11-25", false).map((d) =>
    d.day === busyDay ? { day: d.day, numbers: { A: busy, B: zero } } : d,
  );
}

let container: HTMLDivElement;
let root: Root;

function show(trend: TrendDay[]) {
  act(() => root.render(<TrendTable site="A" trend={trend} />));
}

/** The text of each cell in the row for one day. */
function rowCells(day: string): string[] {
  const row = [...container.querySelectorAll("tbody tr")].find((r) => r.querySelector("th")?.textContent === day);
  if (!row) throw new Error(`No row for ${day}`);
  return [...row.querySelectorAll("td")].map((c) => c.textContent ?? "");
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("TrendTable", () => {
  it("has a caption, the column headers and one row per day, oldest first", () => {
    show(trendWith("2026-11-22"));
    expect(container.querySelector("caption")?.textContent).toBe("Demo Site A, past 7 days");
    const headers = [...container.querySelectorAll("thead th")].map((h) => h.textContent);
    expect(headers).toEqual([
      "Day",
      "Triaged CTAS 4 or 5",
      "Offered",
      "Accepted",
      "Average minutes from recall to arrival",
      "Average minutes from offer to recall",
      "Average score (0 to 10)",
    ]);
    const days = [...container.querySelectorAll("tbody th")].map((h) => h.textContent);
    expect(days[0]).toBe("2026-11-18");
    expect(days[6]).toBe("2026-11-24");
  });

  it("shows each share with its counts and each average with its count in brackets", () => {
    show(trendWith("2026-11-22"));
    expect(rowCells("2026-11-22")).toEqual([
      "10",
      "8 of 10 (80%)",
      "6 of 8 (75%)",
      "13 (2 visits)",
      "30 (3 visits)",
      "6.8 (4 responses)",
    ]);
  });

  it("shows the no-data dash, with no NaN, on an empty day", () => {
    show(trendWith("2026-11-22"));
    expect(rowCells("2026-11-23")).toEqual([
      "0",
      "0 of 0 (-no data yet)",
      "0 of 0 (-no data yet)",
      "-no data yet (0 visits)",
      "-no data yet (0 visits)",
      "-no data yet (0 responses)",
    ]);
    expect(container.textContent).not.toContain("NaN");
  });

  it("shows only a dash for the wait before 2026-11-21, with the start note", () => {
    const trend = trendNumbers([], [], "2026-11-22", false).map((d) =>
      d.day === "2026-11-20" ? { day: d.day, numbers: { A: busy, B: zero } } : d,
    );
    show(trend);
    expect(rowCells("2026-11-20")[4]).toBe("-no data yet");
    expect(rowCells("2026-11-21")[4]).toBe("-no data yet (0 visits)");
    expect(container.textContent).toContain("Wait numbers start on 2026-11-21.");
  });

  it("keeps the hidden screen-reader words inside the scroll box, so a phone page does not scroll sideways", () => {
    // An sr-only span is position: absolute. It stays inside an overflow box only when that box is positioned.
    // Found on 2026-11-21 at 390 px: the page was 569 px wide.
    show(trendWith("2026-11-22"));
    const box = container.querySelector('[role="region"]');
    expect(box?.querySelector(".sr-only")).not.toBeNull();
    expect(box?.classList.contains("overflow-x-auto")).toBe(true);
    expect(box?.classList.contains("relative")).toBe(true);
  });

  it("has no start note when every day is on or after the start date", () => {
    // The 7 days before 2026-11-29 are 2026-11-22 to 2026-11-28, all after the start date.
    show(trendNumbers([], [], "2026-11-29", false));
    expect(container.textContent).toContain("Each number counts on the date of its own event.");
    expect(container.textContent).not.toContain("Wait numbers start on");
  });
});
