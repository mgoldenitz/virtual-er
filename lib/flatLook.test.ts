// Checks the flat look (decisions.md, 2026-11-22): no frosted glass, no colour blobs and no gradients,
// a solid hero card with no shadow, and the same 0.75rem corner on every box.

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync("app/globals.css", "utf8");

/** Gives the text inside the first "selector {" rule that starts a line in the CSS. */
function ruleBody(selector: string): string {
  const start = css.search(new RegExp(`^${selector.replace(".", "\\.")} \\{`, "m"));
  if (start === -1) return "";
  return css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
}

/** Every .ts and .tsx file in a folder and the folders inside it. */
function codeFiles(folder: string): string[] {
  return readdirSync(folder, { recursive: true, encoding: "utf8" })
    .filter((name) => /\.tsx?$/.test(name))
    .map((name) => join(folder, name));
}

describe("flat look", () => {
  it("app/globals.css has no backdrop-filter (frosted glass)", () => {
    expect(css).not.toContain("backdrop-filter");
  });

  it("app/globals.css has no gradient", () => {
    expect(css).not.toContain("gradient");
  });

  it("no screen or part uses glass-panel or staff-backdrop", () => {
    const users = [...codeFiles("app"), ...codeFiles("components")].filter((file) =>
      /glass-panel|staff-backdrop/.test(readFileSync(file, "utf8")),
    );
    expect(users).toEqual([]);
  });

  it(".hero-card is one solid colour with no shadow", () => {
    const hero = ruleBody(".hero-card");
    expect(hero).toContain("background: var(--color-brand-strong);");
    expect(hero).not.toContain("box-shadow");
  });

  it.each([".clean-card", ".hero-card", ".header-band"])("%s has a 0.75rem corner", (selector) => {
    expect(ruleBody(selector)).toContain("border-radius: 0.75rem;");
  });
});
