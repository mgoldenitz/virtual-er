"use client";

// The "Turn on sound" box on the patient screen. Sound and vibration play only while the visit is
// called, the sound is turned on by a tap, and the page is open with the phone unlocked.

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/Button";
import { ALERT_REPEAT_MS, type SoundState, shouldAlert, soundNote } from "@/lib/calledAlert";
import { textFor } from "@/lib/text";
import type { VisitStatus } from "@/lib/visit";
import { playAlert, stopVibration, unlockSound } from "./alertSound";

export function SoundSwitch({ status, language }: { status: VisitStatus; language: string }) {
  const t = textFor(language).sound;
  const [state, setState] = useState<SoundState>("off");
  const soundOn = state === "on";
  const onWords = useRef<HTMLParagraphElement>(null);
  const turnOnButton = useRef<HTMLButtonElement>(null);
  // True while a tap on "Turn on sound" is still being handled. Stops a double tap from running twice.
  const busy = useRef(false);
  // True after "Turn off sound" is tapped, so focus can move to "Turn on sound" once it is back on screen.
  const focusTurnOn = useRef(false);

  async function turnOn() {
    if (busy.current) return;
    busy.current = true;
    try {
      const ok = await unlockSound();
      if (!ok) {
        setState("failed");
        return;
      }
      setState("on");
      // When the visit is already called, the effect below plays the alert, so no test beep is needed.
      // If the test beep cannot play, say so now, not only when the patient is called.
      if (status !== "called" && !(await playAlert())) setState("failed");
    } finally {
      busy.current = false;
    }
  }

  function turnOff() {
    focusTurnOn.current = true;
    setState("off");
    stopVibration();
  }

  // The button goes away after the tap, so move keyboard and screen-reader focus to the words
  // "Sound is on" (they are read out when focused) instead of losing it to the top of the page.
  useEffect(() => {
    if (soundOn) onWords.current?.focus();
  }, [soundOn]);

  // After "Turn off sound", the "Turn on sound" button is back: move focus to it, so focus is not lost.
  useEffect(() => {
    if (state === "off" && focusTurnOn.current) {
      focusTurnOn.current = false;
      turnOnButton.current?.focus();
    }
  }, [state]);

  // Play now if the rule allows it, then again every ALERT_REPEAT_MS, and when the page comes back on screen.
  // If the phone will not play the beep, the box goes back to "off" so the page can say so.
  useEffect(() => {
    const tick = () => {
      if (!shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
      void playAlert().then((ok) => {
        if (!ok) setState("off");
      });
    };
    tick();
    const timer = window.setInterval(tick, ALERT_REPEAT_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [status, soundOn]);

  const note = soundNote(status, state);

  return (
    <div className="clean-card space-y-2">
      <p className="text-base">{t.notice}</p>
      {soundOn ? (
        <>
          <p ref={onWords} tabIndex={-1} className="font-semibold" data-testid="sound-on">
            {t.on}
          </p>
          <Button variant="secondary" onClick={turnOff} className="w-full">
            {t.turnOff}
          </Button>
        </>
      ) : (
        <Button ref={turnOnButton} variant="secondary" onClick={turnOn} className="w-full">
          {t.turnOn}
        </Button>
      )}
      {note === "failed" && <p data-testid="sound-failed">{t.failed}</p>}
      {note === "offWhileCalled" && (
        <p data-testid="sound-off-called" className="font-semibold">
          {t.offWhileCalled}
        </p>
      )}
    </div>
  );
}
