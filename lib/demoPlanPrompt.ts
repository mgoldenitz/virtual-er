// The words the daily demo-plan route sends to Claude: the rules for a day plan, and the list of
// chances with their ranges. No visit, code, token or time of a visit goes in.

import { PLAN_FIELDS, PLAN_LIMITS } from "./demoPlan";

/** The rules Claude follows when it writes the day plan. Each line is one rule. */
const DEMO_PLAN_RULES: string[] = [
  "You set the chances for a demo simulator of a virtual emergency department waiting room. All visits are made up.",
  // The numbers are chances per 5-minute tick or shares of new visits, never counts or minutes.
  "Give one number from 0 to 1 for each field. Stay inside the range given for each field.",
  // Without a theme, Claude can give the usual numbers every day, and every demo day looks the same.
  "Pick one theme for the day, for example a quiet day, a busy day, or a day when many patients are slow to answer, and move the related numbers together to match it.",
  // A weekend day looks different from a weekday, so the date in the message has a use.
  "On a Saturday or Sunday, make home starts and quick recalls a little more likely than on a weekday.",
  // Staff demo the dashboard with these numbers; extreme values everywhere can look like a broken app.
  "Keep at least half of the numbers close to their usual value, so the demo still looks like a normal waiting room.",
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
