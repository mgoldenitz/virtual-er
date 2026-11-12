// Checks how the difference between this device's clock and the server's is worked out.

import { describe, expect, it } from "vitest";
import { clockOffset } from "./clockOffset";

describe("clockOffset", () => {
  it("is zero when the clocks agree", () => {
    expect(clockOffset(1_000, 1_100, 1_200)).toBe(0);
  });

  it("is positive for a slow device and negative for a fast one", () => {
    // Device 10 minutes behind: the server says 600,000 ms later than the device's middle time.
    expect(clockOffset(0, 600_100, 200)).toBe(600_000);
    expect(clockOffset(600_000, 100, 600_200)).toBe(-600_000);
  });

  it("ignores a reading over a slow connection or with a broken answer", () => {
    expect(clockOffset(0, 3_000, 6_000)).toBeNull();
    expect(clockOffset(100, 50, 0)).toBeNull();
    expect(clockOffset(0, Number.NaN, 100)).toBeNull();
  });
});
