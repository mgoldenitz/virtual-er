// Checks the words staff read after "Clear demo data".

import { describe, expect, it } from "vitest";
import { clearDemoMessage } from "./clearDemoMessage";

describe("clearDemoMessage", () => {
  it("says nothing was saved when the database could not be reached", () => {
    const words = clearDemoMessage("failed");
    expect(words).toMatch(/^Not saved/);
    expect(words).toContain("Try again");
  });

  it("says no demo visits were found when there were none", () => {
    expect(clearDemoMessage(0)).toContain("No demo visits");
  });

  it("uses the single word for 1 visit", () => {
    const words = clearDemoMessage(1);
    expect(words).toContain("1 demo visit");
    expect(words).not.toContain("1 demo visits");
  });

  it("uses the plural for more than 1 visit", () => {
    expect(clearDemoMessage(12)).toContain("12 demo visits");
  });

  it("says the simulator is off after every save", () => {
    for (const n of [0, 1, 12]) expect(clearDemoMessage(n)).toContain("simulator is off");
  });
});
