// Saves the checked day plan through the SQL function set_demo_plan, which checks the ranges again
// and is open only to the secret (service_role) key. It runs only on the server.

import "server-only";
import type { DemoPlan } from "@/lib/demoPlan";
import { supabaseServer } from "./supabaseServer";

/** Returns true when the database saved the plan. */
export async function saveDemoPlan(plan: DemoPlan): Promise<boolean> {
  const { error } = await supabaseServer().rpc("set_demo_plan", {
    p_seen_chance: plan.seen_chance,
    p_on_my_way_chance: plan.on_my_way_chance,
    p_still_here_chance: plan.still_here_chance,
    p_arrive_chance: plan.arrive_chance,
    p_quick_recall_chance: plan.quick_recall_chance,
    p_home_start_chance: plan.home_start_chance,
    p_desk_offer_chance: plan.desk_offer_chance,
    p_english_share: plan.english_share,
  });
  if (error) {
    console.error("demo-plan: database refused the plan", { code: error.code, message: error.message });
    return false;
  }
  return true;
}
