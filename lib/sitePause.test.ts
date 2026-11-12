// Checks how the pause switch is read from database rows and from the server's answer.

import { describe, expect, it } from "vitest";
import { parseSitePauses, sitePausesFromRows } from "./sitePause";

describe("sitePausesFromRows", () => {
  it("reads both sites", () => {
    expect(
      sitePausesFromRows([
        { site: "A", offsite_paused: true },
        { site: "B", offsite_paused: false },
      ]),
    ).toEqual({ A: true, B: false });
  });

  it("refuses a missing site or a wrong value", () => {
    expect(sitePausesFromRows([{ site: "A", offsite_paused: true }])).toBeNull();
    expect(sitePausesFromRows([{ site: "A", offsite_paused: "yes" }, { site: "B", offsite_paused: false }])).toBeNull();
    expect(sitePausesFromRows(null)).toBeNull();
  });
});

describe("parseSitePauses", () => {
  it("accepts only { A: boolean, B: boolean }", () => {
    expect(parseSitePauses({ A: false, B: true })).toEqual({ A: false, B: true });
    expect(parseSitePauses({ A: false })).toBeNull();
    expect(parseSitePauses({ A: "false", B: true })).toBeNull();
    expect(parseSitePauses(null)).toBeNull();
  });
});
