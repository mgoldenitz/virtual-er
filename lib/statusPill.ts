// Decides the words and colour tone of the small status pills on the staff screen (visit rows and the site pause switch).
import type { VisitStatus } from "./visit";

export type PillTone = "wait" | "called" | "stop";

export type Pill = { label: string; tone: PillTone };

/** The pill for a visit row, or null when the status needs no pill. */
export function visitPill(status: VisitStatus): Pill | null {
  if (status === "waiting") return { label: "Waiting", tone: "wait" };
  if (status === "called") return { label: "Called", tone: "called" };
  if (status === "on_the_way") return { label: "On the way", tone: "called" };
  return null;
}

/** The pill for a site's off-site waiting switch, or null when the pause state is not known yet. */
export function sitePausePill(paused: boolean | null): Pill | null {
  if (paused === null) return null;
  return paused ? { label: "Paused", tone: "stop" } : { label: "Open", tone: "wait" };
}

/** The class names for each tone. The colours come from the tokens in app/globals.css. */
export const PILL_CLASS: Record<PillTone, string> = {
  wait: "bg-band text-brand-strong",
  called: "bg-ok-tint text-ok-ink",
  stop: "bg-stop-tint text-stop-ink",
};
