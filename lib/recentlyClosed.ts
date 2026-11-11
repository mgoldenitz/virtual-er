// Which visits the staff "Recently closed" list shows, so staff can undo a mistaken
// Mark arrived, Left or No-show without any time limit, or reopen a visit confirmed
// "unable to reach" when the patient comes back. The newest few show first;
// older ones stay reachable with "Show older closures".

import type { Site, Visit } from "./visit";

/** How many closures the list shows at first, and how many more each "Show older" press adds. */
export const CLOSED_PAGE_SIZE = 5;

/** Every visit at one site that left the off-site line by Mark arrived, Left, No-show or unable to reach, newest first. */
export function recentlyClosed(visits: Visit[], site: Site): Visit[] {
  return visits
    .filter(
      (v) =>
        v.site === site &&
        v.triaged_at !== null &&
        v.closed_at !== null &&
        (v.status === "arrived" || v.status === "removed" || v.status === "unable_to_reach"),
    )
    .sort((a, b) => (a.closed_at! < b.closed_at! ? 1 : a.closed_at! > b.closed_at! ? -1 : 0));
}

/** Plain words for how a visit was closed, for the list and screen readers. */
export function closedLabel(visit: Visit): string {
  if (visit.status === "arrived") return "marked arrived";
  if (visit.status === "unable_to_reach") return "confirmed unable to reach";
  return visit.removed_reason === "no_show" ? "removed: no-show" : "removed: left";
}
