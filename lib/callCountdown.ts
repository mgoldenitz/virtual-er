// The countdown on the called screen: whole minutes left before "Please return now"
// (CALL_PHONE_AGAIN_MINUTES after called_at). Null when there is no call time.

import { CALL_PHONE_AGAIN_MINUTES } from "./demoTimes";

const MINUTE_MS = 60_000;

export function minutesLeftToTap(calledAt: string | null, now: Date): number | null {
  if (!calledAt) return null;
  const left = CALL_PHONE_AGAIN_MINUTES - (now.getTime() - new Date(calledAt).getTime()) / MINUTE_MS;
  return Math.max(0, Math.ceil(left));
}
