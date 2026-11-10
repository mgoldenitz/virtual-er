"use client";

// The staff screen: check patients in, see who is waiting off-site, call them back.

import { useCallback, useRef, useState } from "react";
import { undoCloseVisit } from "@/data/staffActions";
import { useVisits } from "@/data/useVisits";
import { activeLine } from "@/lib/queue";
import type { Site, Visit } from "@/lib/visit";
import { CheckInPanel } from "@/components/staff/CheckInPanel";
import { UndoBanner, type Closed } from "@/components/staff/UndoBanner";
import { VisitRow } from "@/components/staff/VisitRow";
import { VisitSlip } from "@/components/staff/VisitSlip";
import { useNow } from "@/components/useNow";

export default function StaffPage() {
  const visits = useVisits();
  const now = useNow();
  const [site, setSite] = useState<Site>("A");
  const [slip, setSlip] = useState<Visit | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [justClosed, setJustClosed] = useState<Closed | null>(null);
  const listHeading = useRef<HTMLHeadingElement>(null);

  // A patient just left the list: say so, offer Undo, and move keyboard focus from the
  // vanished row to the list heading, so the next Tab lands on the Undo button.
  const onLeftList = (closed: Closed) => {
    setAnnouncement(closed.message);
    setJustClosed(closed);
    listHeading.current?.focus();
  };
  const hideUndo = useCallback(() => setJustClosed(null), []);
  const onUndo = (closed: Closed) => {
    const result = undoCloseVisit(closed.id, closed.previous);
    setJustClosed(null);
    setAnnouncement(
      result === "saved"
        ? `Undone: visit ${closed.code} is back on the list.`
        : result === "not_saved"
          ? `Not saved: this browser could not undo visit ${closed.code}. Try again.`
          : `Could not undo visit ${closed.code}: the time to undo has passed or the visit changed.`,
    );
  };

  const line = visits ? activeLine(visits, site) : [];
  // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none.
  const showSlip = (visit: Visit) => setSlip(visit.status === "waiting" || visit.called_at ? visit : null);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Staff: Virtual Waiting Room</h1>
        <label className="flex items-center gap-2">
          <span className="font-semibold">Site</span>
          <select
            value={site}
            onChange={(e) => {
              setSite(e.target.value as Site);
              setSlip(null);
              setJustClosed(null);
            }}
            className="min-h-11 rounded-lg border-2 border-slate-400 px-3"
          >
            <option value="A">Demo Site A</option>
            <option value="B">Demo Site B</option>
          </select>
        </label>
      </header>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
        Phase 1 demo: no staff login yet, and all data stays in this browser.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <CheckInPanel site={site} onCreated={showSlip} />
          {slip && <VisitSlip code={slip.code} token={slip.access_token} onClose={() => setSlip(null)} />}
        </div>

        <section aria-labelledby="list-heading" className="space-y-3">
          <h2 id="list-heading" ref={listHeading} tabIndex={-1} className="text-xl font-bold">
            Waiting off-site ({line.length})
          </h2>
          <p role="status" className="min-h-6 font-semibold">
            {announcement}
          </p>
          {justClosed && <UndoBanner closed={justClosed} onUndo={onUndo} onExpire={hideUndo} />}
          {visits === null || now === null ? (
            <p>Loading…</p>
          ) : line.length === 0 ? (
            <p>No one is waiting off-site at this site.</p>
          ) : (
            <ol className="space-y-3">
              {line.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  now={now}
                  onShowSlip={setSlip}
                  onLeftList={onLeftList}
                />
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
