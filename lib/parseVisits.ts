// Checks the visit list read back from browser storage, so a damaged or hand-edited
// entry is skipped instead of crashing the staff or patient screen.

import { ALL_STATUSES, type Visit } from "./visit";

const TIME_FIELDS = [
  "created_at",
  "triaged_at",
  "offered_at",
  "last_still_here_at",
  "called_at",
  "seen_at",
  "confirmed_at",
  "review_flagged_at",
  "arrived_at",
  "closed_at",
  "followup_paused_until",
] as const;

function isVisit(value: unknown): value is Visit {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.code === "string" &&
    typeof v.access_token === "string" &&
    (v.site === "A" || v.site === "B") &&
    ALL_STATUSES.includes(v.status as Visit["status"]) &&
    typeof v.created_at === "string" &&
    TIME_FIELDS.every((field) => v[field] === null || typeof v[field] === "string")
  );
}

/** The saved text as a list of visits. Anything unreadable becomes an empty list or is skipped. */
export function parseVisits(raw: string | null): Visit[] {
  if (!raw) return [];
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return [];
  }
  return Array.isArray(data) ? data.filter(isVisit) : [];
}
