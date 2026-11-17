import { describe, expect, it } from "vitest";
import { resultForError } from "./saveResult";

describe("resultForError", () => {
  it("a pause refusal (VWR02) is paused", () => {
    expect(resultForError("VWR02")).toBe("paused");
  });

  it("a step refusal (VWR01) is refused", () => {
    expect(resultForError("VWR01")).toBe("refused");
  });

  it("any other error is not saved", () => {
    expect(resultForError("42501")).toBe("not_saved");
    expect(resultForError(undefined)).toBe("not_saved");
  });
});
