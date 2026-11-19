import { describe, expect, it } from "vitest";
import { visitCount } from "./visitCount";

describe("visitCount", () => {
  it("uses the singular for exactly 1", () => {
    expect(visitCount(1)).toBe("1 visit");
  });

  it("uses the plural for 0 and for more than 1", () => {
    expect(visitCount(0)).toBe("0 visits");
    expect(visitCount(5)).toBe("5 visits");
  });
});
