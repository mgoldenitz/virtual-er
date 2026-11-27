// Checks that each patient status card gets its own colour and icon, and that an expired visit is grey.

import { describe, expect, it } from "vitest";
import type { PatientView } from "@/lib/patientView";
import { statusLook } from "./statusLook";

describe("statusLook", () => {
  it.each([
    ["arrived", "border-green-800", "check"],
    ["pre_arrival", "border-brand", "home"],
    ["needs_reassessment", "border-wait-edge", "alert"],
    ["declined", "border-onsite-edge", "building"],
    ["not_eligible", "border-onsite-edge", "building"],
    ["unable_to_reach", "border-gone-edge", "phone"],
    ["removed", "border-gone-edge", "x"],
    ["ended", "border-control", "flag"],
  ] as const)("%s gets %s and the %s icon", (status, border, icon) => {
    // "ended" is not a real status: it stands for any status the switch has no case for.
    const look = statusLook(status as PatientView["status"], false);
    expect(look.card).toContain(border);
    expect(look.icon).toBe(icon);
  });

  it("gives an expired visit the grey card and the clock, whatever its status", () => {
    const look = statusLook("arrived", true);
    expect(look.card).toContain("border-control");
    expect(look.icon).toBe("clock");
  });
});
