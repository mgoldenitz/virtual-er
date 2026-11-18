// Checks that every link in the care options is a tap target of at least 24 by 24 pixels (WCAG 2.5.8):
// inline-block with space above and below, not a thin line of text.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { textFor } from "@/lib/text";
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

  it("makes the 2 links that stand alone 44 pixels high", () => {
    // The 811 link and the hours link sit inside sentences, so WCAG 2.5.8 lets them stay small.
    const t = textFor("en").start;
    const html = renderToStaticMarkup(<CareOptions language="en" />);
    for (const words of [t.virtualCare, t.waitTimesLink]) {
      // React writes ' as &#x27; in HTML.
      const tag = html.match(new RegExp(`<a [^>]*>${words.replace(/'/g, "&#x27;")}`))?.[0] ?? "";
      expect(tag.match(/class="([^"]*)"/)?.[1].split(" ")).toContain("min-h-11");
    }
  });
});
