"use client";

// The staff "Expected arrivals" list: visits started from home that have not reached triage.
// They are not in the waiting line. Staff pick one from the list, or type the code the patient
// shows (short-code lookup is staff-only), to check it in after triage. The code box also finds
// a reopened visit that needs reassessment; those are also listed under "Back for reassessment".

import { useState, type FormEvent } from "react";
import { findVisitByCode } from "@/data/staffActions";
import { backForReassessment, expectedArrivals, isExpected } from "@/lib/expectedArrivals";
import { minutesBetween } from "@/lib/queue";
import type { Site, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = { visits: Visit[]; site: Site; now: Date; onChoose: (visit: Visit) => void };

export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
  const [typed, setTyped] = useState("");
  const [message, setMessage] = useState("");
  const expected = expectedArrivals(visits, site, now);
  const reassess = backForReassessment(visits, site);

  const [looking, setLooking] = useState(false);

  const find = async (event: FormEvent) => {
    event.preventDefault();
    if (looking) return;
    setLooking(true);
    setMessage("Looking…");
    const visit = await findVisitByCode(typed);
    setLooking(false);
    if (visit === "failed") {
      return setMessage("Could not look up the code: the database could not be reached. Try again.");
    }
    if (!visit) return setMessage("No visit has that code. Check the code with the patient.");
    if (visit.site !== site) {
      return setMessage(`Visit ${visit.code} was started for Demo Site ${visit.site}. Switch site to check it in.`);
    }
    if (!isExpected(visit, now) && visit.status !== "needs_reassessment") {
      return setMessage(
        visit.status === "pre_arrival"
          ? `Visit ${visit.code} was started more than 6 hours ago. Check the patient in as a new visit.`
          : `Visit ${visit.code} is already checked in.`,
      );
    }
    setMessage("");
    setTyped("");
    onChoose(visit);
  };

  return (
    <section aria-labelledby="expected-heading" className="glass-panel space-y-3">
      <h2 id="expected-heading" className="text-xl font-bold">
        Expected arrivals ({expected.length})
      </h2>
      <p className="text-sm text-slate-700">
        Started from home, not yet triaged. Not in the waiting line.
      </p>
      <form onSubmit={find} className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="font-semibold">Visit code</span>
          <input
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-1 block min-h-11 w-40 rounded-lg border-2 border-control px-3 font-mono uppercase tracking-widest"
          />
        </label>
        <Button type="submit" variant="secondary" aria-disabled={looking}>
          Find visit
        </Button>
      </form>
      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
      {reassess.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold">Back for reassessment ({reassess.length})</h3>
          <p className="text-sm text-slate-700">Reopened after &ldquo;unable to reach&rdquo;. Triage again before they rejoin the line.</p>
          <ul className="space-y-2">
            {reassess.map((visit) => (
              <li
                key={visit.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-amber-800 bg-amber-50 p-3"
                data-testid={`reassess-${visit.code}`}
              >
                <p>
                  <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · needs reassessment
                </p>
                <Button variant="secondary" onClick={() => onChoose(visit)}>
                  Triage again<span className="sr-only"> visit {visit.code}</span>
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {expected.length > 0 && (
        <ul className="space-y-2">
          {expected.map((visit) => (
            <li
              key={visit.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-slate-300 bg-white p-3"
              data-testid={`expected-${visit.code}`}
            >
              <p>
                <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · started{" "}
                {minutesBetween(visit.created_at, now)} min ago
              </p>
              <Button variant="secondary" onClick={() => onChoose(visit)}>
                Check in<span className="sr-only"> visit {visit.code}</span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
