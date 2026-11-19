// Asks the server to send the ntfy alert for visits staff just recalled (app/api/recall-alert).
// The alert is extra: the recall is already saved, so every error here is ignored.

import { supabaseBrowser } from "./supabaseBrowser";

export async function sendRecallAlert(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch("/api/recall-alert", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids }),
    });
  } catch {
    // No alert this time; the patient's screen still shows the recall.
  }
}
