// Works out which fields of a visit a staff action changed, so only those are sent to the
// database. A field nobody touched is never written back, so it cannot overwrite a newer value.

import type { Visit } from "./visit";

/** Set by the database only; the app never sends them in a change. */
const NEVER_SENT = ["id", "created_at", "version"];

export function changedFields(before: Visit, after: Visit): Partial<Visit> {
  const changed: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(after)) {
    if (NEVER_SENT.includes(field)) continue;
    if (value !== (before as Record<string, unknown>)[field]) changed[field] = value;
  }
  return changed as Partial<Visit>;
}
