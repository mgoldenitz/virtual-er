// Checks that the colour tokens in app/globals.css meet WCAG 2.2 AA (hard rule 9).

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

// Reads "--color-name: #rrggbb;" lines from the @theme block.
function themeTokens(): Record<string, string> {
  const css = readFileSync("app/globals.css", "utf8");
  const theme = css.match(/@theme\s*\{([^}]*)\}/);
  if (!theme) throw new Error("No @theme block in app/globals.css");
  const tokens: Record<string, string> = {};
  for (const [, name, value] of theme[1].matchAll(/--color-([a-z-]+):\s*(#[0-9a-fA-F]{6})/g)) {
    tokens[name] = value;
  }
  return tokens;
}

describe("contrastRatio", () => {
  it("gives 21 for black on white and 1 for the same colour", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#1d4ed8", "#1d4ed8")).toBe(1);
  });

  it("refuses a colour that is not #rrggbb", () => {
    expect(() => contrastRatio("blue", "#ffffff")).toThrow();
  });
});

describe("globals.css tokens", () => {
  const t = themeTokens();
  const backgrounds = ["canvas", "card"];

  it.each(["ink", "muted", "brand"])("text colour %s is 4.5:1 or more on canvas and card", (name) => {
    for (const bg of backgrounds) {
      expect(contrastRatio(t[name], t[bg])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(["brand", "brand-strong"])("white text on %s is 4.5:1 or more", (name) => {
    expect(contrastRatio("#ffffff", t[name])).toBeGreaterThanOrEqual(4.5);
  });

  it("control borders are 3:1 or more on canvas and card", () => {
    for (const bg of backgrounds) {
      expect(contrastRatio(t.control, t[bg])).toBeGreaterThanOrEqual(3);
    }
  });
});
