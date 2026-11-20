// Decides what the dashboard's summary panel shows for the summary route's answer: Claude's
// text, or one plain staff line that says why there is no summary.

import { SUMMARY_NONE_TEXT } from "./summaryAnswer";

export type SummaryMessage = { kind: "text"; text: string } | { kind: "note"; text: string };

const NOTES: Record<string, string> = {
  ...SUMMARY_NONE_TEXT,
  off: "The summary is switched off on this server.",
  not_signed_in: "Please sign in again to get a summary.",
  not_staff: "Only staff accounts can get a summary.",
  busy: "The summary service is busy. Please try again in a minute.",
};
const FALLBACK = "The summary could not be written just now. The numbers above are still correct.";

/** status is the HTTP status; body is the parsed JSON, or null when there was none or it did not parse. */
export function summaryMessage(status: number, body: unknown): SummaryMessage {
  if (status === 204) return { kind: "note", text: NOTES.off };
  const { result, text } = (typeof body === "object" && body !== null ? body : {}) as { result?: unknown; text?: unknown };
  if (result === "text" && typeof text === "string" && text.trim() !== "") return { kind: "text", text: text.trim() };
  if (typeof result === "string" && Object.hasOwn(NOTES, result)) return { kind: "note", text: NOTES[result] };
  return { kind: "note", text: FALLBACK };
}
