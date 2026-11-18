// Checks the visit code box in Expected arrivals: it can never be wider than its column, so the staff page does not scroll sideways at 200% text.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { startFromHome } from "@/lib/visitActions";
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

describe("ExpectedArrivals demo tag", () => {
  const now = new Date("2026-11-15T20:00:00Z");
  const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, language: "en" };

  it("shows a Demo tag next to the code of a demo expected arrival", () => {
    const visit = startFromHome({ ...input, is_demo: true }, now);
    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
    expect(html).toMatch(/data-testid="expected-ABC234"[\s\S]*data-testid="demo-tag"[^>]*>Demo</);
  });

  it("shows no Demo tag for a real expected arrival", () => {
    const visit = startFromHome(input, now);
    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
    expect(html).toContain("ABC234");
    expect(html).not.toContain("demo-tag");
  });
});
