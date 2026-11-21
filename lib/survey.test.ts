import { describe, expect, it } from "vitest";
import type { PatientView } from "./patientView";
import { isSurveyScore, surveyStep } from "./survey";
import type { VisitStatus } from "./visit";

// Staff marked the patient arrived: the visit is closed and no score is saved yet.
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

describe("which survey step the patient sees (SPEC line 69, hard rule 5)", () => {
  it("asks the question when the visit arrived, is closed and has no score", () => {
    expect(surveyStep(arrived)).toBe("ask");
  });

  it("says thank you when the score is already saved", () => {
    expect(surveyStep({ ...arrived, surveyDone: true })).toBe("thanks");
  });

  it("says thank you when this phone saved the score, before the next read shows it", () => {
    expect(surveyStep(arrived, true)).toBe("thanks");
  });

  it("shows nothing after an Undo, also when this phone saved the score", () => {
    expect(surveyStep({ ...arrived, status: "on_the_way", closed: false }, true)).toBeNull();
  });

  it("shows nothing for an arrived visit that is not closed", () => {
    expect(surveyStep({ ...arrived, closed: false })).toBeNull();
  });

  const others: VisitStatus[] = [
    "pre_arrival",
    "waiting",
    "called",
    "on_the_way",
    "unable_to_reach",
    "needs_reassessment",
    "removed",
    "declined",
    "not_eligible",
  ];
  it.each(others)("shows nothing for a %s visit, closed or not, done or not", (status) => {
    expect(surveyStep({ ...arrived, status })).toBeNull();
    expect(surveyStep({ ...arrived, status, closed: false })).toBeNull();
    expect(surveyStep({ ...arrived, status, surveyDone: true })).toBeNull();
  });
});

describe("a survey score", () => {
  it.each([0, 1, 5, 9, 10])("accepts %s", (n) => {
    expect(isSurveyScore(n)).toBe(true);
  });

  it.each([-1, 11, 7.5, Number.NaN, Number.POSITIVE_INFINITY])("refuses %s", (n) => {
    expect(isSurveyScore(n)).toBe(false);
  });
});
