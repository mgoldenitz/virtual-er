// Checks the visit code box in Expected arrivals: it can never be wider than its column, so the staff page does not scroll sideways at 200% text.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ExpectedArrivals } from "./ExpectedArrivals";

// The box looks up a code in the database; the test does not need that.
vi.mock("@/data/staffActions", () => ({ findVisitByCode: vi.fn() }));

describe("ExpectedArrivals on a narrow screen", () => {
  it("keeps the visit code box inside the screen width (WCAG reflow)", () => {
    const html = renderToStaticMarkup(
      <ExpectedArrivals visits={[]} site="A" now={new Date()} onChoose={() => {}} />,
    );
    const tag = html.match(/<input[^>]*>/)?.[0] ?? "";
    const classes = (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
    expect(classes).toContain("max-w-full");
    // The label around the box is a flex item, so it needs its own limit too.
    const label = html.match(/<label class="([^"]*)"><span[^>]*>Visit code/)?.[1] ?? "";
    expect(label.split(" ")).toContain("max-w-full");
  });
});
