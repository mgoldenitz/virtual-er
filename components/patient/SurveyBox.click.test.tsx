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

// The faults found in the Gemini Hydrogen 4 review (handoffs/archive/2026-11-20-gemini-review-survey.md).
describe("SurveyBox after the Gemini review", () => {
  const onSaved = vi.fn();
  const onFocusLost = vi.fn();
  function showWith(view: PatientView, saved = false) {
    act(() =>
      root.render(
        <SurveyBox view={view} token="t" language="en" saved={saved} onSaved={onSaved} onFocusLost={onFocusLost} />,
      ),
    );
  }
  beforeEach(() => {
    onSaved.mockClear();
    onFocusLost.mockClear();
  });

  // Owner decision 2026-11-21. aria-disabled, not disabled, so a button with focus keeps it.
  it("makes Submit look off until a score is picked, and never uses the disabled attribute", () => {
    showWith(arrived);
    expect(submit()?.getAttribute("aria-disabled")).toBe("true");
    expect(submit()?.hasAttribute("disabled")).toBe(false);
    pick(4);
    expect(submit()?.getAttribute("aria-disabled")).not.toBe("true");
  });

  it("keeps the disabled attribute off while the score is sending", async () => {
    vi.mocked(submitSurvey).mockReturnValue(new Promise(() => {}));
    showWith(arrived);
    pick(4);
    await act(async () => submit()?.click());
    expect(submit()?.hasAttribute("disabled")).toBe(false);
    expect(submit()?.getAttribute("aria-disabled")).toBe("true");
  });

  it.each([0, 10])("sends the edge score %s", async (n) => {
    showWith(arrived);
    pick(n);
    await act(async () => submit()?.click());
    expect(submitSurvey).toHaveBeenCalledWith("t", n);
  });

  it("takes the not-saved line away at a new Submit, so a second failure is announced again", async () => {
    vi.mocked(submitSurvey).mockResolvedValue("not_saved");
    showWith(arrived);
    pick(5);
    await act(async () => submit()?.click());
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    let answer: (r: "not_saved") => void = () => {};
    vi.mocked(submitSurvey).mockReturnValue(new Promise((r) => (answer = r)));
    await act(async () => submit()?.click());
    expect(container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => answer("not_saved"));
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(s.notSaved);
  });

  it("takes the not-saved line away when the patient picks a new score", async () => {
    vi.mocked(submitSurvey).mockResolvedValue("not_saved");
    showWith(arrived);
    pick(5);
    await act(async () => submit()?.click());
    pick(6);
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("shows the 0 and 10 words before the scores and names them on the group", () => {
    showWith(arrived);
    const ids = container.querySelector("fieldset")?.getAttribute("aria-describedby")?.split(" ") ?? [];
    const words = ids.map((id) => document.getElementById(id));
    expect(words.map((w) => w?.textContent)).toEqual([s.low, s.high]);
    const [low] = words;
    const [firstRadio] = radios();
    if (!low || !firstRadio) throw new Error("the low word or the first radio is missing");
    expect(low.compareDocumentPosition(firstRadio) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("sends one time when Submit is pressed twice quickly", async () => {
    showWith(arrived);
    pick(7);
    await act(async () => {
      submit()?.click();
      submit()?.click();
    });
    expect(submitSurvey).toHaveBeenCalledTimes(1);
  });

  it("reports the save, so the thank-you can show before the read is back", async () => {
    showWith(arrived);
    pick(7);
    await act(async () => submit()?.click());
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("says thank you when this phone saved the score, also if the read still says not done", () => {
    showWith(arrived, true);
    expect(container.textContent).toContain(s.thanks);
    expect(radios()).toHaveLength(0);
  });

  it("reports lost focus when an Undo takes the form away with focus inside it", () => {
    showWith(arrived);
    radios()[3].focus();
    showWith({ ...arrived, status: "on_the_way", closed: false });
    expect(onFocusLost).toHaveBeenCalledTimes(1);
  });
});
