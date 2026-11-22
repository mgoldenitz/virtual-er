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
      // A link in a sentence is inline-block; a link that stands alone is inline-flex (next test).
      expect(classes.includes("inline-block") || classes.includes("inline-flex")).toBe(true);
      expect(classes).toContain("py-1");
    }
  });

  it("puts the words of the 2 links that stand alone in the middle of their 44 pixels", () => {
    const t = textFor("en").start;
    const html = renderToStaticMarkup(<CareOptions language="en" />);
    for (const words of [t.virtualCare, t.waitTimesLink]) {
      const tag = html.match(new RegExp(`<a [^>]*>${words.replace(/'/g, "&#x27;")}`))?.[0] ?? "";
      const classes = tag.match(/class="([^"]*)"/)?.[1].split(" ") ?? [];
      expect(classes).toContain("inline-flex");
      expect(classes).toContain("items-center");
      // inline-block and inline-flex both set display, so a link has only one of them.
      expect(classes).not.toContain("inline-block");
    }
  });

  it("keeps the 2 links inside sentences inline-block, so they stay in the line of text", () => {
    const t = textFor("en").start;
    const html = renderToStaticMarkup(<CareOptions language="en" />);
    for (const words of ["811", t.hoursLink]) {
      const tag = html.match(new RegExp(`<a [^>]*>${words.replace(/'/g, "&#x27;")}`))?.[0] ?? "";
      const classes = tag.match(/class="([^"]*)"/)?.[1].split(" ") ?? [];
      expect(classes).toContain("inline-block");
      expect(classes).not.toContain("inline-flex");
    }
  });

  it("keeps the list a list for screen readers", () => {
    // The list has no bullets (list-style: none), and Safari VoiceOver then drops the list role,
    // so the <ul> says role="list" itself.
    const html = renderToStaticMarkup(<CareOptions language="en" />);
    expect(html).toMatch(/<ul [^>]*role="list"/);
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
