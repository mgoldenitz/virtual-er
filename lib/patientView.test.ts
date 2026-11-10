import { describe, expect, it } from "vitest";
import { patientViewFor } from "./patientView";
import { callBack, checkInAtDesk, startFromHome } from "./visitActions";

const now = new Date("2026-11-09T20:00:00Z");
const make = (id: string, minutes: number) =>
  checkInAtDesk(
    { id, code: `CODE${id}`, access_token: `TOKEN${id}`, site: "A", ctas_level: 5, language: "en" },
    "waiting",
    new Date(now.getTime() + minutes * 60_000),
  );

describe("patient view", () => {
  it("returns null for an unknown token", () => {
    expect(patientViewFor([make("1", 0)], "nope", now)).toBeNull();
  });

  it("does not open a visit by its short code", () => {
    expect(patientViewFor([make("1", 0)], "CODE1", now)).toBeNull();
  });

  it("shows place and wait range while waiting", () => {
    const visits = [make("1", 0), make("2", 5)];
    const view = patientViewFor(visits, "TOKEN2", now)!;
    expect(view.placeInLine).toBe(2);
    expect(view.waitLow).toBe(20);
    expect(view.waitHigh).toBe(40);
  });

  it("leaves out staff-only fields", () => {
    const view = patientViewFor([make("1", 0)], "TOKEN1", now)!;
    const keys = Object.keys(view);
    for (const hidden of ["access_token", "ctas_level", "phone_attempts", "removed_reason", "id"]) {
      expect(keys).not.toContain(hidden);
    }
  });

  it("has no place once called", () => {
    const view = patientViewFor([callBack(make("1", 0), now)!], "TOKEN1", now)!;
    expect(view.status).toBe("called");
    expect(view.placeInLine).toBeNull();
    expect(view.calledAt).toBe(now.toISOString());
  });

  it("marks a home visit expired once it is 6 hours old and still not triaged", () => {
    const start = new Date(now.getTime() - 6 * 3_600_000);
    const home = startFromHome({ id: "h", code: "HOME", access_token: "TOKENH", site: "A", language: "en" }, start);
    expect(patientViewFor([home], "TOKENH", new Date(now.getTime() - 60_000))!.expired).toBe(false);
    expect(patientViewFor([home], "TOKENH", now)!.expired).toBe(true);
    expect(patientViewFor([make("1", 0)], "TOKEN1", new Date(now.getTime() + 7 * 3_600_000))!.expired).toBe(false);
  });
});
