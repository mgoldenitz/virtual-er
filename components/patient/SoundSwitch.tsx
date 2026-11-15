"use client";

// The "Turn on sound" box on the patient screen. Sound and vibration play only while the visit is
// called, the sound is turned on by a tap, and the page is open with the phone unlocked.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ALERT_REPEAT_MS, shouldAlert } from "@/lib/calledAlert";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";
import { playAlert, unlockSound } from "./alertSound";

export function SoundSwitch({ status, language }: { status: VisitStatus; language: string }) {
  const t = textFor(language).sound;
  const [soundOn, setSoundOn] = useState(false);
  const onWords = useRef<HTMLParagraphElement>(null);

  async function turnOn() {
    const ok = await unlockSound();
    if (!ok) return;
    setSoundOn(true);
    // When the visit is already called, the effect below plays the alert, so no test beep is needed.
    if (status !== "called") playAlert();
  }

  // The button goes away after the tap, so move keyboard and screen-reader focus to the words
  // "Sound is on" (they are read out when focused) instead of losing it to the top of the page.
  useEffect(() => {
    if (soundOn) onWords.current?.focus();
  }, [soundOn]);

  // Play now if the rule allows it, then again every ALERT_REPEAT_MS, and when the page comes back on screen.
  useEffect(() => {
    const tick = () => {
      if (shouldAlert(status, soundOn, document.visibilityState === "visible")) playAlert();
    };
    tick();
    const timer = window.setInterval(tick, ALERT_REPEAT_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [status, soundOn]);

  return (
    <section className="clean-card space-y-2">
      <p className="text-base">{t.notice}</p>
      {soundOn ? (
        <p ref={onWords} tabIndex={-1} className="font-semibold" data-testid="sound-on">
          {t.on}
        </p>
      ) : (
        <Button variant="secondary" onClick={turnOn} className="w-full">
          {t.turnOn}
        </Button>
      )}
    </section>
  );
}
