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
  // Goes up by 1 on each "Turn on sound" and "Turn off sound" tap. A slow result that belongs to an
  // earlier tap (a test beep, an unlock or a repeat beep) sees a different number and changes nothing.
  const attempt = useRef(0);
  // True while a tap on "Turn on sound" is still being handled. Stops a double tap from running twice.
  const busy = useRef(false);
  // The attempt number of a beep that still waits for the player (null when none), so the next beep of
  // the same attempt does not start on top of it. A beep of an older attempt does not block a new one.
  const beeping = useRef<number | null>(null);
  // True when the last state shown was "on", so focus can move when the sound goes off.
  const wasOn = useRef(false);

  async function turnOn() {
    if (busy.current) return;
    busy.current = true;
    const mine = ++attempt.current;
    try {
      const ok = await unlockSound();
      if (mine !== attempt.current) return;
      if (!ok) {
        setState("failed");
        return;
      }
      setState("on");
      // When the visit is already called, the effect below plays the alert, so no test beep is needed.
      // If the test beep cannot play, say so now, not only when the patient is called.
      // `beeping` is set before React runs the effect, so a status change to called does not beep twice.
      if (status !== "called") {
        beeping.current = mine;
        const played = await playAlert(() => mine === attempt.current);
        if (beeping.current === mine) beeping.current = null;
        if (mine === attempt.current && !played) setState("failed");
      }
    } finally {
      // After "Turn off sound" the next tap belongs to a new attempt, which turnOff() already freed.
      if (mine === attempt.current) busy.current = false;
    }
  }

  function turnOff() {
    attempt.current += 1;
    busy.current = false;
    setState("off");
    stopVibration();
  }

  // Focus follows the change, so it never drops to the top of the page when a button goes away.
  // On: move to the words "Sound is on" (read out when focused). From on to off or failed, for any
  // reason (a tap, a failed test beep, a failed repeat beep): move to "Turn on sound".
  useEffect(() => {
    if (state === "on") onWords.current?.focus();
    else if (wasOn.current) turnOnButton.current?.focus();
    wasOn.current = state === "on";
  }, [state]);

  // Play now if the rule allows it, then again every ALERT_REPEAT_MS, and when the page comes back on screen.
  // If the phone will not play the beep, the box goes back to "off" so the page can say so.
  useEffect(() => {
    const tick = () => {
      const mine = attempt.current;
      if (beeping.current === mine || !shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
      beeping.current = mine;
      void playAlert(() => mine === attempt.current).then((ok) => {
        if (beeping.current === mine) beeping.current = null;
        if (!ok && mine === attempt.current) setState("off");
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

  // When the box leaves the page ("I'm on my way"), a beep that still waits must not play, and a
  // vibration must stop.
  useEffect(() => {
    return () => {
      attempt.current += 1;
      stopVibration();
    };
  }, []);

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
      {/* Always on the page, so screen readers read a line when it appears. "Sound is on" stays out (see above). */}
      <div role="status">
        {note === "failed" && <p data-testid="sound-failed">{t.failed}</p>}
        {note === "offWhileCalled" && (
          <p data-testid="sound-off-called" className="font-semibold">
            {t.offWhileCalled}
          </p>
        )}
      </div>
    </div>
  );
}
