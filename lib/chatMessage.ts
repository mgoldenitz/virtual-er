// Decides what the staff chat panel shows for the chat route's answer: Claude's text, or one plain staff line that says why there is no answer.

import { CHAT_LIMITS } from "./chatRequest";

export type ChatMessage = { kind: "text" | "note"; text: string };

/** The text for the one visit-code case, so it can be checked on its own. */
export const CHAT_CODE_TEXT = "Please remove the visit code or number. The AI sees only today's totals.";

const NOTES: Record<string, string> = {
  refusal: "No answer could be written for this question. The numbers above are still correct.",
  cut_off: "The answer was too long and was stopped. Please ask a shorter question.",
  empty: "The answer came back empty. Please try again.",
  off: "The chat is switched off on this server.",
  not_signed_in: "Please sign in again to ask a question.",
  not_staff: "Only staff accounts can ask questions.",
  busy: "The chat service is busy. Please try again in a minute.",
  has_code: CHAT_CODE_TEXT,
  bad_request: `Please write a question of ${CHAT_LIMITS.questionCharacters} characters or fewer.`,
};
const FALLBACK = "No answer just now. The numbers above are still correct.";

/** status is the HTTP status; body is the parsed JSON, or null when there was none or it did not parse. */
export function chatMessage(status: number, body: unknown): ChatMessage {
  if (status === 204) return { kind: "note", text: NOTES.off };
  if (typeof body !== "object" || body === null) return { kind: "note", text: FALLBACK };
  const { result, text } = body as { result?: unknown; text?: unknown };
  if (result === "text" && typeof text === "string" && text.trim() !== "") return { kind: "text", text: text.trim() };
  if (typeof result === "string" && Object.hasOwn(NOTES, result)) return { kind: "note", text: NOTES[result] };
  return { kind: "note", text: FALLBACK };
}
