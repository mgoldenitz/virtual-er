// Checks that the boxes drawn only with a background have a transparent border in app/globals.css.
// In Windows high contrast mode (forced-colors), the browser removes backgrounds and shadows,
// but it shows a transparent border in a system colour, so the box keeps a visible edge.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Gives the text between the braces of the first rule for this class name.
function ruleBody(css: string, className: string): string {
  const match = css.match(new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`));
  return match?.[1] ?? "";
}

describe("app/globals.css boxes in high contrast mode", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it.each(["hero-card", "header-band", "status-pill"])(".%s has a transparent border", (name) => {
    expect(ruleBody(css, name)).toMatch(/border:\s*1px solid transparent;/);
  });
});
