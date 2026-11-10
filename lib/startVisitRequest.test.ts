import { describe, expect, it } from "vitest";
import { parseStartVisitRequest } from "./startVisitRequest";

describe("start-a-visit request", () => {
  it("accepts a known site and language", () => {
    expect(parseStartVisitRequest({ site: "A", language: "en" })).toEqual({ site: "A", language: "en" });
    expect(parseStartVisitRequest({ site: "B", language: "en" })).toEqual({ site: "B", language: "en" });
  });

  it("refuses an unknown site or language", () => {
    expect(parseStartVisitRequest({ site: "C", language: "en" })).toBeNull();
    expect(parseStartVisitRequest({ site: "a", language: "en" })).toBeNull();
    expect(parseStartVisitRequest({ site: "A", language: "xx" })).toBeNull();
    expect(parseStartVisitRequest({ site: "A" })).toBeNull();
    expect(parseStartVisitRequest({ site: "A", language: 5 })).toBeNull();
  });

  it("refuses anything that is not an object", () => {
    for (const body of [null, undefined, "A", 7, ["A", "en"]]) {
      expect(parseStartVisitRequest(body)).toBeNull();
    }
  });

  it("drops every other field, so the browser cannot set the status, source, code or token", () => {
    const parsed = parseStartVisitRequest({
      site: "A",
      language: "en",
      status: "waiting",
      source: "desk",
      code: "ABC234",
      access_token: "X",
      triaged_at: "2026-11-10T00:00:00Z",
    });
    expect(parsed).toEqual({ site: "A", language: "en" });
  });
});
