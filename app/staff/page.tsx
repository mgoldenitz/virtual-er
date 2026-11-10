"use client";

// The staff screen: check patients in, see who is waiting off-site, call them back.

import { useState } from "react";
import { useVisits } from "@/data/useVisits";
import { activeLine } from "@/lib/queue";
import type { Site, Visit } from "@/lib/visit";
import { CheckInPanel } from "@/components/staff/CheckInPanel";
import { VisitRow } from "@/components/staff/VisitRow";
import { VisitSlip } from "@/components/staff/VisitSlip";
import { useNow } from "@/components/useNow";

export default function StaffPage() {
  const visits = useVisits();
  const now = useNow();
  const [site, setSite] = useState<Site>("A");
  const [slip, setSlip] = useState<Visit | null>(null);

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
          <h2 id="list-heading" className="text-xl font-bold">
            Waiting off-site ({line.length})
          </h2>
          {visits === null || now === null ? (
            <p>Loading…</p>
          ) : line.length === 0 ? (
            <p>No one is waiting off-site at this site.</p>
          ) : (
            <ol className="space-y-3">
              {line.map((visit) => (
                <VisitRow key={visit.id} visit={visit} now={now} onShowSlip={setSlip} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
