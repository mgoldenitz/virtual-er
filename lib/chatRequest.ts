// Checks the body of a staff chat request and picks out the fields the chat may use, and finds visit codes, tokens and long numbers typed into it.

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

// Two groups of 3 letters or digits, split by spaces or 1 hyphen, as a lookahead so overlapping pairs are all found.
const CODE_PAIR = /(?=(?<![A-Za-z0-9])([A-Za-z0-9]{3})(?:\s+|-)([A-Za-z0-9]{3})(?![A-Za-z0-9]))/g;

// Token characters from TOKEN_ALPHABET in lib/codes.ts, upper-case, for the regular expressions below.
const TOKEN_CHARS = "0-9A-HJKMNP-TV-Z";
// 26 token characters in a row, with no letter or digit next to them.
const PLAIN_TOKEN = new RegExp(`(?<![0-9A-Z])[${TOKEN_CHARS}]{26}(?![0-9A-Z])`, "g");
// The groupToken shape: 6 groups of 4 and 1 group of 2, split by spaces or 1 hyphen.
const GROUPED_TOKEN = new RegExp(`(?<![0-9A-Z])(?:[${TOKEN_CHARS}]{4}(?:\\s+|-)){6}[${TOKEN_CHARS}]{2}(?![0-9A-Z])`, "g");
// 7 or more digits, with at most 1 space or hyphen between two digits.
const LONG_NUMBER = /\d(?:[ -]?\d){6,}/;

/** True when some word in the text is a visit code, or two words split by a space or 1 hyphen make one. */
export function hasVisitCode(text: string): boolean {
  if (text.split(/[^A-Za-z0-9]+/).some(isVisitCodeWord)) return true;
  return [...text.matchAll(CODE_PAIR)].some((match) => isVisitCodeWord(match[1] + match[2]));
}

/** True when the text has an access token, a #t= link, or a token in the grouped shape. */
export function hasAccessToken(text: string): boolean {
  if (text.includes("#t=")) return true;
  const upper = text.toUpperCase();
  return hasDigitMatch(upper, PLAIN_TOKEN) || hasDigitMatch(upper, GROUPED_TOKEN);
}

/** True when the text has 7 or more digits in a row, such as a phone number. */
export function hasLongNumber(text: string): boolean {
  return LONG_NUMBER.test(text);
}

/** True when the text has a visit code, an access token, or a long number. */
export function hasPatientDetail(text: string): boolean {
  return hasVisitCode(text) || hasAccessToken(text) || hasLongNumber(text);
}

/** True when the question or any turn in the history (staff or Claude) has a visit code, token or long number. */
export function requestHasPatientDetail(request: ChatRequest): boolean {
  if (hasPatientDetail(request.question)) return true;
  return request.history.some((turn) => hasPatientDetail(turn.text));
}

// One word is a visit code when it is 6 characters, every character is in CODE_ALPHABET, and it has a letter and a digit.
function isVisitCodeWord(word: string): boolean {
  if (word.length !== 6) return false;
  const upper = word.toUpperCase();
  if (![...upper].every((char) => CODE_ALPHABET.includes(char))) return false;
  return /[A-Z]/.test(upper) && /[0-9]/.test(upper);
}

// True when a match of the pattern has at least one digit in it.
function hasDigitMatch(text: string, pattern: RegExp): boolean {
  return [...text.matchAll(pattern)].some((match) => /[0-9]/.test(match[0]));
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
