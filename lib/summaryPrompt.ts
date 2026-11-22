// The words the dashboard summary route sends to Claude: the rules Claude must follow, and the
// day's totals as JSON. Only the totals from lib/summaryInput.ts go in, never a code, token or time.

import type { SummaryInput } from "./summaryInput";

/** The rules about reading the numbers. The chat in lib/chatPrompt.ts uses the same list. */
export const SUMMARY_NUMBER_RULES: string[] = [
  // Keeps Claude to facts that are in the totals.
  "Use only the numbers you are given. Do not guess why a number is high or low.",
  // SPEC rule 2: the app never makes clinical decisions.
  "Never give medical or clinical advice, and never suggest a change to triage or to who waits off-site.",
  // The totals hold sums, not averages; this stops a wrong average.
  "recallToArrivalSeconds and surveyScoreSum are sums. Divide recallToArrivalSeconds by arrivedAfterRecall, then by 60, and round to the nearest whole minute for the average minutes from recall to arrival. Divide surveyScoreSum by surveyResponses for the average score. If the count is 0, do not give that average.",
  // The wait total is a sum in seconds, like recallToArrivalSeconds.
  "offerToCallSeconds is the sum, in seconds, of the time from offer to recall over the recalled visits. Divide it by recalled, then by 60, and round to the nearest whole minute for the average minutes from offer to recall. If recalled is 1, give it as the wait of the one recalled visit, not as an average. If recalled is 0 at a site, give no wait numbers for that site.",
  // The 4 bands count only recalled visits, so they add up to recalled. The minutes are rounded, as in lib/waitBand.ts.
  "waitUnder30, wait30to59, wait60to119 and wait120plus count the recalled visits by minutes from offer to recall, rounded to the nearest whole minute: under 30, 30 to 59, 60 to 119, and 120 or more.",
  // A count of 0 is normal early in the day.
  "If most counts are 0, say that there is not much to report yet.",
  // Staff must never read demo numbers as real ones.
  "If the totals are for demo visits, start with \"Demo numbers:\".",
];

/** The rules Claude follows when it writes the summary. Each line is one rule. */
export const SUMMARY_RULES: string[] = [
  "You write a short summary of today's numbers for emergency department staff.",
  // Keeps the answer short and easy to read on the dashboard.
  "Write 2 or 3 short sentences in plain English. No headings, lists, bold or emoji.",
  ...SUMMARY_NUMBER_RULES,
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
