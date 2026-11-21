"use client";

// The "I'm still here" prompt on the patient screen: shows 30 minutes after triage or after the
// last tap, while waiting off-site (lib/stillHere.ts). The tap only tells staff the patient is
// still following the visit; the screen says it is not a health check.

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { recordStillHere } from "@/data/patientVisit";
import type { PatientView } from "@/lib/patientView";
import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
import { textFor } from "@/lib/text";
import { Button } from "@/components/Button";
import { useNow } from "@/components/useNow";
import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";

/** How long the thank-you stays after a tap. */
const THANKS_MS = 5 * 60_000;
/** How long the hidden box keeps the thank-you, so a screen reader has time to speak it. */
const THANKS_SPOKEN_MS = 3_000;

type Props = {
  view: PatientView;
  token: string;
  language: string;
  /** The flag shared with the status screen, which stays on the page when this prompt leaves on a recall. */
  lostFocus?: RefObject<boolean>;
};

export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
  const now = useNow();
  const [sending, setSending] = useState(false);
  const [notSaved, setNotSaved] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const t = textFor(language);
  const state = now ? stillHereState(view, now) : "not_due";
  const showing = state !== "not_due";
  // When the prompt hides, a failed tap's alert goes, so it cannot come back with the next prompt.
  // Set during render, not in an effect, as `failedIn` in VisitScreen.tsx.
  if (!showing && notSaved) setNotSaved(false);
  // If the prompt leaves with focus inside it (after the tap), focus goes to the status heading.
  // With the shared flag, the status screen also does this when the whole prompt leaves on a recall.
  const ownFlag = useRef(false);
  const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);

  // Tell screen readers once each time the prompt appears (politely; it is not urgent).
  useEffect(() => {
    if (!showing) return;
    const timer = window.setTimeout(() => setAnnouncement(t.announce.stillHere), 300);
    return () => {
      window.clearTimeout(timer);
      setAnnouncement("");
    };
  }, [showing, t.announce.stillHere]);

  // A switch to off-site waiting stamps the same moment in last_still_here_at: lastTapThisWait skips it.
  const tapAt = lastTapThisWait({
    triagedAt: view.triagedAt,
    lastStillHereAt: view.lastStillHereAt,
    offeredAt: view.offeredAt,
  });
  const tapped = tapAt ? new Date(tapAt).getTime() : null;
  const thanking = !showing && now !== null && tapped !== null && now.getTime() - tapped < THANKS_MS;

  // After a few seconds the hidden box goes empty, so a swipe reads the thank-you only on the card.
  const [thanksSpoken, setThanksSpoken] = useState(false);
  useEffect(() => {
    if (!thanking) return;
    const timer = window.setTimeout(() => setThanksSpoken(true), THANKS_SPOKEN_MS);
    return () => {
      window.clearTimeout(timer);
      setThanksSpoken(false);
    };
  }, [thanking]);

  async function onTap() {
    if (sending) return;
    setSending(true);
    setNotSaved(false); // a new tap clears the last failed save's alert while it saves
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
        <PromptCard onFocusLost={markLost}>
          <h2 id="still-here-heading" className="text-2xl font-bold">
            {t.stillHere.heading}
          </h2>
          <p>{t.stillHere.meaning}</p>
          <Button onClick={onTap} aria-disabled={sending} className="w-full text-lg">
            {sending ? t.patient.sending : t.stillHere.button}
          </Button>
          {notSaved && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {t.stillHere.notSaved}
            </p>
          )}
        </PromptCard>
      )}
      {/* Always on the page and always hidden, so screen readers hear the thank-you when its text
          comes in. It empties after a few seconds. The card below shows the same words on screen,
          and a screen reader user can touch it to hear them again. */}
      <p role="status" aria-atomic="true" className="sr-only" data-testid="still-here-thanks">
        {thanking && !thanksSpoken ? `${t.stillHere.thanks} ${t.stillHere.meaning}` : ""}
      </p>
      {thanking && (
        <p className="clean-card font-semibold" data-testid="still-here-card">
          {t.stillHere.thanks} {t.stillHere.meaning}
        </p>
      )}
    </>
  );
}

/** The prompt's box. It tells the prompt when it leaves the page with focus inside it. */
function PromptCard({ onFocusLost, children }: { onFocusLost: () => void; children: ReactNode }) {
  const box = useRef<HTMLElement>(null);
  useReportFocusOnLeave(box, onFocusLost);
  return (
    <section
      ref={box}
      aria-labelledby="still-here-heading"
      className="space-y-3 rounded-xl border-4 border-brand bg-card p-4"
      data-testid="still-here"
    >
      {children}
    </section>
  );
}
