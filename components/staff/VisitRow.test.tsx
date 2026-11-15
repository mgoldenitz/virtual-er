// Checks that a staff row shows hours and minutes once a wait passes 60 minutes.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { callBack, checkInAtDesk } from "@/lib/visitActions";
import { VisitRow } from "./VisitRow";

// The row's buttons save through Supabase; the render test never presses them.
vi.mock("@/data/staffActions", () => ({}));

const now = new Date("2026-11-15T20:00:00Z");
const minutesAgo = (min: number) => new Date(now.getTime() - min * 60_000);
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
const render = (visit: Parameters<typeof VisitRow>[0]["visit"]) =>
  renderToStaticMarkup(<VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />);

describe("VisitRow times", () => {
  it("shows the wait as 1h 35min after 95 minutes", () => {
    const html = render(checkInAtDesk(input, "waiting", minutesAgo(95)));
    expect(html).toContain("waited <strong>1h 35min</strong>");
  });

  it("shows the call-back time in hours and minutes", () => {
    const visit = callBack(checkInAtDesk(input, "waiting", minutesAgo(200)), minutesAgo(166))!;
    expect(render(visit)).toContain("Called 2h 46min ago");
  });

  it("keeps short times in minutes", () => {
    expect(render(checkInAtDesk(input, "waiting", minutesAgo(45)))).toContain("waited <strong>45 min</strong>");
  });
});
