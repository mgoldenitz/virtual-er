"use client";

// One patient in the staff's off-site list: minutes waited, call-back progress and actions.

import { useState } from "react";
import { callBackVisit, markVisitArrived, removeVisit } from "@/data/staffActions";
import type { ChangeResult } from "@/data/visitStore";
import { minutesBetween } from "@/lib/queue";
import type { Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = {
  visit: Visit;
  now: Date;
  onShowSlip: (visit: Visit) => void;
  /** Called after a change that takes this patient off the list, with a message for screen readers. */
  onLeftList: (message: string) => void;
};

const NOT_SAVED = "Not saved: this browser could not store the change. Try again.";
const CHANGED = "The list just changed. Check this patient again.";

function progress(visit: Visit, now: Date): string {
  if (visit.status === "waiting") return "Waiting off-site";
  const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
  const steps = [`Called ${sinceCall} min ago`];
  if (visit.seen_at) steps.push("Seen");
  if (visit.status === "on_the_way") steps.push("On the way");
  return steps.join(" · ");
}

export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
  const [note, setNote] = useState("");
  /** Show what happened. `leftListMessage` is announced when the patient leaves the list. */
  const act = (result: ChangeResult, leftListMessage?: string) => {
    if (result === "saved" && leftListMessage) onLeftList(leftListMessage);
    setNote(result === "saved" ? "" : result === "not_saved" ? NOT_SAVED : CHANGED);
  };
  const waited = visit.triaged_at ? minutesBetween(visit.triaged_at, now) : 0;

  return (
    <li className="rounded-xl border-2 border-slate-300 p-4" data-testid={`row-${visit.code}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xl font-bold tracking-widest">{visit.code}</p>
        <p>
          CTAS {visit.ctas_level} · waited <strong>{waited} min</strong>
        </p>
      </div>
      <p className="mt-1 font-semibold" data-testid="progress">
        {progress(visit, now)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visit.status === "waiting" && (
          <Button onClick={() => act(callBackVisit(visit.id))}>Call back</Button>
        )}
        <Button variant="secondary" onClick={() => act(markVisitArrived(visit.id), `Visit ${visit.code} marked arrived.`)}>
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
          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "left"), `Visit ${visit.code} removed: left.`)}>
            Left
          </Button>
          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "no_show"), `Visit ${visit.code} removed: no-show.`)}>
            No-show
          </Button>
        </div>
      </details>
      {note && (
        <p role="status" className="mt-2 font-semibold text-red-800">
          {note}
        </p>
      )}
    </li>
  );
}
