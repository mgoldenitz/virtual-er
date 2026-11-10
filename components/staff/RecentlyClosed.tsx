"use client";

// The staff "Recently closed" list: the last few patients marked arrived, left or no-show at
// this site, each with its own Undo button. There is no time limit, so nobody has to hurry.

import { useState } from "react";
import { undoCloseVisit } from "@/data/staffActions";
import { closedLabel, recentlyClosed } from "@/lib/recentlyClosed";
import type { Site, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = {
  visits: Visit[];
  site: Site;
  /** Called after an Undo, with words for screen readers; `undone` is true when it worked. */
  onUndoResult: (message: string, undone: boolean) => void;
};

export function RecentlyClosed({ visits, site, onUndoResult }: Props) {
  // A failure note stays beside its own row, and the row (with its Undo button) stays too.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const closed = recentlyClosed(visits, site);
  if (closed.length === 0) return null;

  const undo = (visit: Visit) => {
    const result = undoCloseVisit(visit.id, visit.closed_at!);
    const note =
      result === "saved"
        ? ""
        : result === "not_saved"
          ? `Not saved: this browser could not undo visit ${visit.code}. Try again.`
          : `Could not undo visit ${visit.code}: it changed since it was closed.`;
    setNotes({ ...notes, [visit.id]: note });
    onUndoResult(result === "saved" ? `Undone: visit ${visit.code} is back on the list.` : note, result === "saved");
  };

  return (
    <section aria-labelledby="closed-heading" className="space-y-2">
      <h3 id="closed-heading" className="text-lg font-bold">
        Recently closed
      </h3>
      <p className="text-sm text-slate-700">Pressed by mistake? Undo puts the patient back where they were.</p>
      <ul className="space-y-2">
        {closed.map((visit) => (
          <li key={visit.id} className="rounded-lg border-2 border-slate-300 p-3" data-testid={`closed-${visit.code}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span className="font-mono font-bold tracking-widest">{visit.code}</span> {closedLabel(visit)}
              </p>
              <Button variant="secondary" onClick={() => undo(visit)}>
                Undo<span className="sr-only"> for visit {visit.code}</span>
              </Button>
            </div>
            {notes[visit.id] && <p className="mt-2 font-semibold text-red-800">{notes[visit.id]}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
