// Finds call-back progress worth telling staff screen readers about: a patient's called
// screen was shown, or a patient tapped "I'm on my way". Minute counters are never included.

import type { Visit } from "./visit";

/** Messages for visits that gained "Seen" or "On the way" between two readings of the list. */
export function progressChanges(before: Visit[], after: Visit[]): string[] {
  const old = new Map(before.map((v) => [v.id, v]));
  const messages: string[] = [];
  for (const visit of after) {
    const was = old.get(visit.id);
    if (!was) continue;
    // Compare the event times, not the status, so an Undo that restores a status is not news.
    if (visit.status === "on_the_way" && visit.confirmed_at && !was.confirmed_at) {
      messages.push(`Visit ${visit.code}: patient is on the way.`);
    } else if (visit.seen_at && !was.seen_at && visit.status === "called") {
      messages.push(`Visit ${visit.code}: called screen was shown on the patient's phone.`);
    }
  }
  return messages;
}
