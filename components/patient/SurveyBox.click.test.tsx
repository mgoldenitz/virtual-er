// @vitest-environment happy-dom
// The survey on the "Ready at the desk" screen: pick a score from 0 to 10, then Submit.
// The save is replaced, so each test controls its answer.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { submitSurvey } from "@/data/patientVisit";
import type { PatientView } from "@/lib/patientView";
import { textFor } from "@/lib/text";
import { SurveyBox } from "./SurveyBox";

vi.mock("@/data/patientVisit", () => ({ submitSurvey: vi.fn().mockResolvedValue("saved") }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const s = textFor("en").survey;

const arrived: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "arrived",
  placeInLine: null,
  waitLow: null,
  waitHigh: null,
  calledAt: "2026-11-20T11:00:00Z",
  lastStillHereAt: null,
  triagedAt: "2026-11-20T10:00:00Z",
  seen: true,
  closed: true,
  expired: false,
  surveyDone: false,
};

let container: HTMLDivElement;
let root: Root;

function show(view: PatientView) {
  act(() => root.render(<SurveyBox view={view} token="t" language="en" />));
}

const radios = () => [...container.querySelectorAll<HTMLInputElement>('input[type="radio"]')];
const submit = () => [...container.querySelectorAll("button")].find((b) => b.textContent === s.submit);
const pick = (n: number) => act(() => radios().find((r) => r.value === String(n))?.click());

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(submitSurvey).mockClear();
  vi.mocked(submitSurvey).mockResolvedValue("saved");
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("SurveyBox", () => {
  it("names the group of 11 scores with the SPEC question", () => {
    show(arrived);
    expect(container.querySelector("fieldset legend")?.textContent).toBe(s.question);
    expect(radios().map((r) => r.value)).toEqual(["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
    expect(container.textContent).toContain(s.low);
    expect(container.textContent).toContain(s.high);
    expect(container.textContent).toContain(s.note);
  });

  it("sends nothing when Submit is pressed with no score picked", async () => {
    show(arrived);
    await act(async () => submit()?.click());
    expect(submitSurvey).not.toHaveBeenCalled();
  });

  it("sends the picked score with the token", async () => {
    show(arrived);
    pick(8);
    await act(async () => submit()?.click());
    expect(submitSurvey).toHaveBeenCalledWith("t", 8);
  });

  it("sends the last score picked when the patient changes it", async () => {
    show(arrived);
    pick(3);
    pick(9);
    await act(async () => submit()?.click());
    expect(submitSurvey).toHaveBeenCalledWith("t", 9);
  });

  it.each(["refused", "not_saved"] as const)("shows the survey's not-saved line when the answer is %s", async (answer) => {
    vi.mocked(submitSurvey).mockResolvedValue(answer);
    show(arrived);
    pick(5);
    await act(async () => submit()?.click());
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(s.notSaved);
    expect(radios()).toHaveLength(11);
  });

  it("shows the thank-you and no scores once the score is saved", () => {
    show({ ...arrived, surveyDone: true });
    expect(container.textContent).toContain(s.thanks);
    expect(radios()).toHaveLength(0);
    expect(submit()).toBeUndefined();
  });

  it("shows nothing for a visit that is not arrived and closed", () => {
    show({ ...arrived, status: "on_the_way", closed: false });
    expect(container.textContent).toBe("");
  });
});
