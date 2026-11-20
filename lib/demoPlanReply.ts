// Reads Claude's reply to the day plan request: either a checked plan, or the reason there is none.
// A refused, cut-off or broken reply never becomes a plan, so the simulator keeps its last plan.

import { checkDemoPlan, type DemoPlan } from "./demoPlan";
import type { ReplyLike } from "./summaryAnswer";

export type DemoPlanReply = { kind: "plan"; plan: DemoPlan } | { kind: "none"; reason: "refusal" | "cut_off" | "not_json" };

export function demoPlanReply(reply: ReplyLike): DemoPlanReply {
  if (reply.stop_reason === "refusal") return { kind: "none", reason: "refusal" };
  if (reply.stop_reason === "max_tokens") return { kind: "none", reason: "cut_off" };
  const text = reply.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("");
  try {
    return { kind: "plan", plan: checkDemoPlan(JSON.parse(text)) };
  } catch {
    return { kind: "none", reason: "not_json" };
  }
}
