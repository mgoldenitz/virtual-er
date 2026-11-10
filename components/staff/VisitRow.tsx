"use client";

// One patient in the staff's off-site list: minutes waited, call-back progress and actions.

import { useState } from "react";
import { callBackVisit, markVisitArrived, removeVisit } from "@/data/staffActions";
import { minutesBetween } from "@/lib/queue";
import type { Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = { visit: Visit; now: Date; onShowSlip: (visit: Visit) => void };

function progress(visit: Visit, now: Date): string {
  if (visit.status === "waiting") return "Waiting off-site";
  const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
  const steps = [`Called ${sinceCall} min ago`];
  if (visit.seen_at) steps.push("Seen");
  if (visit.status === "on_the_way") steps.push("On the way");
  return steps.join(" · ");
}

export function VisitRow({ visit, now, onShowSlip }: Props) {
  const [note, setNote] = useState("");
  const act = (ok: boolean) => setNote(ok ? "" : "The list just changed. Check this patient again.");
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
        <Button variant="secondary" onClick={() => act(markVisitArrived(visit.id))}>
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
          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "left"))}>
            Left
          </Button>
          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "no_show"))}>
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
