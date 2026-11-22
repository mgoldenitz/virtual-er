// Checks which earlier turns go with a new chat question.

import { describe, expect, it } from "vitest";
import { chatHistory, type ChatEntry } from "./chatHistory";

const text = (t: string) => ({ kind: "text" as const, text: t });
const note = (t: string) => ({ kind: "note" as const, text: t });

describe("chatHistory", () => {
  it("gives nothing for an empty chat", () => {
    expect(chatHistory([])).toEqual([]);
  });

  it("gives each answered question, then its answer", () => {
    const entries: ChatEntry[] = [{ question: "Q1", answer: text("A1") }];
    expect(chatHistory(entries)).toEqual([
      { role: "user", text: "Q1" },
      { role: "assistant", text: "A1" },
    ]);
  });

  it("keeps only the last 2 answered questions", () => {
    const entries: ChatEntry[] = [
      { question: "Q1", answer: text("A1") },
      { question: "Q2", answer: text("A2") },
      { question: "Q3", answer: text("A3") },
    ];
    expect(chatHistory(entries).map((t) => t.text)).toEqual(["Q2", "A2", "Q3", "A3"]);
  });

  it("leaves out notes and questions still on the way", () => {
    const entries: ChatEntry[] = [
      { question: "Q1", answer: text("A1") },
      { question: "Q2", answer: note("busy") },
      { question: "Q3", answer: null },
    ];
    expect(chatHistory(entries).map((t) => t.text)).toEqual(["Q1", "A1"]);
  });

  it("cuts a long answer to 1200 characters", () => {
    const entries: ChatEntry[] = [{ question: "Q1", answer: text("x".repeat(1500)) }];
    expect(chatHistory(entries)[1].text).toHaveLength(1200);
  });
});
