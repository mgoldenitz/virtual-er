// Checks when a staff row takes focus back after a part with focus leaves the page.

import { describe, expect, it } from "vitest";
import { focusLeftWithPart } from "./rowFocus";

describe("focusLeftWithPart", () => {
  it("is true when focus is on nobody and the focused part left the page", () => {
    expect(focusLeftWithPart(true, false)).toBe(true);
  });

  it("is false when the focused part is still on the page (focus moved away on purpose)", () => {
    expect(focusLeftWithPart(true, true)).toBe(false);
  });

  it("is false when another part of the page has focus", () => {
    expect(focusLeftWithPart(false, false)).toBe(false);
  });

  it("is false when no part of the row had focus (a phone tap)", () => {
    expect(focusLeftWithPart(true, null)).toBe(false);
  });
});
