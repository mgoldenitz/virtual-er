"use client";

// The "I'm still here" prompt on the patient screen: shows 30 minutes after triage or after the
// last tap, while waiting off-site (lib/stillHere.ts). The tap only tells staff the patient is
// still following the visit; the screen says it is not a health check.

import { useEffect, useState } from "react";
import { recordStillHere } from "@/data/patientVisit";
import type { PatientView } from "@/lib/patientView";
import { stillHereState } from "@/lib/stillHere";
import { textFor } from "@/lib/text";
import { Button } from "@/components/Button";
import { useNow } from "@/components/useNow";

/** How long the thank-you stays after a tap. */
const THANKS_MS = 5 * 60_000;

export function StillHerePrompt({ view, token }: { view: PatientView; token: string }) {
  const now = useNow();
  const [sending, setSending] = useState(false);
  const [notSaved, setNotSaved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const t = textFor(view.language);
  const state = now ? stillHereState(view, now) : "not_due";
  const showing = state !== "not_due";

  // Tell screen readers once each time the prompt appears (politely; it is not urgent).
  useEffect(() => {
    if (!showing) return;
    const timer = window.setTimeout(() => setAnnouncement(t.announce.stillHere), 300);
    return () => {
      window.clearTimeout(timer);
      setAnnouncement("");
    };
  }, [showing, t.announce.stillHere]);

  const tapped = view.lastStillHereAt ? new Date(view.lastStillHereAt).getTime() : null;
  const thanking = !showing && now !== null && tapped !== null && now.getTime() - tapped < THANKS_MS;

  async function onTap() {
    if (sending) return;
    setSending(true);
    const result = await recordStillHere(token);
    setSending(false);
    setNotSaved(result === "not_saved");
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {showing && (
        <section
          aria-labelledby="still-here-heading"
          className="space-y-3 rounded-xl border-4 border-brand bg-card p-4"
          data-testid="still-here"
        >
          <h2 id="still-here-heading" className="text-xl font-bold">
            {t.stillHere.heading}
          </h2>
          <p>{t.stillHere.meaning}</p>
          <Button onClick={onTap} aria-disabled={sending} className="w-full text-lg">
            {sending ? t.patient.sending : t.stillHere.button}
          </Button>
          {notSaved && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {t.patient.notSaved}
            </p>
          )}
        </section>
      )}
      {thanking && (
        <p role="status" className="clean-card font-semibold" data-testid="still-here-thanks">
          {t.stillHere.thanks} {t.stillHere.meaning}
        </p>
      )}
    </>
  );
}
