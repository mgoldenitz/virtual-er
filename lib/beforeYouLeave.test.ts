// Checks when the patient screen shows "Before you leave": only while the visit waits off-site.

import { describe, expect, it } from "vitest";
import { beforeYouLeaveShows } from "./beforeYouLeave";
import type { PatientView } from "./patientView";
import type { VisitStatus } from "./visit";

const view: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  placeInLine: 3,
  waitLow: 40,
  waitHigh: 60,
  calledAt: null,
  lastStillHereAt: null,
  offeredAt: null,
  triagedAt: "2026-11-22T18:00:00Z",
  seen: false,
  closed: false,
  expired: false,
  surveyDone: false,
};

describe("beforeYouLeaveShows", () => {
  it("shows while the visit is waiting off-site", () => {
    expect(beforeYouLeaveShows(view)).toBe(true);
  });

  it.each<VisitStatus>([
    "pre_arrival",
    "called",
    "on_the_way",
    "arrived",
    "needs_reassessment",
    "declined",
    "not_eligible",
    "unable_to_reach",
    "removed",
  ])("does not show for %s", (status) => {
    expect(beforeYouLeaveShows({ ...view, status })).toBe(false);
  });

  it("does not show for an expired visit", () => {
    expect(beforeYouLeaveShows({ ...view, expired: true })).toBe(false);
  });
});
