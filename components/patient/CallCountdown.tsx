"use client";

// A ring on the called screen with the whole minutes left to tap "I'm on my way".
// It is not in a live region: CallReminder already announces the alerts, and a ticking number would be noise.

import { minutesLeftToTap } from "@/lib/callCountdown";
import { CALL_PHONE_AGAIN_MINUTES } from "@/lib/demoTimes";
import { fill, type PatientText } from "@/lib/text";
import { useNow } from "@/components/useNow";

const R = 26;
const LENGTH = 2 * Math.PI * R;

export function CallCountdown({ calledAt, t }: { calledAt: string | null; t: PatientText }) {
  const now = useNow();
  const minutes = now ? minutesLeftToTap(calledAt, now) : null;
  if (minutes === null) return null;
  const shown = LENGTH * (minutes / CALL_PHONE_AGAIN_MINUTES);
  return (
    <div className="flex items-center gap-3" data-testid="call-countdown">
      <svg aria-hidden="true" width="64" height="64" viewBox="0 0 64 64" className="shrink-0 -rotate-90">
        <circle cx="32" cy="32" r={R} fill="none" strokeWidth="6" className="stroke-control" />
        <circle
          cx="32"
          cy="32"
          r={R}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${shown} ${LENGTH}`}
          className="stroke-green-800"
        />
      </svg>
      <p className="text-lg">
        <strong className="text-2xl">{fill(t.progress.minutesLeft, { minutes: String(minutes) })}</strong>{" "}
        {t.progress.leftToTap}
      </p>
    </div>
  );
}
