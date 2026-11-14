// Checks the text size rules: which values count as a size, and the font size each one sets.

import { describe, expect, it } from "vitest";
import { isTextSize, rootFontSize } from "./textSize";

describe("isTextSize", () => {
  it("accepts the three sizes", () => {
    expect(isTextSize("normal")).toBe(true);
    expect(isTextSize("large")).toBe(true);
    expect(isTextSize("extraLarge")).toBe(true);
  });

  it("rejects anything else", () => {
    expect(isTextSize("huge")).toBe(false);
    expect(isTextSize(null)).toBe(false);
    expect(isTextSize(3)).toBe(false);
  });
});

describe("rootFontSize", () => {
  it("returns 100% for normal", () => {
    expect(rootFontSize("normal")).toBe("100%");
  });

  it("returns 125% for large", () => {
    expect(rootFontSize("large")).toBe("125%");
  });

  it("returns 150% for extra large", () => {
    expect(rootFontSize("extraLarge")).toBe("150%");
  });
});
