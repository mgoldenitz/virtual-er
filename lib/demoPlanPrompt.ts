// The words the daily demo-plan route sends to Claude: the rules for a day plan, and the list of
// chances with their ranges. No visit, code, token or time of a visit goes in.

import { PLAN_FIELDS, PLAN_LIMITS } from "./demoPlan";

/** The rules Claude follows when it writes the day plan. Each line is one rule. */
export const DEMO_PLAN_RULES: string[] = [
  "You set the chances for a demo simulator of a virtual emergency department waiting room. All visits are made up.",
  // The numbers are chances per 5-minute tick or shares of new visits, never counts or minutes.
  "Give one number from 0 to 1 for each field. Stay inside the range given for each field.",
];

/** The system prompt: the rules joined into one block of text. */
export function demoPlanSystemPrompt(): string {
  return DEMO_PLAN_RULES.join("\n");
}

/** The user message: today's date (so each day differs) and each field with its meaning and range. */
export function demoPlanUserMessage(today: string): string {
  const lines = PLAN_FIELDS.map((field) => {
    const { meaning, min, max, normal } = PLAN_LIMITS[field];
    return `- ${field}: ${meaning}. Range ${min} to ${max}; a usual day is ${normal}.`;
  });
  return `Write the demo day plan for ${today}.\n${lines.join("\n")}`;
}
