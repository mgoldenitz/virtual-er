// Checks that a staff time shows the short form on screen and gives screen readers the full words.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Duration } from "./Duration";

describe("Duration", () => {
  it("shows 1h 35min, hidden from screen readers, and the full words for them", () => {
    expect(renderToStaticMarkup(<Duration minutes={95} />)).toBe(
      '<span aria-hidden="true">1h 35min</span><span class="sr-only">1 hour 35 minutes</span>',
    );
  });

  it("uses the same rule for short and whole-hour times", () => {
    expect(renderToStaticMarkup(<Duration minutes={45} />)).toContain('<span class="sr-only">45 minutes</span>');
    expect(renderToStaticMarkup(<Duration minutes={120} />)).toContain('<span aria-hidden="true">2h</span><span class="sr-only">2 hours</span>');
  });
});
