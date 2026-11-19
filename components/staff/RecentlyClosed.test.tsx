// Checks that the Recently closed list shows the Demo tag only for demo visits, after the code.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { checkInAtDesk, markArrived } from "@/lib/visitActions";
import { RecentlyClosed } from "./RecentlyClosed";

// The Undo and Reopen buttons save through Supabase; the render test never presses them.
vi.mock("@/data/staffActions", () => ({}));

const now = new Date("2026-11-15T20:00:00Z");
const minutesAgo = (min: number) => new Date(now.getTime() - min * 60_000);
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
const render = (visit: Parameters<typeof RecentlyClosed>[0]["visits"][number]) =>
  renderToStaticMarkup(<RecentlyClosed visits={[visit]} site="A" onUndoResult={vi.fn()} onReopened={vi.fn()} />);

/** A visit already marked arrived, so it shows in Recently closed. */
const closed = (isDemo: boolean) => markArrived(checkInAtDesk({ ...input, is_demo: isDemo }, "waiting", minutesAgo(30)), now)!;

/** The inner HTML of the list item for one visit code. */
const itemHtml = (html: string, code: string) => html.match(new RegExp(`data-testid="closed-${code}"[^>]*>([\\s\\S]*?)</li>`))?.[1] ?? "";

describe("RecentlyClosed demo tag", () => {
  it("shows a Demo tag inside the closed row for a demo visit", () => {
    const html = render(closed(true));
    expect(itemHtml(html, "ABC234")).toContain('data-testid="demo-tag"');
  });

  it("shows no Demo tag inside the closed row for a real visit", () => {
    const html = render(closed(false));
    expect(html).toContain("ABC234");
    expect(itemHtml(html, "ABC234")).not.toContain("demo-tag");
  });
});
