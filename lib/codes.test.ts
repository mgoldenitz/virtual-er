import { describe, expect, it } from "vitest";
import {
  CODE_ALPHABET,
  groupToken,
  makeAccessToken,
  makeDisplayCode,
  makeUniqueDisplayCode,
  normalizeToken,
} from "./codes";

describe("display code", () => {
  it("is 6 characters with no look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const code = makeDisplayCode();
      expect(code).toHaveLength(6);
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch);
      expect(code).not.toMatch(/[O0I1L]/);
    }
  });

  it("avoids codes already in use", () => {
    let calls = 0;
    // First call gives all zeros ("AAAAAA"), later calls give all ones ("BBBBBB").
    const fake = (n: number) => new Uint8Array(n).fill(calls++ === 0 ? 0 : 1);
    expect(makeUniqueDisplayCode(new Set(["AAAAAA"]), fake)).toBe("BBBBBB");
  });
});

describe("access token", () => {
  it("is 26 characters carrying 128 random bits", () => {
    const token = makeAccessToken();
    expect(token).toHaveLength(26);
    expect(token).toMatch(/^[0-9A-HJKMNP-TV-Z]+$/);
  });

  it("is different every time", () => {
    const seen = new Set(Array.from({ length: 500 }, () => makeAccessToken()));
    expect(seen.size).toBe(500);
  });

  it("survives grouping and sloppy typing", () => {
    const token = makeAccessToken();
    const typed = groupToken(token).toLowerCase().replace(/0/g, "o");
    expect(normalizeToken(typed)).toBe(token);
  });
});
