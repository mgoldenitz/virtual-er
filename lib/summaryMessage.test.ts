import { describe, expect, it } from "vitest";
import { SUMMARY_NONE_TEXT } from "./summaryAnswer";
import { summaryMessage } from "./summaryMessage";

describe("summary message", () => {
  it("shows Claude's text, trimmed", () => {
    expect(summaryMessage(200, { result: "text", text: "  Site A is quiet.  " })).toEqual({
      kind: "text",
      text: "Site A is quiet.",
    });
  });

  it("says the summary is off when the route has no key (204)", () => {
    expect(summaryMessage(204, null)).toEqual({ kind: "note", text: "The summary is switched off on this server." });
  });

  it("uses the reply-check text for a refusal, a cut-off or an empty reply", () => {
    expect(summaryMessage(200, { result: "refusal" }).text).toBe(SUMMARY_NONE_TEXT.refusal);
    expect(summaryMessage(200, { result: "cut_off" }).text).toBe(SUMMARY_NONE_TEXT.cut_off);
    expect(summaryMessage(200, { result: "empty" }).text).toBe(SUMMARY_NONE_TEXT.empty);
  });

  it("names sign-in, staff and busy answers", () => {
    expect(summaryMessage(401, { result: "not_signed_in" }).text).toBe("Please sign in again to get a summary.");
    expect(summaryMessage(403, { result: "not_staff" }).text).toBe("Only staff accounts can get a summary.");
    expect(summaryMessage(503, { result: "busy" }).text).toBe("The summary service is busy. Please try again in a minute.");
  });

  it("falls back to one plain line for anything else", () => {
    const fallback = "The summary could not be written just now. The numbers above are still correct.";
    expect(summaryMessage(502, { result: "claude_failed" }).text).toBe(fallback);
    expect(summaryMessage(500, null).text).toBe(fallback);
    expect(summaryMessage(200, { result: "text", text: "   " }).text).toBe(fallback);
    expect(summaryMessage(200, { result: "toString" }).text).toBe(fallback);
  });
});
