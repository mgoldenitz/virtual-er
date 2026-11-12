// Server only: reads whether off-site waiting is paused at each site, for /api/site-status.
// It reads only the site letter and the switch from site_settings (staff-only in the database),
// using the server's own connection, so browsers learn the switch without any database access.

import "server-only";
import { sitePausesFromRows, type SitePauses } from "@/lib/sitePause";
import { supabaseServer } from "./supabaseServer";

/** Both sites' switches, or null if the database could not be read. */
export async function readSitePauses(): Promise<SitePauses | null> {
  const { data, error } = await supabaseServer().from("site_settings").select("site, offsite_paused");
  if (error) {
    console.error("site-status: database refused", { code: error.code, message: error.message });
    return null;
  }
  return sitePausesFromRows(data);
}
