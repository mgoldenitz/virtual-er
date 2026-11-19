// @vitest-environment happy-dom
// Draws one site's dashboard numbers in a test browser (happy-dom) and checks the words on screen.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dashboardNumbers, type SiteNumbers as Counts } from "@/lib/dashboardNumbers";
import { SiteNumbers } from "./SiteNumbers";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Every number is 0 when there are no visits and no stats.
const zero: Counts = dashboardNumbers([], [], "2026-11-18", false).A;

let container: HTMLDivElement;
let root: Root;

function show(numbers: Counts) {
  act(() => root.render(<SiteNumbers site="A" numbers={numbers} />));
}

const text = () => container.textContent ?? "";

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SiteNumbers", () => {
  it("shows every label", () => {
    show(zero);
    const labels = [
      "Waiting off-site",
      "Recalled, not yet arrived",
      "Back for reassessment",
      "Offered off-site waiting",
      "Accepted",
      "Declined",
      "Average minutes from recall to arrival",
      "No-shows",
      "Unable to reach (nurse confirmed)",
      "Left",
      "Started from home",
      "Reached triage",
      "Survey responses",
      "Average score (0 to 10)",
      "Scored 9 or 10",
    ];
    for (const label of labels) expect(text()).toContain(label);
  });

  it("shows the offered share as a whole percent", () => {
    show({ ...zero, offered: 8, triaged: 10 });
    expect(text()).toContain("8 of 10 triaged (80%)");
  });

  it("shows the screen-reader text for no data, and no NaN, when every number is 0", () => {
    show(zero);
    expect(container.querySelectorAll(".sr-only").length).toBeGreaterThan(0);
    expect(container.innerHTML).toContain("no data yet");
    expect(text()).toContain("0 of 0 triaged (-no data yet)");
    expect(text()).not.toContain("NaN");
  });

  it("says 1 visit in the singular", () => {
    show({ ...zero, arrivedAfterRecall: 1, recallToArrivalSeconds: 840 });
    expect(text()).toContain("14 (1 visit)");
    expect(text()).not.toContain("1 visits");
  });
});
