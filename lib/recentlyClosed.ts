// Which visits the staff "Recently closed" list shows, so staff can undo a mistaken
// Mark arrived, Left or No-show without any time limit.

import type { Site, Visit } from "./visit";

export const RECENTLY_CLOSED_LIMIT = 5;

/** Visits at one site that left the off-site line by Mark arrived, Left or No-show, newest first. */
export function recentlyClosed(visits: Visit[], site: Site, limit = RECENTLY_CLOSED_LIMIT): Visit[] {
  return visits
    .filter(
      (v) =>
        v.site === site &&
        v.triaged_at !== null &&
        v.closed_at !== null &&
        (v.status === "arrived" || v.status === "removed"),
    )
    .sort((a, b) => (a.closed_at! < b.closed_at! ? 1 : a.closed_at! > b.closed_at! ? -1 : 0))
    .slice(0, limit);
}

/** Plain words for how a visit was closed, for the list and screen readers. */
export function closedLabel(visit: Visit): string {
  if (visit.status === "arrived") return "marked arrived";
  return visit.removed_reason === "no_show" ? "removed: no-show" : "removed: left";
}
