"use client";

// The staff "Recently closed" list: patients marked arrived, left or no-show at this site,
// newest first, each with its own Undo button; a visit confirmed "unable to reach" has a
// Reopen button instead, which sends it back to triage. There is no time limit, and older closures
// stay reachable with "Show older closures", so nobody has to hurry.

import { useEffect, useRef, useState } from "react";
import { reopenVisit, undoCloseVisit } from "@/data/staffActions";
import { CLOSED_PAGE_SIZE, closedLabel, recentlyClosed } from "@/lib/recentlyClosed";
import type { Site, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";
import { DemoTag } from "./DemoTag";

type Props = {
  visits: Visit[];
  site: Site;
  /** Called after an Undo, with words for screen readers; `undone` is true when it worked. */
  onUndoResult: (message: string, undone: boolean) => void;
  /** Called after a working Reopen, so the page can open the visit in the check-in form. */
  onReopened: (visit: Visit) => void;
};

export function RecentlyClosed({ visits, site, onUndoResult, onReopened }: Props) {
  // A failure note stays beside its own row, and the row (with its Undo button) stays too.
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [shownCount, setShownCount] = useState(CLOSED_PAGE_SIZE);
  const [revealed, setRevealed] = useState<{ first: number; message: string } | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const all = recentlyClosed(visits, site);

  // After "Show older closures", move focus to the first newly shown row (the button may be gone).
  useEffect(() => {
    if (revealed) listRef.current?.querySelectorAll("li")[revealed.first]?.focus();
  }, [revealed]);

  if (all.length === 0) return null;
  const closed = all.slice(0, shownCount);
  const older = all.length - closed.length;

  const showOlder = () => {
    const added = Math.min(CLOSED_PAGE_SIZE, older);
    setRevealed({ first: closed.length, message: `Showing ${added} older ${added === 1 ? "closure" : "closures"}.` });
    setShownCount(shownCount + CLOSED_PAGE_SIZE);
  };

  const undo = async (visit: Visit) => {
    if (savingId) return; // one Undo at a time, so a double press cannot send it twice
    setSavingId(visit.id);
    const reopening = visit.status === "unable_to_reach";
    const result = reopening ? await reopenVisit(visit.id) : await undoCloseVisit(visit.id, visit);
    setSavingId(null);
    const verb = reopening ? "reopened" : "undone";
    const note =
      result === "saved"
        ? ""
        : result === "not_saved"
          ? `Not saved: the database could not be reached, so visit ${visit.code} was not ${verb}. Try again.`
          : `Could not ${reopening ? "reopen" : "undo"} visit ${visit.code}: it changed since it was closed.`;
    setNotes({ ...notes, [visit.id]: note });
    if (result === "saved" && reopening) {
      onUndoResult(`Reopened: visit ${visit.code} needs reassessment. Triage the patient again in the check-in panel.`, true);
      onReopened(visit);
      return;
    }
    onUndoResult(result === "saved" ? `Undone: visit ${visit.code} is back on the list.` : note, result === "saved");
  };

  return (
    <section aria-labelledby="closed-heading" className="space-y-2">
      <h3 id="closed-heading" className="text-lg font-bold">
        Recently closed
      </h3>
      <p className="text-sm text-slate-700">
        Pressed by mistake? Undo puts the patient back where they were. Reopen sends a patient who could not be reached back to triage.
      </p>
      <ul ref={listRef} className="space-y-2">
        {closed.map((visit) => (
          <li key={visit.id} tabIndex={-1} className="rounded-lg border-2 border-slate-300 bg-white p-3" data-testid={`closed-${visit.code}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>
                <span className="font-mono font-bold tracking-widest">{visit.code}</span>
                <DemoTag isDemo={visit.is_demo} /> {closedLabel(visit)}
              </p>
              <Button variant="secondary" aria-disabled={savingId !== null} onClick={() => undo(visit)}>
                {savingId === visit.id ? "Saving…" : visit.status === "unable_to_reach" ? "Reopen" : "Undo"}
                <span className="sr-only"> for visit {visit.code}</span>
              </Button>
            </div>
            {notes[visit.id] && <p className="mt-2 font-semibold text-red-800">{notes[visit.id]}</p>}
          </li>
        ))}
      </ul>
      {older > 0 && (
        <Button variant="secondary" onClick={showOlder}>
          Show older closures ({older} more)
        </Button>
      )}
      <p role="status" className="sr-only">
        {revealed?.message}
      </p>
    </section>
  );
}
