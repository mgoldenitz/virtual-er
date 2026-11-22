// Sends a staff question about today's numbers to the server (app/api/dashboard-chat), with the
// staff sign-in token and the last few turns, and turns the answer into the words the panel shows.

import { chatMessage, type ChatMessage } from "@/lib/chatMessage";
import type { ChatTurn } from "@/lib/chatRequest";
import { supabaseBrowser } from "./supabaseBrowser";

export async function fetchChatAnswer(isDemo: boolean, question: string, history: ChatTurn[]): Promise<ChatMessage> {
  try {
    const { data } = await supabaseBrowser().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return chatMessage(401, { result: "not_signed_in" });
    const response = await fetch("/api/dashboard-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isDemo, question, history }),
    });
    const body = response.status === 204 ? null : await response.json().catch(() => null);
    return chatMessage(response.status, body);
  } catch {
    // No connection: the fallback line says the numbers above are still correct.
    return chatMessage(0, null);
  }
}
