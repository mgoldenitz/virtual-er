import { describe, expect, it } from "vitest";
import { parseVisits } from "./parseVisits";
import { checkInAtDesk } from "./visitActions";

const good = checkInAtDesk(
  { id: "v1", code: "ABC234", access_token: "T", site: "A", ctas_level: 4, language: "en" },
  "waiting",
  new Date(Date.UTC(2026, 10, 9, 20, 0)),
);

describe("reading saved visits", () => {
  it("reads a normal saved list", () => {
    expect(parseVisits(JSON.stringify([good]))).toEqual([good]);
  });

  it("treats nothing saved, broken text, null and non-lists as an empty list", () => {
    for (const raw of [null, "", "{not json", "null", "{}", "42", '"text"']) {
      expect(parseVisits(raw)).toEqual([]);
    }
  });

  it("skips entries that are not visits instead of crashing", () => {
    const raw = JSON.stringify([null, 7, { id: "x" }, { ...good, status: "made_up" }, { ...good, triaged_at: 5 }, good]);
    expect(parseVisits(raw)).toEqual([good]);
  });
});
