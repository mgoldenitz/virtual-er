// Live updates: listens for the database's "something changed" signal and tells the screens
// to read again. The signal is one row holding only a time (the change_signal table), so
// nothing about any visit travels over this connection (SPEC rule 5). There is one
// connection per browser tab however many lists are listening.

import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabaseBrowser";

const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;

function tellEveryone(): void {
  listeners.forEach((tell) => tell());
}

/** Call `tell` whenever something changed in the database. Returns a function that stops listening. */
export function onChangeSignal(tell: () => void): () => void {
  listeners.add(tell);
  if (!channel) {
    try {
      channel = supabaseBrowser()
        .channel("change-signal")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "change_signal" }, tellEveryone)
        .subscribe((status) => {
          // Connected, or connected again after a drop: a signal may have been missed meanwhile.
          if (status === "SUBSCRIBED") tellEveryone();
        });
    } catch {
      // No live connection: the screens still read again on their timer.
    }
  }
  return () => {
    listeners.delete(tell);
    if (listeners.size === 0 && channel) {
      void supabaseBrowser().removeChannel(channel);
      channel = null;
    }
  };
}
