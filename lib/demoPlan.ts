// Checks the demo "day plan" that Claude writes once a day: the chances the demo simulator uses.
// Every number is kept inside a safe range, a missing or bad number gets today's fixed value, and
// any other field is dropped. Claude never sets a CTAS level or the recall minutes (SPEC.md line 118).

/** The names of the chances in a day plan. Each one is a number from 0 to 1. */
export type DemoPlanField =
  | "seen_chance"
  | "on_my_way_chance"
  | "still_here_chance"
  | "arrive_chance"
  | "quick_recall_chance"
  | "home_start_chance"
  | "desk_offer_chance"
  | "english_share";

export type DemoPlan = Record<DemoPlanField, number>;

type Limit = { normal: number; min: number; max: number; meaning: string };

/**
 * normal is the number the simulator used before day plans (so no plan acts like before).
 * The same min and max are checked again in the SQL function set_demo_plan.
 */
export const PLAN_LIMITS: Record<DemoPlanField, Limit> = {
  seen_chance: { normal: 0.7, min: 0.3, max: 0.95, meaning: "chance a demo patient taps Seen in a tick" },
  on_my_way_chance: { normal: 0.7, min: 0.3, max: 0.95, meaning: "chance a recalled demo patient taps I'm on my way" },
  still_here_chance: { normal: 0.7, min: 0.3, max: 0.95, meaning: "chance a demo patient answers I'm still here" },
  arrive_chance: { normal: 0.5, min: 0.2, max: 0.9, meaning: "chance a demo patient on the way arrives in a tick" },
  quick_recall_chance: { normal: 0.5, min: 0.3, max: 0.7, meaning: "chance the next recall comes after 12 minutes, not 18" },
  home_start_chance: { normal: 0.1, min: 0.02, max: 0.3, meaning: "chance a new demo visit starts from home in a tick" },
  desk_offer_chance: { normal: 0.8, min: 0.5, max: 0.95, meaning: "share of new desk visits offered the virtual wait" },
  english_share: { normal: 0.7, min: 0.3, max: 0.9, meaning: "share of new demo visits in English" },
};

export const PLAN_FIELDS = Object.keys(PLAN_LIMITS) as DemoPlanField[];

/** The plan the simulator used before day plans existed. */
export function normalPlan(): DemoPlan {
  return Object.fromEntries(PLAN_FIELDS.map((field) => [field, PLAN_LIMITS[field].normal])) as DemoPlan;
}

/** Keeps one number inside its range; a value that is not a finite number gets the normal value. */
function keepInRange(value: unknown, limit: Limit): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return limit.normal;
  const inRange = Math.min(limit.max, Math.max(limit.min, value));
  return Math.round(inRange * 100) / 100; // two decimals, the same as the SQL numeric(3,2) columns
}

/** Turns anything (Claude's parsed JSON) into a safe plan. Fields not in PLAN_LIMITS are dropped. */
export function checkDemoPlan(raw: unknown): DemoPlan {
  const given = raw !== null && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return Object.fromEntries(
    PLAN_FIELDS.map((field) => [field, keepInRange(Object.hasOwn(given, field) ? given[field] : undefined, PLAN_LIMITS[field])]),
  ) as DemoPlan;
}

/** The JSON schema for Claude's structured output: one number per field, nothing else. */
export function demoPlanSchema(): Record<string, unknown> {
  return {
    type: "object",
    properties: Object.fromEntries(
      PLAN_FIELDS.map((field) => [field, { type: "number", description: PLAN_LIMITS[field].meaning }]),
    ),
    required: PLAN_FIELDS,
    additionalProperties: false,
  };
}
