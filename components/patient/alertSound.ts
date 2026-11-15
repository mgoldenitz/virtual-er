// Plays the demo beep and vibration on the patient screen. iPhone Safari has no vibration for web pages, so only the beep plays there.

import { BEEP_HZ, BEEP_SECONDS, BEEP_VOLUME } from "@/lib/calledAlert";

/** The one shared sound player. It is made by unlockSound() after a tap, then reused. */
let context: AudioContext | null = null;

/** The browser's audio player class (Safari older versions use the webkit name). */
function audioContextClass(): typeof AudioContext | undefined {
  const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? webkitWindow.webkitAudioContext;
}

/**
 * Call this inside a button's click. Browsers allow sound only after a tap.
 * Gives true only when the sound player really started, false when the browser has no Web Audio or refused.
 */
export async function unlockSound(): Promise<boolean> {
  try {
    if (!context) {
      const AudioClass = audioContextClass();
      if (!AudioClass) return false;
      context = new AudioClass();
    }
    // resume() is called during the tap (the browser allows sound then); the wait comes after.
    await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

/** Plays one short beep (BEEP_HZ, BEEP_SECONDS long, at BEEP_VOLUME; see lib/calledAlert.ts) and a vibration where the phone allows it. */
export function playAlert(): void {
  try {
    if (context) {
      const ctx = context;
      // iPhone can pause the player while the page is hidden; start it again before each beep.
      if (ctx.state !== "running") void ctx.resume().catch(() => undefined);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.value = BEEP_HZ;
      // Start at BEEP_VOLUME and fade to almost silence at the end, so the beep does not click.
      gain.gain.setValueAtTime(BEEP_VOLUME, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + BEEP_SECONDS);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + BEEP_SECONDS);
    }
    if (typeof navigator.vibrate === "function") {
      navigator.vibrate([200, 100, 200]);
    }
  } catch {
    // Ignore sound and vibration errors. The on-screen words remain the real alert.
  }
}
