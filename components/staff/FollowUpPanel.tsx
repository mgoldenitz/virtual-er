"use client";

// The no-response steps on one staff row after "Recall patient": the flag ("Phone this patient",
// "Review: unable to reach" and so on), the simulated phone-call buttons, and the nurse's
// confirmation of "unable to reach". The rule that picks the flag is in lib/followUp.ts.

import { confirmUnableToReachFor, recordPhoneCallFor } from "@/data/staffActions";
import { CALL_PHONE_AGAIN_MINUTES, CALL_REVIEW_MINUTES, CALL_SECOND_ALERT_MINUTES } from "@/lib/demoTimes";
import { canRecordPhoneCall, staffFollowUp, type StaffFollowUp } from "@/lib/followUp";
import { formatMinutes } from "@/lib/duration";
import { minutesBetween } from "@/lib/queue";
import type { ChangeResult, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = {
  visit: Visit;
  now: Date;
  saving: boolean;
  /** The row's save helper: saves one change and shows what happened. */
  act: (change: () => Promise<ChangeResult>, leftListMessage?: string) => void;
};

const AMBER = "border-amber-800 bg-amber-50 text-amber-950";
const RED = "border-red-800 bg-red-50 text-red-900";

const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** The words and colour of each flag; null when there is nothing to flag. */
function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): { text: string; tone: string } | null {
  switch (followUp.kind) {
    case "phone":
      return { text: `No reply ${CALL_SECOND_ALERT_MINUTES} min after call-back. Phone the patient now.`, tone: AMBER };
    case "phone_again": {
      // "again" only if someone already phoned; staff may have missed the first flag.
      const ask = visit.phone_attempts === 0 ? "Phone the patient now." : "Phone the patient again.";
      return { text: `Still no reply ${CALL_PHONE_AGAIN_MINUTES} min after call-back. ${ask}`, tone: AMBER };
    }
    case "paused":
      return { text: `Phoned, answered. Follow-up paused until ${clock(followUp.until)}.`, tone: AMBER };
    case "review":
      return {
        text: `Review: unable to reach. No answered call ${CALL_REVIEW_MINUTES} min after the call-back. Stays in the line until a nurse confirms.`,
        tone: RED,
      };
    case "contacted_not_arrived":
      return {
        text: "Answered the phone, but hasn’t arrived or tapped ‘I’m on my way’ yet.",
        tone: AMBER,
      };
    case "on_way_not_arrived": {
      const since = visit.confirmed_at ? minutesBetween(visit.confirmed_at, now) : 0;
      return { text: `On the way, not arrived. Confirmed ${formatMinutes(since)} ago.`, tone: AMBER };
    }
    default:
      return null;
  }
}

export function FollowUpPanel({ visit, now, saving, act }: Props) {
  const followUp = staffFollowUp(visit, now);
  const flag = flagFor(followUp, visit, now);
  const canPhone = canRecordPhoneCall(visit, now);
  // Screen readers hear each new flag once (politely). The minute counts are left out so the
  // words do not change, and so are not read again, every minute.
  const spoken = flag ? `Visit ${visit.code}: ${flag.text.replace(/ Confirmed [^.]+ ago\./, "")}` : "";
  const announcer = (
    <p role="status" className="sr-only">
      {spoken}
    </p>
  );
  // The announcer stays in the same place whether or not the rest shows, so it is never
  // re-created at the moment a flag appears (a new region is often not read).
  return (
    <>
      {announcer}
      {(flag || canPhone) && (
        <div className="mt-2 space-y-2" data-testid="follow-up">
          {flag && (
            <p className={`rounded-lg border-2 p-2 font-semibold ${flag.tone}`} data-testid={`flag-${followUp.kind}`}>
              {flag.text}
            </p>
          )}
          {canPhone && (
            <div className="space-y-2">
              <p className="text-sm text-slate-700">
                Simulated calls (the demo stores no phone numbers). Recorded so far: {visit.phone_attempts}
                {visit.last_phone_result && ` (last: ${visit.last_phone_result === "answered" ? "answered" : "no answer"})`}.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => recordPhoneCallFor(visit.id, "answered"))}>
                  Phoned, answered<span className="sr-only"> for visit {visit.code}</span>
                </Button>
                <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => recordPhoneCallFor(visit.id, "no_answer"))}>
                  Phoned, no answer<span className="sr-only"> for visit {visit.code}</span>
                </Button>
              </div>
            </div>
          )}
          {followUp.kind === "review" && (
            <details>
              <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
                Confirm unable to reach
              </summary>
              <p className="mt-1 text-sm">
                The visit leaves the off-site line. It is not recorded as left without being seen. Follow hospital policy outside the app.
              </p>
              <Button
                variant="danger"
                className="mt-2"
                aria-disabled={saving}
                onClick={() =>
                  act(
                    () => confirmUnableToReachFor(visit.id),
                    `Visit ${visit.code} confirmed unable to reach. Reopen is under Recently closed.`,
                  )
                }
              >
                Yes, unable to reach<span className="sr-only"> for visit {visit.code}</span>
              </Button>
            </details>
          )}
        </div>
      )}
    </>
  );
}
