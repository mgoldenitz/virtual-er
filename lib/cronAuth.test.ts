import { describe, expect, it } from "vitest";
import { isCronRequest } from "./cronAuth";

const SECRET = "a-long-random-secret-value-for-tests";

describe("isCronRequest", () => {
  it("accepts Vercel's header with the right secret", () => {
    expect(isCronRequest(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("refuses a missing or wrong header", () => {
    expect(isCronRequest(null, SECRET)).toBe(false);
    expect(isCronRequest("", SECRET)).toBe(false);
    expect(isCronRequest(`Bearer ${SECRET}x`, SECRET)).toBe(false);
    expect(isCronRequest(SECRET, SECRET)).toBe(false);
  });

  it("refuses everything when no secret is set, so the job is never open to anyone", () => {
    expect(isCronRequest("Bearer ", "")).toBe(false);
    expect(isCronRequest("Bearer undefined", undefined)).toBe(false);
  });
});
