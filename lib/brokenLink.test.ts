import { describe, expect, it } from "vitest";
import { brokenLinkAfterRead } from "./brokenLink";

const DAMAGED = { token: null, brokenLink: true };
const GOOD = { token: "good-token", brokenLink: false };
const NOTHING = { token: null, brokenLink: false };

describe("brokenLinkAfterRead", () => {
  it("a damaged link shows the broken-link screen", () => {
    expect(brokenLinkAfterRead(false, DAMAGED)).toBe(true);
  });

  it("a good link after a damaged one hides the broken-link screen", () => {
    expect(brokenLinkAfterRead(true, GOOD)).toBe(false);
  });

  it("a saved visit with no link does not show the broken-link screen", () => {
    expect(brokenLinkAfterRead(false, GOOD)).toBe(false);
  });

  it("a first read on a phone with nothing saved does not show the broken-link screen", () => {
    expect(brokenLinkAfterRead(false, NOTHING)).toBe(false);
  });

  it("a second read with no link after a damaged link keeps the broken-link screen (React dev runs the effect two times)", () => {
    const first = brokenLinkAfterRead(false, DAMAGED);
    expect(brokenLinkAfterRead(first, NOTHING)).toBe(true);
  });
});
