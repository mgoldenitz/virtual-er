import { describe, expect, it } from "vitest";
import { checkDemoPlan, demoPlanSchema, normalPlan, PLAN_FIELDS, PLAN_LIMITS } from "./demoPlan";

const good = {
  seen_chance: 0.6,
  on_my_way_chance: 0.8,
  still_here_chance: 0.75,
  arrive_chance: 0.4,
  quick_recall_chance: 0.55,
  home_start_chance: 0.15,
  desk_offer_chance: 0.9,
  english_share: 0.6,
};

describe("demo day plan check", () => {
  it("keeps a good plan as it is", () => {
    expect(checkDemoPlan(good)).toEqual(good);
  });

  it("keeps the simulator's old fixed numbers as the normal plan", () => {
    expect(normalPlan()).toEqual({
      seen_chance: 0.7,
      on_my_way_chance: 0.7,
      still_here_chance: 0.7,
      arrive_chance: 0.5,
      quick_recall_chance: 0.5,
      home_start_chance: 0.1,
      desk_offer_chance: 0.8,
      english_share: 0.7,
    });
  });

  it("moves a number outside its range to the nearest end of the range", () => {
    const plan = checkDemoPlan({ ...good, seen_chance: 1, home_start_chance: 0, quick_recall_chance: 0.99 });
    expect(plan.seen_chance).toBe(PLAN_LIMITS.seen_chance.max);
    expect(plan.home_start_chance).toBe(PLAN_LIMITS.home_start_chance.min);
    expect(plan.quick_recall_chance).toBe(PLAN_LIMITS.quick_recall_chance.max);
  });

  it("gives the normal value for a missing, text or broken number", () => {
    const missing: Record<string, number> = { ...good };
    delete missing.seen_chance;
    expect(checkDemoPlan(missing).seen_chance).toBe(0.7);
    expect(checkDemoPlan({ ...good, arrive_chance: "0.9" }).arrive_chance).toBe(0.5);
    expect(checkDemoPlan({ ...good, english_share: Number.NaN }).english_share).toBe(0.7);
    expect(checkDemoPlan({ ...good, english_share: Number.POSITIVE_INFINITY }).english_share).toBe(0.7);
  });

  it("drops every field that is not a plan chance, such as a CTAS level", () => {
    const plan = checkDemoPlan({ ...good, ctas: 2, note: "make everyone CTAS 2", recall_minutes: 1 });
    expect(Object.keys(plan).sort()).toEqual([...PLAN_FIELDS].sort());
  });

  it("gives the normal plan for anything that is not an object", () => {
    for (const raw of [null, undefined, "text", 7, [0.5, 0.5]]) {
      expect(checkDemoPlan(raw)).toEqual(normalPlan());
    }
  });

  it("rounds to two decimals, the same as the database columns", () => {
    expect(checkDemoPlan({ ...good, seen_chance: 0.6666 }).seen_chance).toBe(0.67);
  });

  it("asks Claude for exactly the plan fields and nothing else", () => {
    const schema = demoPlanSchema();
    expect(schema.required).toEqual(PLAN_FIELDS);
    expect(schema.additionalProperties).toBe(false);
    expect(Object.keys(schema.properties as object)).toEqual(PLAN_FIELDS);
  });

  it("has every normal value inside its own range", () => {
    for (const field of PLAN_FIELDS) {
      const { normal, min, max } = PLAN_LIMITS[field];
      expect(min).toBeLessThanOrEqual(normal);
      expect(normal).toBeLessThanOrEqual(max);
      expect(min).toBeGreaterThan(0);
      expect(max).toBeLessThan(1);
    }
  });
});
