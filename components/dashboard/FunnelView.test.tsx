// @vitest-environment happy-dom
// Draws today's funnel for both sites in a test browser (happy-dom) and checks the steps, counts and the line under them.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { dashboardNumbers, type SiteNumbers } from "@/lib/dashboardNumbers";
import { FunnelView } from "./FunnelView";

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const zero: SiteNumbers = dashboardNumbers([], [], "2026-11-21", false).A;
const busy: SiteNumbers = {
  ...zero,
  startedFromHome: 5, homeReachedTriage: 4, triaged: 9, offered: 7, accepted: 6,
  recalled: 4, arrivedAfterRecall: 3, surveyResponses: 2,
};

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

/** The text of each step in the list for one site. */
function steps(site: "A" | "B"): string[] {
  const list = container.querySelector(`ol[aria-label="Demo Site ${site}, today"]`);
  if (!list) throw new Error(`No list for site ${site}`);
  return [...list.querySelectorAll("li")].map((li) => li.textContent ?? "");
}

describe("FunnelView", () => {
  it("lists the 8 steps with their counts for each site, in order", () => {
    act(() => root.render(<FunnelView numbers={{ A: busy, B: zero }} />));
    expect(steps("A")).toEqual([
      "Started from home5",
      "Reached triage (from home)4",
      "Triaged CTAS 4 or 5 (home and desk)9",
      "Offered7",
      "Accepted6",
      "Recalled4",
      "Arrived after recall3",
      "Answered survey2",
    ]);
    expect(steps("B")[0]).toBe("Started from home0");
  });

  it("shows counts only, with no percent, and the line that explains a larger lower row", () => {
    act(() => root.render(<FunnelView numbers={{ A: busy, B: zero }} />));
    expect(container.textContent).not.toContain("%");
    expect(container.textContent).toContain(
      "Each row counts what happened today. Desk patients join at Triaged, and some patients come back before a recall, so a lower row can be larger.",
    );
  });
});
