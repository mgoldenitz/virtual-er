import { describe, expect, it } from "vitest";
import { averageMinutes, averageScore, share } from "./dashboardShare";

describe("share", () => {
  it("gives the whole percentage", () => {
    expect(share(8, 10)).toBe(80);
    expect(share(10, 10)).toBe(100);
    expect(share(0, 4)).toBe(0);
  });

  it("rounds to the nearest whole percent", () => {
    expect(share(1, 3)).toBe(33);
    expect(share(2, 3)).toBe(67);
  });

  it("gives null when the bottom number is 0", () => {
    expect(share(0, 0)).toBeNull();
  });
});

describe("averageMinutes", () => {
  it("gives whole minutes", () => {
    expect(averageMinutes(840, 1)).toBe(14);
    expect(averageMinutes(1_500, 2)).toBe(13); // 12.5 minutes rounds up
  });

  it("gives null with no visits", () => {
    expect(averageMinutes(0, 0)).toBeNull();
  });
});

describe("averageScore", () => {
  it("gives one decimal place", () => {
    expect(averageScore(17, 2)).toBe(8.5);
    expect(averageScore(20, 3)).toBe(6.7);
  });

  it("gives null with no responses", () => {
    expect(averageScore(0, 0)).toBeNull();
  });
});
