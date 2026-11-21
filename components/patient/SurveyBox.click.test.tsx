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
const p = textFor("en").patient;

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
  offeredAt: null,
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
// Found by its type, because its words change to "Sending…" while the save runs.
const submit = () => container.querySelector<HTMLButtonElement>('button[type="submit"]') ?? undefined;
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
    expect(submit()?.textContent).toBe(s.submit);
  });

  it("puts the 0 and 10 labels before the scores, so a screen reader reads them first", () => {
    show(arrived);
    const id = container.querySelector("fieldset")?.getAttribute("aria-describedby") ?? "";
    const scale = document.getElementById(id);
    const first = radios()[0];
    expect(scale && first && scale.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sends nothing when Submit is pressed with no score picked", async () => {
    show(arrived);
    await act(async () => submit()?.click());
    expect(submitSurvey).not.toHaveBeenCalled();
    expect(submit()?.getAttribute("aria-disabled")).toBe("true");
  });

  it("grays out Submit until a score is picked, and keeps it a real button", () => {
    show(arrived);
    expect(submit()?.hasAttribute("disabled")).toBe(false);
    pick(4);
    expect(submit()?.getAttribute("aria-disabled")).toBe("false");
  });

  it("ties the 0 and 10 labels to the group of scores", () => {
    show(arrived);
    const id = container.querySelector("fieldset")?.getAttribute("aria-describedby");
    expect(id).toBeTruthy();
    const scale = document.getElementById(id ?? "");
    expect(scale?.textContent).toContain(s.low);
    expect(scale?.textContent).toContain(s.high);
  });

  it("says thank you and moves focus to it when the save worked, before the next read shows it", async () => {
    show(arrived);
    pick(8);
    await act(async () => submit()?.click());
    const thanks = [...container.querySelectorAll('[role="status"]')].find((p) => p.textContent === s.thanks);
    expect(thanks).toBeDefined();
    expect(document.activeElement).toBe(thanks);
    expect(radios()).toHaveLength(0);
  });

  it("does not move focus to a thank-you that was already there", () => {
    show({ ...arrived, surveyDone: true });
    expect(document.activeElement).toBe(document.body);
  });

  it("shows a new alert for a second failed save, so it is read out again", async () => {
    vi.mocked(submitSurvey).mockResolvedValue("not_saved");
    show(arrived);
    pick(5);
    await act(async () => submit()?.click());
    const first = container.querySelector('[role="alert"]');
    await act(async () => submit()?.click());
    const second = container.querySelector('[role="alert"]');
    expect(second?.textContent).toBe(s.notSaved);
    expect(second).not.toBe(first);
  });

  it("starts empty after an Undo and a second arrival", async () => {
    vi.mocked(submitSurvey).mockResolvedValue("not_saved");
    show(arrived);
    pick(5);
    await act(async () => submit()?.click());
    show({ ...arrived, status: "on_the_way", closed: false });
    show(arrived);
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(radios().some((r) => r.checked)).toBe(false);
  });

  it("sends once when Submit is pressed twice while the first save runs", async () => {
    let finish: (answer: "saved") => void = () => {};
    vi.mocked(submitSurvey).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    show(arrived);
    pick(6);
    act(() => submit()?.click());
    expect(submit()?.getAttribute("aria-disabled")).toBe("true");
    expect(submit()?.textContent).toBe(p.sending);
    act(() => submit()?.click());
    await act(async () => finish("saved"));
    expect(submitSurvey).toHaveBeenCalledTimes(1);
  });

  it("moves focus to the thank-you also when the re-read shows the score before the save answers", async () => {
    let finish: (answer: "saved") => void = () => {};
    vi.mocked(submitSurvey).mockReturnValue(new Promise((resolve) => (finish = resolve)));
    show(arrived);
    pick(6);
    submit()?.focus();
    act(() => submit()?.click());
    show({ ...arrived, surveyDone: true });
    await act(async () => finish("saved"));
    const thanks = [...container.querySelectorAll('[role="status"]')].find((el) => el.textContent === s.thanks);
    expect(document.activeElement).toBe(thanks);
  });

  it("sends a score of 0", async () => {
    show(arrived);
    pick(0);
    await act(async () => submit()?.click());
    expect(submitSurvey).toHaveBeenCalledWith("t", 0);
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
