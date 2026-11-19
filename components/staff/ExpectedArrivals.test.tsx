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

  /** The visible and spoken text of the page, with the tags removed. */
  const text = (html: string) => html.replace(/<[^>]+>/g, "");
  /** The inner HTML of the list item with this test id. */
  const itemHtml = (html: string, testId: string) => html.match(new RegExp(`data-testid="${testId}"[^>]*>([\\s\\S]*?)</li>`))?.[1] ?? "";

  it("shows a Demo tag next to the code of a demo expected arrival", () => {
    const visit = startFromHome({ ...input, is_demo: true }, now);
    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
    expect(itemHtml(html, "expected-ABC234")).toContain('data-testid="demo-tag"');
    expect(text(html)).toContain(", Demo visit");
    expect(text(html)).not.toContain("synthetic");
  });

  it("shows a Demo tag for a demo visit back for reassessment", () => {
    const visit = { ...startFromHome({ ...input, is_demo: true }, now), status: "needs_reassessment" as const, triaged_at: now.toISOString() };
    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
    expect(itemHtml(html, "reassess-ABC234")).toContain('data-testid="demo-tag"');
  });

  it("shows no Demo tag for a real expected arrival", () => {
    const visit = startFromHome({ ...input, is_demo: false }, now);
    const html = renderToStaticMarkup(<ExpectedArrivals visits={[visit]} site="A" now={now} onChoose={() => {}} />);
    expect(html).toContain("ABC234");
    expect(html).not.toContain("demo-tag");
  });
});
