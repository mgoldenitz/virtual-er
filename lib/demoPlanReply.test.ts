import { describe, expect, it } from "vitest";
import { normalPlan } from "./demoPlan";
import { demoPlanReply } from "./demoPlanReply";

function reply(text: string, stop_reason: string | null = "end_turn") {
  return { stop_reason, content: [{ type: "thinking" }, { type: "text", text }] };
}

describe("demo day plan reply", () => {
  it("turns Claude's JSON into a checked plan", () => {
    const result = demoPlanReply(reply(JSON.stringify({ ...normalPlan(), seen_chance: 2 })));
    expect(result).toEqual({ kind: "plan", plan: { ...normalPlan(), seen_chance: 0.95 } });
  });

  it("gives no plan for a refusal or a cut-off reply, even with JSON in it", () => {
    const json = JSON.stringify(normalPlan());
    expect(demoPlanReply(reply(json, "refusal"))).toEqual({ kind: "none", reason: "refusal" });
    expect(demoPlanReply(reply(json, "max_tokens"))).toEqual({ kind: "none", reason: "cut_off" });
  });

  it("gives no plan for text that is not JSON", () => {
    expect(demoPlanReply(reply("Here is the plan: busy evening"))).toEqual({ kind: "none", reason: "not_json" });
    expect(demoPlanReply(reply(""))).toEqual({ kind: "none", reason: "not_json" });
  });

  it("gives no plan for JSON that is not an object, so the last plan stays", () => {
    for (const text of ["null", "[]", "123", '"busy"']) {
      expect(demoPlanReply(reply(text))).toEqual({ kind: "none", reason: "not_json" });
    }
  });

  it("gives no plan when Claude did not finish its turn normally", () => {
    const json = JSON.stringify(normalPlan());
    expect(demoPlanReply(reply(json, "pause_turn"))).toEqual({ kind: "none", reason: "cut_off" });
    expect(demoPlanReply(reply(json, null))).toEqual({ kind: "none", reason: "cut_off" });
  });
});
