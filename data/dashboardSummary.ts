// Asks the server for the short summary of today's numbers (app/api/dashboard-summary), with the
// staff sign-in token, and turns the answer into the words the panel shows.

import { summaryMessage, type SummaryMessage } from "@/lib/summaryMessage";
import { supabaseBrowser } from "./supabaseBrowser";

export async function fetchDashboardSummary(isDemo: boolean): Promise<SummaryMessage> {
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return summaryMessage(401, { result: "not_signed_in" });
    const response = await fetch("/api/dashboard-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isDemo }),
    });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    return summaryMessage(response.status, body);
  } catch {
    // No connection: the fallback line says the numbers above are still correct.
    return summaryMessage(0, null);
  }
}
