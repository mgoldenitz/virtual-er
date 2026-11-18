// Checks that every link in the care options is a tap target of at least 24 by 24 pixels (WCAG 2.5.8):
// inline-block with space above and below, not a thin line of text.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CareOptions } from "./CareOptions";

// The class list of every <a> tag in the rendered HTML.
function linkClasses(html: string): string[][] {
  const tags = html.match(/<a [^>]*>/g) ?? [];
  return tags.map((tag) => (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" "));
}

describe("CareOptions", () => {
  it("gives every link room to tap", () => {
    const links = linkClasses(renderToStaticMarkup(<CareOptions language="en" />));
    expect(links.length).toBeGreaterThan(0);
    for (const classes of links) {
      expect(classes).toContain("inline-block");
      expect(classes).toContain("py-1");
    }
  });
});
