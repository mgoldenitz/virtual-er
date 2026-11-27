// Checks that the 911 card icon tile uses the card colour token, not a raw colour,
// so lib/contrast.test.ts (red on card) covers it.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SafetyCard } from "./SafetyCard";

describe("SafetyCard", () => {
  it("puts the red icon on a tile with the card colour", () => {
    const html = renderToStaticMarkup(<SafetyCard>Call 911</SafetyCard>);
    const tile = html.match(/<span [^>]*class="([^"]*icon-tile[^"]*)"/)?.[1].split(" ") ?? [];
    expect(tile).toContain("bg-card");
    expect(tile).not.toContain("bg-white");
    expect(tile).toContain("text-alert-edge");
  });

  it("shows the second paragraph after the first, in one card", () => {
    const html = renderToStaticMarkup(<SafetyCard second="Call 911">Check first</SafetyCard>);
    expect(html.match(/<p /g)).toHaveLength(2);
    expect(html.indexOf("Check first")).toBeLessThan(html.indexOf("Call 911"));
  });
});
