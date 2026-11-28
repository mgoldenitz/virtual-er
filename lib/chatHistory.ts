// Picks the earlier turns the chat panel sends with a new question: the last 2 questions that got
// an answer, each followed by that answer. Notes (errors, refusals) and unanswered questions are left out.

import type { ChatMessage } from "./chatMessage";
import { CHAT_LIMITS, type ChatTurn } from "./chatRequest";

/** One question in the chat list, and its answer (null while it is on the way). */
export type ChatEntry = { question: string; answer: ChatMessage | null };

/** At most CHAT_LIMITS.historyMessages turns, oldest first, as user then assistant pairs. */
export function chatHistory(entries: ChatEntry[]): ChatTurn[] {
  const answered = entries.filter((entry) => entry.answer?.kind === "text");
  const pairs = answered.slice(-(CHAT_LIMITS.historyMessages / 2));
  return pairs.flatMap((entry) => [
    { role: "user" as const, text: entry.question },
    // A long answer is cut, so the server does not refuse the whole request.
    { role: "assistant" as const, text: (entry.answer?.text ?? "").slice(0, CHAT_LIMITS.answerCharacters) },
  ]);
}

/** True when at least one question has an AI answer, so the one AI line shows under the chat (owner, 2026-11-27). */
export function showsAiLine(entries: ChatEntry[]): boolean {
  return entries.some((entry) => entry.answer?.kind === "text");
}
