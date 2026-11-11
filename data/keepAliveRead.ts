// The keep-alive job's one tiny database read: the time on the change signal (the same
// one-row table every screen may already read). It touches no visit data and uses only the
// publishable key, so it can do no more than any visitor's browser.

import { createClient } from "@supabase/supabase-js";
import { supabaseSettings } from "./supabaseSettings";

/** Returns true if the database answered. */
export async function keepAliveRead(): Promise<boolean> {
  const { url, publishableKey } = supabaseSettings();
  const supabase = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.from("change_signal").select("changed_at").limit(1);
  if (error) {
    console.error("keep-alive: database refused", { code: error.code, message: error.message });
    return false;
  }
  return Array.isArray(data);
}
