// Checks that privateAddress() keeps only the site and the path of a page address, so a patient token in the "#" part never goes to analytics.

import { describe, expect, it } from "vitest";
import { privateAddress } from "./analyticsPrivacy";

const SITE = "https://virtual-er.example";

describe("privateAddress", () => {
  it("removes the patient token and language after #", () => {
    expect(privateAddress(`${SITE}/patient#t=ABC123SECRET&l=fr`)).toBe(`${SITE}/patient`);
  });

  it("removes the query after ?", () => {
    expect(privateAddress(`${SITE}/login?next=/staff`)).toBe(`${SITE}/login`);
  });

  it("removes both the query and the # part", () => {
    expect(privateAddress(`${SITE}/patient?x=1#t=ABC123SECRET`)).toBe(`${SITE}/patient`);
  });

  it("keeps the home page the same", () => {
    expect(privateAddress(`${SITE}/`)).toBe(`${SITE}/`);
  });

  it("keeps a plain path the same", () => {
    expect(privateAddress(`${SITE}/dashboard`)).toBe(`${SITE}/dashboard`);
  });

  it("returns null for an address it cannot read", () => {
    expect(privateAddress("not an address #t=ABC123SECRET")).toBeNull();
    expect(privateAddress("")).toBeNull();
  });

  it("never returns the token text", () => {
    const inputs = [
      `${SITE}/patient#t=ABC123SECRET`,
      `${SITE}/patient?t=ABC123SECRET`,
      `${SITE}/patient#l=en&t=ABC123SECRET`,
      "ABC123SECRET",
    ];
    for (const input of inputs) {
      expect(privateAddress(input) ?? "").not.toContain("ABC123SECRET");
    }
  });
});
