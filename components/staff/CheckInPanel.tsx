"use client";

// Staff check-in after triage: CTAS level, eligibility checklist, language, then one of
// "start off-site waiting", "offered, declined" or "not eligible". It checks in either a new
// desk visit, or a visit the patient started from home (chosen from Expected arrivals).

import { useState, type FormEvent } from "react";
import { checkInVisitFromHome, createDeskVisit } from "@/data/staffActions";
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
  /** A visit started from home that staff chose to check in, or null for a new desk visit. */
  homeVisit: Visit | null;
  /** Set when the chosen home visit changed elsewhere or expired, so it can no longer be checked in. */
  homeProblem: string | null;
  /** Leave the home visit: after it is checked in, or when staff cancel. */
  onHomeDone: () => void;
};

export function CheckInPanel({ site, onAttempt, onCreated, homeVisit, homeProblem, onHomeDone }: Props) {
  const [ctas, setCtas] = useState<4 | 5 | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState("en");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  // A different home visit was chosen: start the form fresh, with the language the patient picked.
  const [formFor, setFormFor] = useState<string | null>(null);
  const homeId = homeVisit?.id ?? null;
  if (homeId !== formFor) {
    setFormFor(homeId);
    if (homeVisit) {
      setCtas(null);
      setTicked({});
      setLanguage(homeVisit.language);
      setMessage("");
    }
  }

  // Staff leave the home visit: clear its choices so none carry over to the next patient.
  function cancelHome() {
    setCtas(null);
    setTicked({});
    setLanguage("en");
    setMessage("");
    onHomeDone();
  }

  /** Save the check-in; returns the visit code, or null after showing why it was not saved. */
  async function save(outcome: DeskOutcome, ctasLevel: 4 | 5): Promise<string | null> {
    const form = { site, ctas_level: ctasLevel, language };
    if (homeVisit) {
      const result = await checkInVisitFromHome(homeVisit.id, form, outcome);
      if (result === "saved") {
        onHomeDone();
        return homeVisit.code;
      }
      setMessage(
        result === "not_saved"
          ? "Not saved: the database could not be reached. Nothing was recorded. Try again."
          : `Visit ${homeVisit.code} changed or is already checked in. No check-in was saved.`,
      );
      return null;
    }
    const visit = await createDeskVisit(form, outcome);
    if (!visit) {
      setMessage("Not saved: the database could not be reached. Nothing was recorded. Try again.");
      return null;
    }
    onCreated(visit);
    return visit.code;
  }

  async function finish(outcome: DeskOutcome) {
    if (saving) return; // a second press while the first is on its way must not check in twice
    // Hide the previous patient's slip first, so a failed save never leaves it on screen
    // where it could be handed to the next patient.
    onAttempt();
    if (homeProblem) return;
    if (ctas === null) {
      setMessage("Choose CTAS 4 or 5 first.");
      return;
    }
    if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
      setMessage("Tick all three checklist items to start off-site waiting.");
      return;
    }
    setSaving(true);
    setMessage("Saving…");
    const code = await save(outcome, ctas);
    setSaving(false);
    if (!code) return;
    setCtas(null);
    setTicked({});
    setMessage(
      outcome === "waiting"
        ? `Visit ${code} is now waiting off-site.`
        : `Visit ${code} recorded as ${outcome === "declined" ? "offered, declined" : "not eligible"}. The patient waits on-site as usual.`,
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void finish("waiting");
  };

  return (
    <form onSubmit={onSubmit} className="glass-panel space-y-4" aria-labelledby="checkin-heading">
      <h2 id="checkin-heading" tabIndex={-1} className="text-xl font-bold">
        {homeVisit ? `Check in visit ${homeVisit.code} after triage` : "Check in a patient after triage"}
      </h2>
      {homeVisit && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-100 p-3">
          <p>Started from home. The patient already has this visit on their phone.</p>
          <Button variant="secondary" onClick={cancelHome}>
            Cancel: check in a new patient instead
          </Button>
        </div>
      )}

      {homeProblem && (
        <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
          {homeProblem}
        </p>
      )}

      <fieldset disabled={!!homeProblem}>
        <legend className="font-semibold">CTAS level (chosen by the triage nurse)</legend>
        <div className="mt-2 flex gap-3">
          {([4, 5] as const).map((level) => (
            <label
              key={level}
              className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-control px-4"
            >
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

      <fieldset disabled={!!homeProblem}>
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
          className="mt-2 block min-h-11 rounded-lg border-2 border-control px-3"
        >
          <option value="en">English</option>
        </select>
        <span className="mt-1 block text-sm text-slate-700">French, Urdu, Arabic and Mandarin are coming soon.</span>
      </label>

      {!homeProblem && (
        <div className="flex flex-wrap gap-3">
          <Button type="submit" aria-disabled={saving}>
            Start off-site waiting
          </Button>
          <Button variant="secondary" aria-disabled={saving} onClick={() => finish("declined")}>
            Offered, declined
          </Button>
          <Button variant="secondary" aria-disabled={saving} onClick={() => finish("not_eligible")}>
            Not eligible
          </Button>
        </div>
      )}

      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
    </form>
  );
}
