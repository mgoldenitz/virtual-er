// Checks the words that screen readers hear for a staff flag: they leave out the minute count,
// so they do not change (and are not read again) every minute.

import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { checkInAtDesk } from "@/lib/visitActions";
import { FollowUpPanel, flagFor } from "./FollowUpPanel";

// The panel's buttons save through Supabase; this test never presses them.
vi.mock("@/data/staffActions", () => ({}));

const now = new Date("2026-11-15T20:00:00Z");
const minutesAgo = (min: number) => new Date(now.getTime() - min * 60_000).toISOString();
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };

describe("flagFor spoken words", () => {
  it.each([5, 95])("says 'On the way, not arrived.' with no time, %i minutes after the tap", (minutes) => {
    const visit = { ...checkInAtDesk(input, "waiting", new Date(minutesAgo(200))), confirmed_at: minutesAgo(minutes) };
    const flag = flagFor({ kind: "on_way_not_arrived" }, visit, now);
    expect(flag?.spoken).toBe("On the way, not arrived.");
    expect(flag?.text).toContain("ago");
  });

  it("shows 1h 35min on screen and gives screen readers the full words", () => {
    const visit = { ...checkInAtDesk(input, "waiting", new Date(minutesAgo(200))), confirmed_at: minutesAgo(95) };
    const html = renderToStaticMarkup(flagFor({ kind: "on_way_not_arrived" }, visit, now)?.body as ReactElement);
    expect(html).toContain('Confirmed <span aria-hidden="true">1h 35min</span><span class="sr-only">1 hour 35 minutes</span> ago.');
  });

  it("speaks the full words when the flag has no time in it", () => {
    const visit = checkInAtDesk(input, "waiting", new Date(minutesAgo(30)));
    const flag = flagFor({ kind: "contacted_not_arrived" }, visit, now);
    expect(flag?.spoken).toBe(flag?.text);
  });
});

/** The whole panel as HTML, for a visit called back `calledMinutesAgo` minutes ago with no phone call yet. */
function panelHtml(calledMinutesAgo: number): string {
  const visit = { ...checkInAtDesk(input, "waiting", new Date(minutesAgo(200))), status: "called" as const, called_at: minutesAgo(calledMinutesAgo) };
  return renderToStaticMarkup(createElement(FollowUpPanel, { visit, now, saving: false, act: vi.fn() }));
}

/** The words in the panel's role="status" line, which screen readers hear. */
const statusWords = (html: string) => html.match(/<p role="status"[^>]*>(.*?)<\/p>/)?.[1] ?? "";

describe("FollowUpPanel phone and review flags", () => {
  it.each([
    ["phone", 12, "10 minutes", "10 min"],
    ["phone_again", 22, "20 minutes", "20 min"],
    ["review", 32, "30 minutes", "30 min"],
  ])("the %s flag, called back %i minutes ago, gives screen readers '%s', never 'min', and shows '%s'", (kind, calledMinutesAgo, words, shown) => {
    const html = panelHtml(calledMinutesAgo);
    expect(html).toContain(`data-testid="flag-${kind}"`);
    expect(html).toContain(`<span aria-hidden="true">${shown}</span>`);
    expect(html).toContain(`<span class="sr-only">${words}</span>`);
    expect(statusWords(html)).toContain(words);
    expect(statusWords(html)).not.toMatch(/\bmin\b/);
  });
});
