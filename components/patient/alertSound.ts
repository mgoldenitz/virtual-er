// Plays the demo beep and vibration on the patient screen. iPhone Safari has no vibration for web pages, so only the beep plays there.

import { BEEP_HZ, BEEP_SECONDS, BEEP_VOLUME } from "@/lib/calledAlert";

/** The one shared sound player. It is made by unlockSound() after a tap, then reused. */
let context: AudioContext | null = null;

/** The longest time unlockSound() and playAlert() wait for the player to start, in milliseconds. */
const RESUME_WAIT_MS = 1000;

/** The browser's audio player class (Safari older versions use the webkit name). */
function audioContextClass(): typeof AudioContext | undefined {
  const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? webkitWindow.webkitAudioContext;
}

/** True when the player is running and can make sound. */
function isRunning(ctx: AudioContext): boolean {
  return ctx.state === "running";
}

/** Waits this many milliseconds, then finishes. */
function waitAtMost(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Call this inside a button's click. Browsers allow sound only after a tap.
 * Gives true only when the sound player really started, false when the browser has no Web Audio or refused.
 */
export async function unlockSound(): Promise<boolean> {
  try {
    // A phone can close the player (for example when headphones change); then make a new one.
    if (!context || context.state === "closed") {
      const AudioClass = audioContextClass();
      if (!AudioClass) return false;
      context = new AudioClass();
    }
    // resume() is called during the tap (the browser allows sound then); the wait comes after.
    // A player that never answers gives false after RESUME_WAIT_MS, so the box can say so.
    const ctx = context;
    await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]);
    return isRunning(ctx);
  } catch {
    return false;
  }
}

/**
 * Plays one short beep (BEEP_HZ, BEEP_SECONDS long, at BEEP_VOLUME; see lib/calledAlert.ts) and a vibration where the phone allows it.
 * Gives true when the beep played. Gives false when it did not play (no player, the player would not start,
 * or `stillWanted` says no after the wait: the patient tapped "Turn off sound" or left the screen).
 */
export async function playAlert(stillWanted: () => boolean = () => true): Promise<boolean> {
  try {
    // Vibrate first, so the phone still vibrates when the beep cannot play.
    vibrate();
    if (!context) return false;
    const ctx = context;
    // iPhone can pause the player while the page is hidden; start it again before each beep.
    if (!isRunning(ctx)) {
      await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]);
      if (!isRunning(ctx) || !stillWanted()) return false;
    }
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
    return true;
  } catch {
    // Ignore sound and vibration errors. The on-screen words remain the real alert.
    return false;
  }
}

/**
 * True after the phone started a vibration for vibrate(), until stopVibration() stops it. Before a tap
 * the browser blocks every vibrate call with a console error, so stopVibration() calls only when needed.
 */
let vibrationStarted = false;

/** One vibration pattern (200 ms on, 100 ms off, 200 ms on) where the phone allows it. */
function vibrate(): void {
  try {
    if (typeof navigator.vibrate === "function") {
      // The browser gives back false when it blocks the call; then no vibration started.
      if (navigator.vibrate([200, 100, 200])) vibrationStarted = true;
    }
  } catch {
    // Ignore: the on-screen words remain the real alert.
  }
}

/** Stops a vibration that is running. Does nothing when no vibration started, or the phone has none. */
export function stopVibration(): void {
  if (!vibrationStarted) return;
  vibrationStarted = false;
  try {
    navigator.vibrate?.(0);
  } catch {
    // Ignore: the on-screen words remain the real alert.
  }
}
