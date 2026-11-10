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
    expect(parseVisits(JSON.stringify([good]))).toEqual({ visits: [good], damaged: [], unreadable: false });
  });

  it("treats nothing saved as an empty list", () => {
    expect(parseVisits(null)).toEqual({ visits: [], damaged: [], unreadable: false });
    expect(parseVisits("")).toEqual({ visits: [], damaged: [], unreadable: false });
  });

  it("reports broken text and non-lists as unreadable", () => {
    for (const raw of ["{not json", "null", "{}", "42", '"text"']) {
      expect(parseVisits(raw)).toEqual({ visits: [], damaged: [], unreadable: true });
    }
  });

  it("sets aside damaged entries, counts them, and keeps the good ones", () => {
    const bad = [
      null,
      7,
      { id: "x" },
      { ...good, status: "made_up" },
      { ...good, triaged_at: 5 },
      { ...good, ctas_level: { level: 4 } },
      { ...good, ctas_level: 3 },
      { ...good, called_at: "not a date" },
      { ...good, created_at: null },
      { ...good, source: "phone" },
      { ...good, phone_attempts: "2" },
      { ...good, survey_score: 11 },
      { ...good, is_demo: "no" },
      { ...good, removed_reason: "bored" },
    ];
    const result = parseVisits(JSON.stringify([...bad, good]));
    expect(result.visits).toEqual([good]);
    expect(result.damaged).toHaveLength(bad.length);
    expect(result.unreadable).toBe(false);
  });
});
