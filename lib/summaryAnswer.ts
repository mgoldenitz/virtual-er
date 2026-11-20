// Turns Claude's reply to the dashboard summary into either the text to show or a plain staff message saying why there is none.
// The shape is small on purpose, so this file does not import the Anthropic SDK.

/** The parts of a Claude reply this file reads. */
export type ReplyLike = {
  stop_reason: string | null;
  content: Array<{ type: string; text?: string }>;
};

/** Either the summary text, or the reason there is none. */
export type SummaryAnswer =
  | { kind: "text"; text: string }
  | { kind: "none"; reason: "refusal" | "cut_off" | "empty" };

/** The message staff see for each reason there is no summary. */
export const SUMMARY_NONE_TEXT: Record<"refusal" | "cut_off" | "empty", string> = {
  refusal: "The summary could not be written for these numbers. The numbers above are still correct.",
  cut_off: "The summary was too long and was stopped. Please try again.",
  empty: "The summary came back empty. Please try again.",
};

/** Checks the stop reason first, then joins the text blocks (thinking blocks are skipped). */
export function summaryAnswer(reply: ReplyLike): SummaryAnswer {
  if (reply.stop_reason === "refusal") return { kind: "none", reason: "refusal" };
  if (reply.stop_reason === "max_tokens") return { kind: "none", reason: "cut_off" };
  const text = reply.content
    .filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join(" ")
    .trim();
  if (text === "") return { kind: "none", reason: "empty" };
  return { kind: "text", text };
}
