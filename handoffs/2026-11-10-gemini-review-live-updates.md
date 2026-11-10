# Review request: live updates through the change signal

Model: Gemini 3.1 Pro, High (or Gemini 3.6 Flash, High, if 3.1 Pro credits are still used up).

## Context

A demo "virtual ER waiting room" web app (Next.js App Router, TypeScript, Supabase). Synthetic data only.
Hard rule: patient pages must never subscribe to visit rows. They learn about changes from a
signal that holds no visit data, then re-read their own visit through a database function
(`get_patient_visit(token)`), which returns only patient-safe fields.

Database side (already in place, unchanged by this step):
- `change_signal` table: exactly one row, `(id smallint = 1, changed_at timestamptz)`.
- A statement-level trigger on `visits` and on `site_settings` sets `changed_at = now()` on every
  insert, update or delete.
- `anon` and `authenticated` may only SELECT it (RLS policy `using (true)`); it is the only table
  in the `supabase_realtime` publication.

## What changed

New file `data/changeSignal.ts`:

```ts
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabaseBrowser";

const listeners = new Set<() => void>();
let channel: RealtimeChannel | null = null;

function tellEveryone(): void {
  listeners.forEach((tell) => tell());
}

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
```

`data/keepFresh.ts` (the one re-read loop used by the patient visit and by the staff list) now also
reads on every signal, and if a signal arrives while a read is already on its way, it reads once
more afterwards (that read may have started before the change):

```ts
const RETRY_MS = 5_000;

export function keepFresh(read: () => Promise<void>, failing: () => boolean, everyMs: number): () => void {
  let stopped = false;
  let reading = false;
  let again = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const readNow = async () => {
    if (stopped) return;
    if (reading) { again = true; return; }
    reading = true;
    clearTimeout(timer);
    await read();
    reading = false;
    if (stopped) return;
    if (again && !failing()) { again = false; void readNow(); return; }
    again = false;
    timer = setTimeout(readNow, failing() ? RETRY_MS : everyMs);
  };
  const onBack = () => { if (document.visibilityState === "visible") void readNow(); };

  void readNow();
  document.addEventListener("visibilitychange", onBack);
  window.addEventListener("online", onBack);
  const stopListening = onChangeSignal(() => void readNow());
  return () => {
    stopped = true;
    stopListening();
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onBack);
    window.removeEventListener("online", onBack);
  };
}
```

The 15-second timer stays as a fallback in case a signal is missed. Staff screens re-read the
whole list (staff RLS allows it); the patient screen re-reads only through `get_patient_visit`.

## Checked

- Type check, lint, 72 unit tests pass.
- Browser test, two separate phone sessions (390 x 844): phone A open on its visit; phone B starts
  a visit; phone A re-read its visit 0.5 s later through the Realtime websocket.

## Questions

1. Does anything here let a patient page receive visit data over Realtime, or subscribe to anything
   other than the one-row signal?
2. Is the reconnect handling right? I rely on the status callback reporting `SUBSCRIBED` again after
   a dropped connection, and on the 15-second timer otherwise. Is a `CHANNEL_ERROR` / `TIMED_OUT`
   left stuck, so the tab never reconnects?
3. At demo size every change makes every open tab re-read. Any problem with that, or with the
   "read once more" rule (could it loop)?
4. Anything simpler that does the same job?

Please answer with a short list: problem, why it matters, suggested fix. Say "no change needed" if
something is fine.
