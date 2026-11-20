// The summary route's database read: checks that the sign-in token belongs to a staff account,
// then reads today's visits and daily_stats rows as that person, so the database rules still apply.
// It reads the same fields as the dashboard screen, never access_token or code.

import { createClient } from "@supabase/supabase-js";
import type { DailyStatsRow, DashboardVisit } from "@/lib/dashboardNumbers";
import { callerCheck } from "@/lib/callerCheck";
import { torontoDay } from "@/lib/torontoDay";
import { DASHBOARD_VISIT_FIELDS } from "./dashboardFields";
import { supabaseSettings } from "./supabaseSettings";

export type SummaryRows = { visits: DashboardVisit[]; stats: DailyStatsRow[]; today: string };

/** The rows for one mode, or why there are none: see lib/callerCheck.ts for the sign-in results. */
export async function readSummaryRows(
  token: string,
  isDemo: boolean,
): Promise<SummaryRows | "not_signed_in" | "not_staff" | "error"> {
  const { url, publishableKey } = supabaseSettings();
  const asCaller = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  // getUser asks Supabase to check the token, so a made-up token is refused here.
  const { data: userData, error: userError } = await asCaller.auth.getUser(token);
  const caller = callerCheck(userData.user, userError);
  if (caller !== "staff") return caller;

  const today = torontoDay(new Date().toISOString());
  const [visitRead, statsRead] = await Promise.all([
    asCaller.from("visits").select(DASHBOARD_VISIT_FIELDS).eq("is_demo", isDemo),
    asCaller.from("daily_stats").select("*").eq("is_demo", isDemo).eq("day", today),
  ]);
  if (visitRead.error || statsRead.error || !Array.isArray(visitRead.data) || !Array.isArray(statsRead.data)) {
    return "error";
  }
  return { visits: visitRead.data as DashboardVisit[], stats: statsRead.data as DailyStatsRow[], today };
}
