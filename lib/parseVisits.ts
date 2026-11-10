// Checks the visit list read back from browser storage. A damaged or hand-edited entry
// is set aside (and counted, so the staff screen can warn about it) instead of
// crashing the staff or patient screen.

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

/** A real moment in time, written as text (for example "2026-11-09T20:15:00.000Z"). */
const isTime = (value: unknown) => typeof value === "string" && !Number.isNaN(Date.parse(value));
const isOneOf = (value: unknown, allowed: readonly unknown[]) => allowed.includes(value);

function isVisit(value: unknown): value is Visit {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.code === "string" &&
    typeof v.access_token === "string" &&
    isOneOf(v.site, ["A", "B"]) &&
    isOneOf(v.source, ["home", "desk"]) &&
    isOneOf(v.ctas_level, [4, 5, null]) &&
    typeof v.language === "string" &&
    ALL_STATUSES.includes(v.status as Visit["status"]) &&
    isOneOf(v.removed_reason, ["left", "no_show", null]) &&
    isTime(v.created_at) &&
    TIME_FIELDS.every((field) => v[field] === null || isTime(v[field])) &&
    Number.isInteger(v.phone_attempts) &&
    (v.phone_attempts as number) >= 0 &&
    isOneOf(v.last_phone_result, ["answered", "no_answer", null]) &&
    (v.survey_score === null ||
      (Number.isInteger(v.survey_score) && (v.survey_score as number) >= 0 && (v.survey_score as number) <= 10)) &&
    typeof v.is_demo === "boolean"
  );
}

/**
 * What was read back from storage:
 * visits that passed every check, entries set aside as damaged (kept so a save never
 * silently deletes them), and whether the saved text as a whole could not be read.
 */
export type ParsedVisits = { visits: Visit[]; damaged: unknown[]; unreadable: boolean };

export function parseVisits(raw: string | null): ParsedVisits {
  if (!raw) return { visits: [], damaged: [], unreadable: false };
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { visits: [], damaged: [], unreadable: true };
  }
  if (!Array.isArray(data)) return { visits: [], damaged: [], unreadable: true };
  return {
    visits: data.filter(isVisit),
    damaged: data.filter((entry) => !isVisit(entry)),
    unreadable: false,
  };
}
