import { describe, expect, it } from "vitest";
import { waitBand } from "./waitBand";

// The same edges as the test visits in supabase/checks/daily_stats.sql (5W to 54),
// so the app and the database put each wait in the same band.
describe("waitBand", () => {
  it("puts 0 seconds under 30", () => {
    expect(waitBand(0)).toBe("under_30");
  });

  it("puts 1769 seconds (29 minutes) under 30", () => {
    expect(waitBand(1769)).toBe("under_30");
  });

  it("puts 1770 seconds (rounds to 30 minutes) in 30 to 59", () => {
    expect(waitBand(1770)).toBe("30_to_59");
  });

  it("puts 3569 seconds (59 minutes) in 30 to 59", () => {
    expect(waitBand(3569)).toBe("30_to_59");
  });

  it("puts 3570 seconds (rounds to 60 minutes) in 60 to 119", () => {
    expect(waitBand(3570)).toBe("60_to_119");
  });

  it("puts 7169 seconds (119 minutes) in 60 to 119", () => {
    expect(waitBand(7169)).toBe("60_to_119");
  });

  it("puts 7170 seconds (rounds to 120 minutes) in 120 or more", () => {
    expect(waitBand(7170)).toBe("120_plus");
  });

  it("puts a very long wait in 120 or more", () => {
    expect(waitBand(86400)).toBe("120_plus");
  });
});
