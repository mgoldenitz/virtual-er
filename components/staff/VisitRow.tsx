"use client";

// One patient in the staff's off-site list: minutes waited, call-back progress and actions.
// The no-response flags and phone-call buttons are in FollowUpPanel.

import { useState } from "react";
import { callBackVisit, issueNewVisitLink, markVisitArrived, removeVisit } from "@/data/staffActions";
import { minutesBetween } from "@/lib/queue";
import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
import type { ChangeResult, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";
import { FollowUpPanel } from "./FollowUpPanel";
import { NewLinkPanel } from "./NewLinkPanel";

type Props = {
  visit: Visit;
  now: Date;
  onShowSlip: (visit: Visit) => void;
  /** Called after a change takes this patient off the list, so the page can say so and move focus. */
  onLeftList: (message: string) => void;
};

const NOT_SAVED = "Not saved: the database could not be reached. Try again.";
const CHANGED = "The list just changed. Check this patient again.";

function progress(visit: Visit, now: Date): string {
  if (visit.status === "waiting") {
    // "I'm still here" only shows the patient is still following the visit; never a health check.
    const lastTap = lastTapThisWait({ triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at });
    return lastTap
      ? `Waiting off-site · last "I'm still here" ${minutesBetween(lastTap, now)} min ago`
      : "Waiting off-site";
  }
  const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
  const steps = [`Called ${sinceCall} min ago`];
  // seen_at means the called screen was displayed on the phone, not that the patient read it.
  if (visit.seen_at) steps.push("Seen (screen shown, not necessarily read)");
  if (visit.status === "on_the_way") steps.push("On the way");
  return steps.join(" · ");
}

export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  /** A short "it worked" message, for a change that keeps the patient on the list. */
  const [okNote, setOkNote] = useState("");
  /** Save one change and show what happened. `leftListMessage` is announced when the patient leaves the list. */
  const act = async (change: () => Promise<ChangeResult>, leftListMessage?: string) => {
    if (saving) return; // while one change is on its way, further presses do nothing
    setSaving(true);
    setOkNote("");
    const result = await change();
    setSaving(false);
    if (result === "saved" && leftListMessage) {
      onLeftList(leftListMessage);
    }
    setNote(result === "saved" ? "" : result === "not_saved" ? NOT_SAVED : CHANGED);
  };
  /** After "Issue a new link" saves: open the slip with the new QR code and say what happened. */
  const showNewLink = (updated: Visit) => {
    onShowSlip(updated);
    setOkNote(`New link issued for ${visit.code}. The old link no longer works.`);
  };
  const waited = visit.triaged_at ? minutesBetween(visit.triaged_at, now) : 0;

  return (
    <li className="rounded-xl border-2 border-slate-300 bg-white p-4" data-testid={`row-${visit.code}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xl font-bold tracking-widest">{visit.code}</p>
        <p>
          CTAS {visit.ctas_level} · waited <strong>{waited} min</strong>
        </p>
      </div>
      <p className="mt-1 font-semibold" data-testid="progress">
        {progress(visit, now)}
      </p>
      {stillHereState({ status: visit.status, triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at }, now) ===
        "missed" && (
        <p className="mt-2 rounded-lg border-2 border-red-800 bg-red-50 p-2 font-semibold text-red-900" data-testid="still-here-flag">
          Missed &ldquo;I&apos;m still here&rdquo;: no tap within {STILL_HERE_ANSWER_WITHIN_MINUTES} min of the prompt. Not a health check.
        </p>
      )}
      <FollowUpPanel visit={visit} now={now} saving={saving} act={act} />
      <div className="mt-3 flex flex-wrap gap-2">
        {visit.status === "waiting" && (
          <Button aria-disabled={saving} onClick={() => act(() => callBackVisit(visit.id))}>
            Recall patient<span className="sr-only"> {visit.code}</span>
          </Button>
        )}
        <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => markVisitArrived(visit.id), `Visit ${visit.code} marked arrived. Undo is under Recently closed.`)}>
          Mark arrived
        </Button>
        <Button variant="secondary" onClick={() => onShowSlip(visit)}>
          Show QR again
        </Button>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
          Remove from list
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="danger" aria-disabled={saving} onClick={() => act(() => removeVisit(visit.id, "left"), `Visit ${visit.code} removed: left. Undo is under Recently closed.`)}>
            Left
          </Button>
          <Button variant="danger" aria-disabled={saving} onClick={() => act(() => removeVisit(visit.id, "no_show"), `Visit ${visit.code} removed: no-show. Undo is under Recently closed.`)}>
            No-show
          </Button>
        </div>
      </details>
      <NewLinkPanel code={visit.code} saving={saving} onConfirm={() => act(() => issueNewVisitLink(visit.id, showNewLink))} />
      {(saving || note || okNote) && (
        <p role="status" className={`mt-2 font-semibold ${saving || !note ? "" : "text-red-800"}`}>
          {saving ? "Saving…" : note || okNote}
        </p>
      )}
    </li>
  );
}
