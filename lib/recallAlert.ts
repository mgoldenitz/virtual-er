// Rules for the Pushover alert to the owner's phone when staff recall a real visit (Phase 4).
// The message goes through the Pushover server, so it carries only the display code and
// the site: never the token, a link, the language or the CTAS level (SPEC rule 1).

import type { Site } from "./visit";

/** The visit fields the alert route reads. */
export type RecallAlertRow = {
  id: string;
  code: string;
  site: Site;
  status: string;
  called_at: string | null;
  is_demo: boolean;
};

/** "Recall all" can send many ids; more than this is not a real request. */
export const MAX_ALERT_IDS = 50;

/** A recall older than this sends nothing, so a repeat request or an old id does not ring the phone again. */
export const ALERT_WINDOW_MINUTES = 2;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The body the staff browser sends: `{ ids: [...] }` with 1 to 50 visit ids. Anything else gives null. */
export function parseRecallAlertBody(body: unknown): { ids: string[] } | null {
  if (typeof body !== "object" || body === null) return null;
  const ids = (body as { ids?: unknown }).ids;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > MAX_ALERT_IDS) return null;
  if (!ids.every((id) => typeof id === "string" && UUID.test(id))) return null;
  return { ids: [...new Set(ids as string[])] };
}

/** Real visits that are called back now, and were called in the last 2 minutes. */
export function alertsToSend(rows: RecallAlertRow[], now: Date): RecallAlertRow[] {
  const oldest = now.getTime() - ALERT_WINDOW_MINUTES * 60_000;
  return rows.filter(
    (r) => r.status === "called" && !r.is_demo && r.called_at !== null && Date.parse(r.called_at) >= oldest,
  );
}

/** The one line of text the phone shows. */
export function recallAlertText(rows: RecallAlertRow[]): string {
  if (rows.length === 0) return "";
  if (rows.length === 1) return `Visit ${rows[0].code} is called back to Demo Site ${rows[0].site}.`;
  const list = rows.map((r) => `${r.code} (Demo Site ${r.site})`).join(", ");
  return `${rows.length} visits are called back: ${list}.`;
}
