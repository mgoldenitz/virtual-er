// Checks when the token on this phone no longer opens any visit (for example after staff
// used "Issue a new link"), so the phone forgets it and says the link did not work.

import { describe, expect, it } from "vitest";
import { isDeadToken } from "./deadToken";
import type { PatientView } from "./patientView";

const view: PatientView = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  placeInLine: 1,
  waitLow: 0,
  waitHigh: 20,
  calledAt: null,
  lastStillHereAt: null,
  triagedAt: null,
  seen: false,
  closed: false,
  expired: false,
};

describe("isDeadToken", () => {
  it("is dead when there is a token and the database found no visit for it", () => {
    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", null)).toBe(true);
  });

  it("is not dead while the visit is still loading or could not be read", () => {
    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", undefined)).toBe(false);
    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", "unavailable")).toBe(false);
  });

  it("is not dead when the visit was found", () => {
    expect(isDeadToken("ABCDEFGHJKMNPQRSTVWXYZ2345", view)).toBe(false);
  });

  it("is not dead when the phone has no token at all", () => {
    expect(isDeadToken(null, null)).toBe(false);
    expect(isDeadToken(undefined, null)).toBe(false);
  });
});
