// The words the dashboard summary route sends to Claude: the rules Claude must follow, and the
// day's totals as JSON. Only the totals from lib/summaryInput.ts go in, never a code, token or time.

import type { SummaryInput } from "./summaryInput";

/** The rules Claude follows when it writes the summary. Each line is one rule. */
export const SUMMARY_RULES: string[] = [
  "You write a short summary of today's numbers for emergency department staff.",
  // Keeps the answer short and easy to read on the dashboard.
  "Write 2 or 3 short sentences in plain English. No headings, lists, bold or emoji.",
  // Keeps Claude to facts that are in the totals.
  "Use only the numbers you are given. Do not guess why a number is high or low.",
  // SPEC rule 2: the app never makes clinical decisions.
  "Never give medical or clinical advice, and never suggest a change to triage or to who waits off-site.",
  // The totals hold sums, not averages; this stops a wrong average.
  "recallToArrivalSeconds and surveyScoreSum are sums. Divide recallToArrivalSeconds by arrivedAfterRecall for the average minutes from recall to arrival, and surveyScoreSum by surveyResponses for the average score. If the count is 0, do not give that average.",
  // A count of 0 is normal early in the day.
  "If most counts are 0, say that there is not much to report yet.",
  // Staff must never read demo numbers as real ones.
  "If the totals are for demo visits, start with \"Demo numbers:\".",
];

/** The system prompt: the rules joined into one block of text. */
export function summarySystemPrompt(): string {
  return SUMMARY_RULES.join("\n");
}

/** The user message: says whether the numbers are demo numbers, then the totals as JSON. */
export function summaryUserMessage(input: SummaryInput): string {
  const kind = input.isDemo ? "demo (made-up) visits" : "real visits";
  return `These are today's totals for ${kind} at sites A and B:\n${JSON.stringify(input.sites, null, 2)}`;
}
