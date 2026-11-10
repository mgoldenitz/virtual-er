"use client";

// Staff check-in after triage: CTAS level, eligibility checklist, language, then one of
// "start off-site waiting", "offered, declined" or "not eligible".

import { useState, type FormEvent } from "react";
import { createDeskVisit } from "@/data/staffActions";
import type { Site, Visit } from "@/lib/visit";
import type { DeskOutcome } from "@/lib/visitActions";
import { Button } from "@/components/Button";

const CHECKLIST = [
  { id: "phone", label: "Has a phone with them" },
  { id: "return", label: "Can return within 20 minutes" },
  { id: "agrees", label: "Agrees to wait off-site" },
] as const;

type Props = {
  site: Site;
  /** Called when staff try a new check-in, before saving, so the last patient's slip is hidden. */
  onAttempt: () => void;
  onCreated: (visit: Visit) => void;
};

export function CheckInPanel({ site, onAttempt, onCreated }: Props) {
  const [ctas, setCtas] = useState<4 | 5 | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState("en");
  const [message, setMessage] = useState("");

  function finish(outcome: DeskOutcome) {
    // Hide the previous patient's slip first, so a failed save never leaves it on screen
    // where it could be handed to the next patient.
    onAttempt();
    if (ctas === null) {
      setMessage("Choose CTAS 4 or 5 first.");
      return;
    }
    if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
      setMessage("Tick all three checklist items to start off-site waiting.");
      return;
    }
    const visit = createDeskVisit({ site, ctas_level: ctas, language }, outcome);
    if (!visit) {
      setMessage("Not saved: this browser could not store the visit. Nothing was recorded. Try again.");
      return;
    }
    setCtas(null);
    setTicked({});
    setMessage(
      outcome === "waiting"
        ? `Visit ${visit.code} is now waiting off-site.`
        : `Recorded as ${outcome === "declined" ? "offered, declined" : "not eligible"}. The patient waits on-site as usual.`,
    );
    onCreated(visit);
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    finish("waiting");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-labelledby="checkin-heading">
      <h2 id="checkin-heading" className="text-xl font-bold">
        Check in a patient after triage
      </h2>

      <fieldset>
        <legend className="font-semibold">CTAS level (chosen by the triage nurse)</legend>
        <div className="mt-2 flex gap-3">
          {([4, 5] as const).map((level) => (
            <label key={level} className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-slate-400 px-4">
              <input
                type="radio"
                name="ctas"
                className="size-5"
                checked={ctas === level}
                onChange={() => setCtas(level)}
              />
              CTAS {level}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-semibold">Eligibility checklist</legend>
        <div className="mt-2 space-y-2">
          {CHECKLIST.map((item) => (
            <label key={item.id} className="flex min-h-11 items-center gap-3">
              <input
                type="checkbox"
                className="size-5"
                checked={!!ticked[item.id]}
                onChange={(e) => setTicked({ ...ticked, [item.id]: e.target.checked })}
              />
              {item.label}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="font-semibold">Language</span>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="mt-2 block min-h-11 rounded-lg border-2 border-slate-400 px-3"
        >
          <option value="en">English</option>
        </select>
        <span className="mt-1 block text-sm text-slate-700">Two more languages come in Phase 3.</span>
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Start off-site waiting</Button>
        <Button variant="secondary" onClick={() => finish("declined")}>
          Offered, declined
        </Button>
        <Button variant="secondary" onClick={() => finish("not_eligible")}>
          Not eligible
        </Button>
      </div>

      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
    </form>
  );
}
