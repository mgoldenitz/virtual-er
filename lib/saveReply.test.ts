// Checks which save replies still belong to the visit on screen (Gemini review of the Phase 5 fixes, point 3b).

import { describe, expect, it } from "vitest";
import { replyIsForCurrentLink } from "./saveReply";

describe("replyIsForCurrentLink", () => {
  it("keeps the reply when the link has not changed", () => {
    expect(replyIsForCurrentLink("AAA", "AAA")).toBe(true);
  });

  it("ignores the reply when a new link opened while the save was on its way", () => {
    expect(replyIsForCurrentLink("AAA", "BBB")).toBe(false);
  });

  it("ignores the reply when the link stopped opening a visit", () => {
    expect(replyIsForCurrentLink("AAA", null)).toBe(false);
  });
});
