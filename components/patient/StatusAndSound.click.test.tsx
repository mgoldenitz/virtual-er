// @vitest-environment happy-dom
// Checks the "I'm still here" prompt inside StatusAndSound: when staff recall the patient while
// focus is on the prompt's button, the prompt leaves, and focus must go to the status heading.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import { playAlert, stopVibration, unlockSound } from "./alertSound";
import { StatusAndSound } from "./StatusAndSound";

// The tap's save, the clock and the sound player are replaced, so each test controls them.
vi.mock("@/data/patientVisit", () => ({
  recordStillHere: vi.fn().mockResolvedValue("saved"),
  submitSurvey: vi.fn().mockResolvedValue("saved"),
}));
const NOW = new Date("2026-11-16T12:00:00Z");
vi.mock("@/components/useNow", () => ({ useNow: () => NOW }));
vi.mock("./alertSound", () => ({ unlockSound: vi.fn(), playAlert: vi.fn(), stopVibration: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const t = textFor("en");

// Triaged 31 minutes ago and never tapped, so the prompt is due.
const waiting: PatientView = {
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
// The same visit after staff recall it.
const called: PatientView = { ...waiting, status: "called", placeInLine: null, calledAt: "2026-11-16T12:00:00Z" };

let container: HTMLDivElement;
let root: Root;

const show = (view: PatientView) =>
  act(() =>
    root.render(<StatusAndSound view={view} token="t" language="en" onOnMyWay={() => {}} sending={false} online />),
  );
const button = (words: string) => [...container.querySelectorAll("button")].find((b) => b.textContent === words);

beforeEach(() => {
  vi.mocked(unlockSound).mockReset().mockResolvedValue(true);
  vi.mocked(playAlert).mockReset().mockReturnValue(new Promise(() => {}));
  vi.mocked(stopVibration).mockReset();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("StatusAndSound with the I'm still here prompt", () => {
  it("moves focus to the status heading when a recall takes the focused prompt away", () => {
    show(waiting);
    const stillHere = button(t.stillHere.button);
    expect(stillHere).toBeDefined();
    stillHere?.focus();
    show(called);
    expect(button(t.stillHere.button)).toBeUndefined();
    const heading = container.querySelector("#status-heading");
    expect(heading?.textContent).toBe(t.patient.calledHeading);
    expect(document.activeElement).toBe(heading);
  });

  it("moves focus to the status heading when staff Undo the arrival while focus is in the survey", () => {
    const arrived: PatientView = { ...called, status: "arrived", closed: true, seen: true };
    show(arrived);
    const radio = container.querySelector<HTMLInputElement>('input[name="survey-score"]');
    expect(radio).not.toBeNull();
    radio?.focus();
    show({ ...called, status: "on_the_way" });
    expect(container.querySelector('input[name="survey-score"]')).toBeNull();
    expect(document.activeElement).toBe(container.querySelector("#status-heading"));
  });

  it("starts the survey empty when the visit's token changes, so a picked score does not carry over", () => {
    const arrived: PatientView = { ...called, status: "arrived", closed: true, seen: true };
    show(arrived);
    const eight = container.querySelector<HTMLInputElement>('input[name="survey-score"][value="8"]');
    act(() => eight?.click());
    expect(eight?.checked).toBe(true);
    act(() =>
      root.render(<StatusAndSound view={arrived} token="B" language="en" onOnMyWay={() => {}} sending={false} online />),
    );
    const checked = [...container.querySelectorAll<HTMLInputElement>('input[name="survey-score"]')].filter((r) => r.checked);
    expect(checked).toHaveLength(0);
  });

  // Gemini review of the Phase 5 fixes, point 5a (2026-11-21): a failed tap on one visit's link
  // must not show its alert on the visit of a new link.
  it("drops the still-here did-not-save alert when the visit's token changes", async () => {
    const { recordStillHere } = await import("@/data/patientVisit");
    vi.mocked(recordStillHere).mockResolvedValueOnce("not_saved");
    show(waiting);
    await act(async () => button(t.stillHere.button)?.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(t.stillHere.notSaved);
    act(() =>
      root.render(<StatusAndSound view={waiting} token="B" language="en" onOnMyWay={() => {}} sending={false} online />),
    );
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });
});
