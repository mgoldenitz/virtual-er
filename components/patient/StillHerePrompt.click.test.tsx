// @vitest-environment happy-dom
// Taps "I'm still here" in a test browser: focus must not drop to the page when the prompt
// leaves, and the thank-you goes into a status box that was already on the page.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatientView } from "@/lib/patientView";
import { recordStillHere } from "@/data/patientVisit";
import { textFor } from "@/lib/text";
import { StillHerePrompt } from "./StillHerePrompt";

// The tap's save and the clock are replaced, so each test controls them.
vi.mock("@/data/patientVisit", () => ({ recordStillHere: vi.fn().mockResolvedValue("saved") }));
const NOW = new Date("2026-11-16T12:00:00Z");
vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const s = textFor("en").stillHere;

// Triaged 31 minutes ago and never tapped, so the prompt is due.
const due: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  placeInLine: 2,
  waitLow: 20,
  waitHigh: 40,
  calledAt: null,
  lastStillHereAt: null,
  offeredAt: null,
  triagedAt: "2026-11-16T11:29:00Z",
  seen: false,
  closed: false,
  expired: false,
  surveyDone: false,
};
// What the page gets after the tap is saved.
const tapped: PatientView = { ...due, lastStillHereAt: "2026-11-16T11:59:30Z" };

let container: HTMLDivElement;
let root: Root;

/** The prompt with the status heading below it, as on the patient page. */
function show(view: PatientView) {
  act(() =>
    root.render(
      <>
        <StillHerePrompt view={view} token="t" language="en" />
        <h2 id="status-heading" tabIndex={-1}>
          Status
        </h2>
      </>,
    ),
  );
}

const button = () => [...container.querySelectorAll("button")].find((b) => b.textContent === s.button);
const statusBox = () => container.querySelector('[role="status"]');

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("StillHerePrompt tap", () => {
  it("moves focus to the status heading when the prompt leaves after the tap", async () => {
    show(due);
    button()?.focus();
    await act(async () => button()?.click());
    show(tapped);
    expect(button()).toBeUndefined();
    expect(document.activeElement).toBe(container.querySelector("#status-heading"));
  });

  it("puts the thank-you into a status box that was already on the page, empty", async () => {
    show(due);
    const box = statusBox();
    expect(box).not.toBeNull();
    expect(box?.textContent).toBe("");
    await act(async () => button()?.click());
    show(tapped);
    expect(statusBox()).toBe(box);
    expect(box?.textContent).toContain(s.thanks);
  });

  it("keeps the empty thank-you box out of the layout before the tap", () => {
    show(due);
    expect(statusBox()?.className.split(" ")).toContain("sr-only");
  });

  it("keeps the status box hidden after the tap and shows the thank-you in a card screen readers can touch", async () => {
    show(due);
    await act(async () => button()?.click());
    show(tapped);
    expect(statusBox()?.className.split(" ")).toContain("sr-only");
    const card = container.querySelector('[data-testid="still-here-card"]');
    expect(card?.hasAttribute("aria-hidden")).toBe(false);
    expect(card?.textContent).toContain(s.thanks);
  });

  it("makes screen readers read the thank-you box as one whole message", () => {
    show(due);
    expect(statusBox()?.getAttribute("aria-atomic")).toBe("true");
  });

  it("empties the hidden thank-you box after a few seconds, so a swipe reads the words only on the card", async () => {
    vi.useFakeTimers();
    try {
      show(due);
      await act(async () => button()?.click());
      show(tapped);
      expect(statusBox()?.textContent).toContain(s.thanks);
      act(() => vi.advanceTimersByTime(5_000));
      expect(statusBox()?.textContent).toBe("");
      expect(container.querySelector('[data-testid="still-here-card"]')?.textContent).toContain(s.thanks);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not thank a patient for the switch to off-site waiting, which is not a tap", () => {
    const switched: PatientView = {
      ...due,
      offeredAt: "2026-11-16T11:59:55Z",
      lastStillHereAt: "2026-11-16T11:59:55Z",
    };
    show(switched);
    expect(container.textContent).not.toContain(s.thanks);
  });

  it("leaves focus on the page after a phone tap that did not focus the button", async () => {
    show(due);
    expect(document.activeElement).toBe(document.body);
    await act(async () => button()?.click());
    show(tapped);
    expect(document.activeElement).toBe(document.body);
  });

  it("says the tap did not save, without telling a waiting patient to go to the desk", async () => {
    vi.mocked(recordStillHere).mockResolvedValueOnce("not_saved");
    show(due);
    await act(async () => button()?.click());
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Your tap did not save. Staff may not know you are still waiting. Please try again.");
    expect(alert?.textContent).not.toBe(textFor("en").patient.notSaved);
  });
});
