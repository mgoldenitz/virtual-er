"use client";

// Tells staff screen readers when a called patient's screen was shown or the patient tapped
// "I'm on my way". The minutes-waited counters are never announced.

import { useState } from "react";
import { progressChanges } from "@/lib/progressChanges";
import type { Site, Visit } from "@/lib/visit";

export function ProgressAnnouncer({ visits, site }: { visits: Visit[]; site: Site }) {
  const [previous, setPrevious] = useState(visits);
  const [text, setText] = useState("");

  // Compare with the last list the moment it changes (the list object only changes when data does).
  if (visits !== previous) {
    setPrevious(visits);
    const messages = progressChanges(previous, visits.filter((v) => v.site === site));
    if (messages.length > 0) setText(messages.join(" "));
  }

  return (
    <p aria-live="polite" className="sr-only">
      {text}
    </p>
  );
}
