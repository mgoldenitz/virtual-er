// Checks that a grayed-out button (disabled or aria-disabled) does not change colour on hover or press.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Button } from "./Button";

// The class list of the <button> tag in the rendered HTML.
function buttonClasses(html: string): string[] {
  const tag = html.match(/<button[^>]*>/)?.[0] ?? "";
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
}

describe("Button hover and press colours", () => {
  it.each(["primary", "secondary", "danger"] as const)("%s changes colour only when it is not grayed out", (variant) => {
    const classes = buttonClasses(renderToStaticMarkup(<Button variant={variant}>Go</Button>));
    const states = classes.filter((c) => c.includes("hover:") || c.includes("active:"));
    expect(states.length).toBeGreaterThan(0);
    for (const c of states) {
      expect(c.startsWith("not-disabled:not-aria-disabled:")).toBe(true);
    }
  });
});
