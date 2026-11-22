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

  it.each(["ink", "brand-strong"])("text colour %s is 4.5:1 or more on line (pressed controls)", (name) => {
    expect(contrastRatio(t[name], t.line)).toBeGreaterThanOrEqual(4.5);
  });

  it("brand-strong (link hover) is 4.5:1 or more on canvas and card", () => {
    for (const bg of backgrounds) {
      expect(contrastRatio(t["brand-strong"], t[bg])).toBeGreaterThanOrEqual(4.5);
    }
  });

  // The darkest corner of .staff-backdrop in app/globals.css (about #d1dbf4). A link on the
  // dashboard (app/dashboard/page.tsx) sits on the backdrop, not on a panel.
  const BACKDROP_DARKEST = "#d1dbf4";
  it.each(["ink", "muted", "brand", "brand-strong"])("text colour %s is 4.5:1 or more on the staff backdrop", (name) => {
    expect(contrastRatio(t[name], BACKDROP_DARKEST)).toBeGreaterThanOrEqual(4.5);
  });

  it("white text on the hero card gradient is 4.5:1 or more", () => {
    for (const name of ["brand", "brand-strong"]) {
      expect(contrastRatio("#ffffff", t[name])).toBeGreaterThanOrEqual(4.5);
    }
  });

  it.each(["ink", "brand-strong"])("text colour %s is 4.5:1 or more on the header band", (name) => {
    expect(contrastRatio(t[name], t.band)).toBeGreaterThanOrEqual(4.5);
  });

  it("911 card text is 4.5:1 or more", () => {
    expect(contrastRatio(t["alert-ink"], t["alert-tint"])).toBeGreaterThanOrEqual(4.5);
  });

  it("911 card border is 3:1 or more on canvas", () => {
    expect(contrastRatio(t["alert-edge"], t.canvas)).toBeGreaterThanOrEqual(3);
  });

  it("paused pill text is 4.5:1 or more", () => {
    expect(contrastRatio(t["stop-ink"], t["stop-tint"])).toBeGreaterThanOrEqual(4.5);
  });

  it("called pill text is 4.5:1 or more", () => {
    expect(contrastRatio(t["ok-ink"], t["ok-tint"])).toBeGreaterThanOrEqual(4.5);
  });

  it("waiting pill text is 4.5:1 or more", () => {
    expect(contrastRatio(t["brand-strong"], t.band)).toBeGreaterThanOrEqual(4.5);
  });

  // The chosen site card (components/start/StartVisit.tsx): pale blue with a blue border.
  it("chosen site card border is 3:1 or more on the band tint", () => {
    expect(contrastRatio(t.brand, t.band)).toBeGreaterThanOrEqual(3);
  });

  // The paused message border sits on the paused tint.
  it("paused message border is 3:1 or more on the paused tint", () => {
    expect(contrastRatio(t["alert-edge"], t["stop-tint"])).toBeGreaterThanOrEqual(3);
  });

  it("control borders are 3:1 or more on canvas and card", () => {
    for (const bg of backgrounds) {
      expect(contrastRatio(t.control, t[bg])).toBeGreaterThanOrEqual(3);
    }
  });

  // The language and text size controls sit in the header band (components/PatientHeader.tsx).
  it("control borders are 3:1 or more on the header band", () => {
    expect(contrastRatio(t.control, t.band)).toBeGreaterThanOrEqual(3);
  });

  // The 911 card (components/SafetyCard.tsx): the red border touches the pale red inside.
  it("911 card border is 3:1 or more on the 911 card tint", () => {
    expect(contrastRatio(t["alert-edge"], t["alert-tint"])).toBeGreaterThanOrEqual(3);
  });

  // The red 911 icon on its white tile, and the paused message border on the white card.
  it("red border and icon colour are 3:1 or more on the card", () => {
    expect(contrastRatio(t["alert-edge"], t.card)).toBeGreaterThanOrEqual(3);
  });
});
