import { describe, expect, it } from "vitest";
import { CHAT_CODE_TEXT, chatMessage } from "./chatMessage";

const FALLBACK = "No answer just now. The numbers above are still correct.";

describe("chat message", () => {
  it("shows Claude's text, trimmed", () => {
    expect(chatMessage(200, { result: "text", text: "  Four are waiting.  " })).toEqual({ kind: "text", text: "Four are waiting." });
  });

  it("gives a note for each result", () => {
    expect(chatMessage(200, { result: "refusal" })).toEqual({
      kind: "note",
      text: "No answer could be written for this question. The numbers above are still correct.",
    });
    expect(chatMessage(200, { result: "cut_off" })).toEqual({
      kind: "note",
      text: "The answer was too long and was stopped. Please ask a shorter question.",
    });
    expect(chatMessage(200, { result: "empty" })).toEqual({ kind: "note", text: "The answer came back empty. Please try again." });
    expect(chatMessage(200, { result: "not_signed_in" })).toEqual({ kind: "note", text: "Please sign in again to ask a question." });
    expect(chatMessage(200, { result: "not_staff" })).toEqual({ kind: "note", text: "Only staff accounts can ask questions." });
    expect(chatMessage(200, { result: "busy" })).toEqual({ kind: "note", text: "The chat service is busy. Please try again in a minute." });
    expect(chatMessage(200, { result: "bad_request" })).toEqual({
      kind: "note",
      text: "Please write a question of 300 characters or fewer.",
    });
  });

  it("gives the visit-code note for has_code", () => {
    expect(chatMessage(200, { result: "has_code" })).toEqual({ kind: "note", text: CHAT_CODE_TEXT });
    expect(CHAT_CODE_TEXT).toBe("Please remove the visit code. The AI sees only today's totals.");
  });

  it("says the chat is off for status 204", () => {
    expect(chatMessage(204, null)).toEqual({ kind: "note", text: "The chat is switched off on this server." });
  });

  it("falls back when the body is missing", () => {
    expect(chatMessage(500, null)).toEqual({ kind: "note", text: FALLBACK });
  });

  it("falls back for an unknown result", () => {
    expect(chatMessage(200, { result: "something_new" })).toEqual({ kind: "note", text: FALLBACK });
  });

  it("falls back for text with nothing in it", () => {
    expect(chatMessage(200, { result: "text", text: "   " })).toEqual({ kind: "note", text: FALLBACK });
  });

  it("does not use an inherited key such as toString as a note", () => {
    expect(chatMessage(200, { result: "toString" })).toEqual({ kind: "note", text: FALLBACK });
  });
});
