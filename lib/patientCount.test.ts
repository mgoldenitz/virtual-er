import { describe, expect, it } from "vitest";
import { patientCount } from "./patientCount";

describe("patientCount", () => {
  it("says patient for one and patients otherwise", () => {
    expect(patientCount(1)).toBe("1 patient");
    expect(patientCount(0)).toBe("0 patients");
    expect(patientCount(3)).toBe("3 patients");
  });
});
