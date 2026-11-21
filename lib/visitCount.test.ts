import { describe, expect, it } from "vitest";
import { responseCount, visitCount } from "./visitCount";

describe("visitCount", () => {
  it("uses the singular for exactly 1", () => {
    expect(visitCount(1)).toBe("1 visit");
  });

  it("uses the plural for 0 and for more than 1", () => {
    expect(visitCount(0)).toBe("0 visits");
    expect(visitCount(5)).toBe("5 visits");
  });
});

describe("responseCount", () => {
  it("says 1 response, and 0 or 4 responses", () => {
    expect(responseCount(1)).toBe("1 response");
    expect(responseCount(0)).toBe("0 responses");
    expect(responseCount(4)).toBe("4 responses");
  });
});
