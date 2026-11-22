// Checks the body of a staff chat request and picks out the fields the chat may use, and finds visit codes typed into it.

import { CODE_ALPHABET } from "./codes";

/** Size limits for the staff chat. The question limit matches the bad_request note in lib/chatMessage.ts. */
export const CHAT_LIMITS = { questionCharacters: 300, answerCharacters: 1200, historyMessages: 4, bodyCharacters: 6000 };

/** One earlier turn of the chat: a staff question or a Claude answer. */
export type ChatTurn = { role: "user" | "assistant"; text: string };

/** A checked chat request: whether the numbers are demo numbers, the question, and the earlier turns. */
export type ChatRequest = { isDemo: boolean; question: string; history: ChatTurn[] };

/** Returns the checked request, or null when the body has any other shape or is too long. */
export function parseChatBody(body: unknown): ChatRequest | null {
  const obj = plainObject(body);
  if (!obj) return null;
  const { isDemo, question, history } = obj;
  if (typeof isDemo !== "boolean") return null;
  const trimmedQuestion = trimmedText(question);
  if (trimmedQuestion === null || trimmedQuestion.length < 1) return null;
  if (trimmedQuestion.length > CHAT_LIMITS.questionCharacters) return null;
  const turns = parseHistory(history);
  if (turns === null) return null;
  return { isDemo, question: trimmedQuestion, history: turns };
}

/** True when some word in the text is shaped like a display code: 6 characters, all in CODE_ALPHABET, with a letter and a digit. */
export function hasVisitCode(text: string): boolean {
  return text.split(/[^A-Za-z0-9]+/).some(isVisitCodeWord);
}

/** True when the question or any staff (user) turn in the history has a visit code. Claude's turns are not checked. */
export function requestHasVisitCode(request: ChatRequest): boolean {
  if (hasVisitCode(request.question)) return true;
  return request.history.some((turn) => turn.role === "user" && hasVisitCode(turn.text));
}

// One word is a visit code when it is 6 characters, every character is in CODE_ALPHABET, and it has a letter and a digit.
function isVisitCodeWord(word: string): boolean {
  if (word.length !== 6) return false;
  const upper = word.toUpperCase();
  if (![...upper].every((char) => CODE_ALPHABET.includes(char))) return false;
  return /[A-Z]/.test(upper) && /[0-9]/.test(upper);
}

// The history must be at most 4 turns, alternate user then assistant, and end with an assistant turn.
function parseHistory(value: unknown): ChatTurn[] | null {
  if (!Array.isArray(value)) return null;
  if (value.length > CHAT_LIMITS.historyMessages) return null;
  const turns: ChatTurn[] = [];
  for (let i = 0; i < value.length; i++) {
    const turn = parseTurn(value[i]);
    if (turn === null) return null;
    const expectedRole = i % 2 === 0 ? "user" : "assistant";
    if (turn.role !== expectedRole) return null;
    turns.push(turn);
  }
  if (turns.length > 0 && turns[turns.length - 1].role !== "assistant") return null;
  return turns;
}

// One turn: role and text only, with the text trimmed and within the length for its role.
function parseTurn(item: unknown): ChatTurn | null {
  const obj = plainObject(item);
  if (!obj) return null;
  const { role, text } = obj;
  if (role !== "user" && role !== "assistant") return null;
  const trimmed = trimmedText(text);
  if (trimmed === null || trimmed.length < 1) return null;
  const limit = role === "user" ? CHAT_LIMITS.questionCharacters : CHAT_LIMITS.answerCharacters;
  if (trimmed.length > limit) return null;
  return { role, text: trimmed };
}

// A plain object: not null, not an array. Anything else gives null.
function plainObject(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

// The trimmed string, or null when the value is not a string.
function trimmedText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return value.trim();
}
