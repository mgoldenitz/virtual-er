import { describe, expect, it } from "vitest";
import { tileValue } from "./tileValue";

describe("tileValue", () => {
  it("puts the unit after the value and keeps the detail line", () => {
    expect(tileValue(80, "8 of 10 triaged", "%")).toEqual({ big: "80%", detail: "8 of 10 triaged" });
  });

  it("shows a value with no unit as the number alone", () => {
    expect(tileValue(50, "3 visits")).toEqual({ big: "50", detail: "3 visits" });
  });

  it("shows 0 as a real value", () => {
    expect(tileValue(0, "0 of 4 offered", "%")).toEqual({ big: "0%", detail: "0 of 4 offered" });
  });

  it("drops the detail line when there is no value, so the tile shows only the dash", () => {
    expect(tileValue(null, "0 of 0 triaged", "%")).toEqual({ big: null, detail: null });
  });
});
