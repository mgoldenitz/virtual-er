// @vitest-environment happy-dom
// The survey inside the real patient wiring (StatusAndSound), in StrictMode: where focus goes when
// the form leaves the page, and that an Undo and a second arrival start a new, empty form.
// Faults from the Gemini Hydrogen 4 review (handoffs/archive/2026-11-20-gemini-review-survey.md).

import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitSurvey } from "@/data/patientVisit";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import { StatusAndSound } from "./StatusAndSound";

// The save, the clock and the sound player are replaced, so each test controls them.
vi.mock("@/data/patientVisit", () => ({
  recordStillHere: vi.fn().mockResolvedValue("saved"),
  submitSurvey: vi.fn().mockResolvedValue("saved"),
}));
const NOW = new Date("2026-11-21T12:00:00Z");
vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const s = textFor("en").survey;

// Staff marked the patient arrived; no score is saved yet.
const arrived: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "arrived",
  placeInLine: null,
  waitLow: null,
  waitHigh: null,
  calledAt: "2026-11-21T11:00:00Z",
  lastStillHereAt: null,
  triagedAt: "2026-11-21T10:00:00Z",
  seen: true,
  closed: true,
  expired: false,
  surveyDone: false,
};
// Staff pressed Undo: the visit is open and on the way again.
const undone: PatientView = { ...arrived, status: "on_the_way", closed: false };

let container: HTMLDivElement;
let root: Root;

const show = (view: PatientView) =>
  act(() =>
    root.render(
      <StrictMode>
        <StatusAndSound view={view} token="t" language="en" onOnMyWay={() => {}} sending={false} online />
      </StrictMode>,
    ),
  );
const radios = () => [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
const submit = () => [...container.querySelectorAll("button")].find((b) => b.textContent === s.submit);
const pick = (n: number) => act(() => radios().find((r) => r.value === String(n))?.click());
const heading = () => container.querySelector("#status-heading");

beforeEach(() => {
  vi.mocked(submitSurvey).mockReset().mockResolvedValue("saved");
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("StatusAndSound with the survey", () => {
  it("says thank you and moves focus to the status heading after a save, also if the read did not come back", async () => {
    show(arrived);
    pick(8);
    submit()?.focus();
    // The view does not change: the read after the save failed, so surveyDone is still false.
    await act(async () => submit()?.click());
    expect(container.textContent).toContain(s.thanks);
    expect(radios()).toHaveLength(0);
    expect(heading()).not.toBeNull();
    expect(document.activeElement).toBe(heading());
  });

  it("moves focus to the status heading when a staff Undo takes the focused survey away", () => {
    show(arrived);
    radios()[5].focus();
    show(undone);
    expect(radios()).toHaveLength(0);
    expect(document.activeElement).toBe(heading());
  });

  it("starts an empty form after an Undo and a second arrival, with no old score or old error", async () => {
    vi.mocked(submitSurvey).mockResolvedValue("not_saved");
    show(arrived);
    pick(5);
    await act(async () => submit()?.click());
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    show(undone);
    show(arrived);
    expect(radios()).toHaveLength(11);
    expect(radios().some((r) => r.checked)).toBe(false);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
