// Checks that a staff row shows hours and minutes once a wait passes 60 minutes.

import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { switchToOffsite } from "@/lib/switchToOffsite";
import { callBack, checkInAtDesk } from "@/lib/visitActions";
import { VisitRow } from "./VisitRow";

// The row's buttons save through Supabase; the render test never presses them.
vi.mock("@/data/staffActions", () => ({}));

const now = new Date("2026-11-15T20:00:00Z");
const minutesAgo = (min: number) => new Date(now.getTime() - min * 60_000);
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
const render = (visit: Parameters<typeof VisitRow>[0]["visit"]) =>
  renderToStaticMarkup(<VisitRow visit={visit} now={now} onShowSlip={vi.fn()} onLeftList={vi.fn()} />);

/** A time as the Duration piece shows it: the short form on screen, the full words for screen readers. */
const shown = (short: string, words: string) => `<span aria-hidden="true">${short}</span><span class="sr-only">${words}</span>`;

describe("VisitRow times", () => {
  it("shows the wait as 1h 35min after 95 minutes", () => {
    const html = render(checkInAtDesk(input, "waiting", minutesAgo(95)));
    expect(html).toContain(`waited <strong>${shown("1h 35min", "1 hour 35 minutes")}</strong>`);
  });

  it("shows the call-back time in hours and minutes", () => {
    const visit = callBack(checkInAtDesk(input, "waiting", minutesAgo(200)), minutesAgo(166))!;
    expect(render(visit)).toContain(`Called ${shown("2h 46min", "2 hours 46 minutes")} ago`);
  });

  it("keeps short times in minutes", () => {
    expect(render(checkInAtDesk(input, "waiting", minutesAgo(45)))).toContain(`waited <strong>${shown("45 min", "45 minutes")}</strong>`);
  });
});

describe("VisitRow demo tag", () => {
  /** The visible and spoken text of the row, with the tags removed. */
  const text = (html: string) => html.replace(/<[^>]+>/g, "");

  it("shows a Demo tag next to the code for a demo visit", () => {
    const html = render(checkInAtDesk({ ...input, is_demo: true }, "waiting", minutesAgo(10)));
    expect(html).toContain('data-testid="demo-tag"');
    expect(html).toMatch(/data-testid="demo-tag"[^>]*>/);
  });

  it("reads the demo tag as ', Demo visit' after the code, with no 'synthetic' wording", () => {
    const html = render(checkInAtDesk({ ...input, is_demo: true }, "waiting", minutesAgo(10)));
    expect(text(html)).toContain(", Demo visit");
    expect(text(html)).not.toContain("synthetic");
  });

  it("shows no Demo tag for a real visit", () => {
    expect(render(checkInAtDesk({ ...input, is_demo: false }, "waiting", minutesAgo(10)))).not.toContain("demo-tag");
  });
});

describe("VisitRow after a switch from declined", () => {
  it("says when the patient was switched, not that they tapped I'm still here", () => {
    const declined = checkInAtDesk(input, "declined", minutesAgo(60));
    const switchedVisit = switchToOffsite(declined, minutesAgo(12))!;
    const html = render(switchedVisit);
    expect(html).toContain(`switched to off-site ${shown("12 min", "12 minutes")} ago`);
    expect(html).not.toContain("last &quot;I&#x27;m still here&quot;");
  });

  it("shows the patient's own tap once there is one", () => {
    const switchedVisit = switchToOffsite(checkInAtDesk(input, "declined", minutesAgo(60)), minutesAgo(12))!;
    const tapped = { ...switchedVisit, last_still_here_at: minutesAgo(3).toISOString() };
    expect(render(tapped)).not.toContain("switched to off-site");
  });
});
