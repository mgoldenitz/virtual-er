"use client";

// The extra message on the called screen when the patient has not tapped "I'm on my way":
// a second alert 10 minutes after the call-back, then "Please return now" at 20 minutes
// (lib/followUp.ts). Screen readers hear each one once, urgently.

import { useEffect, useState } from "react";
import { patientCallStep } from "@/lib/followUp";
import type { PatientView } from "@/lib/patientView";
import type { PatientText } from "@/lib/text";
import { useNow } from "@/components/useNow";

export function CallReminder({ view, t }: { view: PatientView; t: PatientText }) {
  const now = useNow();
  const step = now ? patientCallStep(view.status, view.calledAt, now) : "first";
  const words =
    step === "return_now" ? `${t.returnNow.lead} ${t.returnNow.text}` : step === "second_alert" ? t.secondAlert : "";
  const spoken = step === "return_now" ? words : step === "second_alert" ? t.announce.secondAlert : "";
  const [announcement, setAnnouncement] = useState("");

  // Announce once each time the step changes (empty first, so a repeat is still heard).
  useEffect(() => {
    if (!spoken) return;
    const timer = window.setTimeout(() => setAnnouncement(spoken), 300);
    return () => {
      window.clearTimeout(timer);
      setAnnouncement("");
    };
  }, [spoken]);

  return (
    <>
      <p aria-live="assertive" className="sr-only">
        {announcement}
      </p>
      {words && (
        <p
          className="rounded-lg border-4 border-red-800 bg-white p-3 text-lg font-bold text-red-900"
          data-testid={`call-reminder-${step}`}
        >
          {words}
        </p>
      )}
    </>
  );
}
