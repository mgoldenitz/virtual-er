// Reads Claude's reply to the day plan request: either a checked plan, or the reason there is none.
// A refused, cut-off or broken reply never becomes a plan, so the simulator keeps its last plan.

import { checkDemoPlan, type DemoPlan } from "./demoPlan";
import type { ReplyLike } from "./summaryAnswer";

export type DemoPlanReply = { kind: "plan"; plan: DemoPlan } | { kind: "none"; reason: "refusal" | "cut_off" | "not_json" };

export function demoPlanReply(reply: ReplyLike): DemoPlanReply {
  if (reply.stop_reason === "refusal") return { kind: "none", reason: "refusal" };
  // Any end other than a normal finish (max_tokens, pause_turn...) means the reply may be incomplete.
  if (reply.stop_reason !== "end_turn") return { kind: "none", reason: "cut_off" };
  const text = reply.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { kind: "none", reason: "not_json" };
  }
  // null, a list or a single number is not a plan: keep the last plan instead of saving the normal one.
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) return { kind: "none", reason: "not_json" };
  return { kind: "plan", plan: checkDemoPlan(parsed) };
}
