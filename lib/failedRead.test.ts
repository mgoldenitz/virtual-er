import { describe, expect, it } from "vitest";
import { afterFailedRead } from "./failedRead";
import type { PatientView } from "./patientView";

const view = { code: "ABC234", status: "waiting" } as PatientView;

describe("after a failed read of the patient's visit", () => {
  it("says unavailable, never 'no visit', when nothing has loaded yet", () => {
    expect(afterFailedRead(undefined, 1)).toBe("unavailable");
  });

  it("keeps the last view through one failed read", () => {
    expect(afterFailedRead(view, 1)).toBe(view);
    expect(afterFailedRead(null, 1)).toBeNull();
  });

  it("says unavailable after two failed reads in a row", () => {
    expect(afterFailedRead(view, 2)).toBe("unavailable");
    expect(afterFailedRead(null, 2)).toBe("unavailable");
  });

  it("stays unavailable while reads keep failing", () => {
    expect(afterFailedRead("unavailable", 3)).toBe("unavailable");
  });
});
