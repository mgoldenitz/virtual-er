// Checks that .icon-tile in app/globals.css sits inside "@layer components".
// A plain CSS rule outside every layer beats Tailwind utility classes, so a utility such as
// text-alert-edge on the 911 card icon (components/SafetyCard.tsx) had no effect: the icon was blue.

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Gives the text inside "@layer components { ... }", counting braces so nested rules stay in.
function componentsLayer(css: string): string {
  const start = css.indexOf("@layer components");
  if (start === -1) return "";
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}") depth--;
    if (depth === 0) return css.slice(open + 1, i);
  }
  return "";
}

describe("app/globals.css layers", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it(".icon-tile is inside @layer components, so utility classes can change its colour", () => {
    expect(componentsLayer(css)).toContain(".icon-tile");
  });

  it(".icon-tile is not also defined outside the layer", () => {
    const outside = css.replace(componentsLayer(css), "");
    expect(outside).not.toContain(".icon-tile");
  });
});
