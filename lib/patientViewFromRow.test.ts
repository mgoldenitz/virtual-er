import { describe, expect, it } from "vitest";
import { patientViewFromRow, type PatientVisitRow } from "./patientViewFromRow";

const waiting: PatientVisitRow = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  place_in_line: 2,
  average_gap_minutes: null,
  called_at: null,
  last_still_here_at: null,
  seen: false,
  closed: false,
  expired: false,
};

describe("patient view from a database row", () => {
  it("passes the triage time through, and is empty before the database change has run", () => {
    expect(patientViewFromRow({ ...waiting, triaged_at: "2026-11-10T12:00:00Z" }).triagedAt).toBe(
      "2026-11-10T12:00:00Z",
    );
    expect(patientViewFromRow(waiting).triagedAt).toBeNull();
  });

  it("passes survey done through, and is false before the database change has run", () => {
    expect(patientViewFromRow({ ...waiting, status: "arrived", closed: true, survey_done: true }).surveyDone).toBe(true);
    expect(patientViewFromRow({ ...waiting, survey_done: false }).surveyDone).toBe(false);
    expect(patientViewFromRow(waiting).surveyDone).toBe(false);
  });

  it("uses the 15-minute default gap until there is call-back history", () => {
    const view = patientViewFromRow(waiting);
    expect(view.placeInLine).toBe(2);
    expect(view.waitLow).toBe(20);
    expect(view.waitHigh).toBe(40);
  });

  it("uses the site's average gap when the database sends one", () => {
    const view = patientViewFromRow({ ...waiting, average_gap_minutes: 10 });
    expect(view.waitLow).toBe(15);
    expect(view.waitHigh).toBe(25);
  });

  // Changed on purpose on 2026-11-16 (was "never uses a gap under 1 minute"): the floor is now 5 minutes per place.
  it("never uses a gap under 5 minutes", () => {
    const view = patientViewFromRow({ ...waiting, place_in_line: 3, average_gap_minutes: 2 });
    expect(view.waitLow).toBe(10);
    expect(view.waitHigh).toBe(20);
  });

  it("has no place or wait range once called", () => {
    const view = patientViewFromRow({
      ...waiting,
      status: "called",
      place_in_line: null,
      called_at: "2026-11-10T20:00:00+00:00",
      seen: true,
    });
    expect(view.status).toBe("called");
    expect(view.placeInLine).toBeNull();
    expect(view.waitLow).toBeNull();
    expect(view.waitHigh).toBeNull();
    expect(view.calledAt).toBe("2026-11-10T20:00:00+00:00");
    expect(view.seen).toBe(true);
  });

  it("passes on closed and expired", () => {
    expect(patientViewFromRow({ ...waiting, status: "arrived", place_in_line: null, closed: true }).closed).toBe(true);
    expect(patientViewFromRow({ ...waiting, status: "pre_arrival", place_in_line: null, expired: true }).expired).toBe(true);
  });

  it("returns only the patient-safe fields, even if the row carried more", () => {
    const extra = { ...waiting, access_token: "secret", ctas_level: 5, id: "1" } as PatientVisitRow;
    const keys = Object.keys(patientViewFromRow(extra));
    for (const hidden of ["access_token", "ctas_level", "id"]) expect(keys).not.toContain(hidden);
  });
});
