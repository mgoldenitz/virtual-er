import { describe, expect, it } from "vitest";
import type { PatientView } from "./patientView";
import { startPageState } from "./startPage";

const view = (over: Partial<PatientView>): PatientView => ({
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  placeInLine: 1,
  waitLow: 0,
  waitHigh: 20,
  calledAt: null,
  lastStillHereAt: null,
  offeredAt: null,
  triagedAt: null,
  seen: false,
  closed: false,
  expired: false,
  surveyDone: false,
  ...over,
});

describe("start page state", () => {
  it("waits while the browser loads", () => {
    expect(startPageState(undefined)).toBe("loading");
  });

  it("offers a new visit when this phone has none", () => {
    expect(startPageState(null)).toBe("start");
  });

  it("never offers a second visit when the saved one cannot be read", () => {
    expect(startPageState("unavailable")).toBe("unavailable");
  });

  it("opens an open visit", () => {
    expect(startPageState(view({}))).toBe("open");
    expect(startPageState(view({ status: "pre_arrival", placeInLine: null }))).toBe("open");
  });

  it("explains an expired home visit", () => {
    expect(startPageState(view({ status: "pre_arrival", expired: true }))).toBe("expired");
  });

  it("shows a closed visit first, since the patient may still be in the department", () => {
    for (const status of ["declined", "not_eligible", "arrived", "removed"] as const) {
      expect(startPageState(view({ status, closed: true }))).toBe("closed");
    }
  });
});
