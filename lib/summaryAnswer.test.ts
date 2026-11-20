import { describe, expect, it } from "vitest";
import { summaryAnswer, SUMMARY_NONE_TEXT, type ReplyLike } from "./summaryAnswer";

function reply(extra: Partial<ReplyLike> = {}): ReplyLike {
  return {
    stop_reason: "end_turn",
    content: [{ type: "text", text: "Site A has 3 visits waiting." }],
    ...extra,
  };
}

describe("summary answer", () => {
  it("gives none with reason refusal when stop_reason is refusal", () => {
    expect(summaryAnswer(reply({ stop_reason: "refusal" }))).toEqual({ kind: "none", reason: "refusal" });
  });

  it("gives none with reason cut_off when stop_reason is max_tokens", () => {
    expect(summaryAnswer(reply({ stop_reason: "max_tokens" }))).toEqual({ kind: "none", reason: "cut_off" });
  });

  it("checks the stop reason before the text, so a refusal with text is still none", () => {
    expect(summaryAnswer(reply({ stop_reason: "refusal" }))).toEqual({ kind: "none", reason: "refusal" });
  });

  it("gives none with reason empty when there is no text block", () => {
    expect(summaryAnswer(reply({ content: [] }))).toEqual({ kind: "none", reason: "empty" });
  });

  it("gives none with reason empty when the text is only spaces", () => {
    expect(summaryAnswer(reply({ content: [{ type: "text", text: "   " }] }))).toEqual({
      kind: "none",
      reason: "empty",
    });
  });

  it("gives the trimmed text when there is one text block", () => {
    expect(summaryAnswer(reply({ content: [{ type: "text", text: "  Site B is quiet.  " }] }))).toEqual({
      kind: "text",
      text: "Site B is quiet.",
    });
  });

  it("skips thinking blocks and joins two text blocks with a space", () => {
    const out = summaryAnswer(
      reply({
        content: [
          { type: "thinking", text: "Let me add the totals." },
          { type: "text", text: "Site A has 3 visits waiting." },
          { type: "text", text: "Site B has 1." },
        ],
      }),
    );
    expect(out).toEqual({ kind: "text", text: "Site A has 3 visits waiting. Site B has 1." });
  });

  it("has plain staff text for each reason, with straight quotes and no em dashes", () => {
    for (const text of Object.values(SUMMARY_NONE_TEXT)) {
      expect(text).not.toContain(String.fromCharCode(0x2014));
      expect(text).not.toContain(String.fromCharCode(0x201c));
      expect(text).not.toContain(String.fromCharCode(0x201d));
    }
    expect(SUMMARY_NONE_TEXT.refusal).toBe(
      "The summary could not be written for these numbers. The numbers above are still correct.",
    );
  });
});
