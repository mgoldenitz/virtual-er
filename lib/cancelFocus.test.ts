// Checks when focus moves to the check-in heading after Cancel: only when Cancel was pressed and the home visit is gone.

import { describe, expect, it } from "vitest";
import { shouldFocusHeading } from "./cancelFocus";

describe("shouldFocusHeading", () => {
  it("is true only when Cancel was pressed and the home visit is gone", () => {
    expect(shouldFocusHeading(true, false)).toBe(true);
  });

  it("is false when Cancel was pressed but the home visit is still open", () => {
    expect(shouldFocusHeading(true, true)).toBe(false);
  });

  it("is false when Cancel was not pressed and the home visit is gone", () => {
    expect(shouldFocusHeading(false, false)).toBe(false);
  });

  it("is false when Cancel was not pressed and the home visit is still open", () => {
    expect(shouldFocusHeading(false, true)).toBe(false);
  });
});
