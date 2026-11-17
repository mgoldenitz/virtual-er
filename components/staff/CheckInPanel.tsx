"use client";

// Staff check-in after triage: CTAS level, eligibility checklist, language, then one of
// "start off-site waiting", "offered, declined" or "not eligible". It checks in either a new
// desk visit, or a visit the patient started from home (chosen from Expected arrivals).

import { useState, type FormEvent } from "react";
import { checkInVisitFromHome, createDeskVisit } from "@/data/staffActions";
import type { Site, Visit } from "@/lib/visit";
import type { DeskOutcome } from "@/lib/visitActions";
import { LANGUAGES, menuLabel } from "@/lib/text/languages";
import { Button } from "@/components/Button";

const CHECKLIST = [
  { id: "phone", label: "Has a phone with them" },
  { id: "return", label: "Can return within 20 minutes" },
  { id: "agrees", label: "Agrees to wait off-site" },
] as const;

// The database refused off-site waiting because the site was paused on another screen.
const PAUSED_NOT_SAVED = 'Off-site waiting is paused at this site. Press "Waits on-site" instead. Nothing was saved.';

// The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
const READ_FAILED = "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds.";

// A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
// If the site was paused meanwhile, the database refuses the start (VWR02) and PAUSED_NOT_SAVED shows.
const STALE_READ =
  "Could not read the pause switch just now. The last read said off-site waiting is not paused. " +
  "The screen tries again every 5 seconds. If the site is paused now, the start is not saved and the screen says so.";

/** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
  // Paused comes first: it is the safer fact, even when a later read failed.
  if (offsitePaused) return "Off-site waiting is paused at this site: the patient waits on-site.";
  if (pauseReadFailed) return READ_FAILED;
  return "Checking whether off-site waiting is paused. The patient can wait on-site.";
}

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
  /** true: paused; null: not read yet. Both mean check-in offers on-site waiting only. */
  offsitePaused: boolean | null;
  /** true when the last read of the pause switch failed (from useSitePauses). */
  pauseReadFailed: boolean;
};

export function CheckInPanel({
  site,
  onAttempt,
  onCreated,
  homeVisit,
  homeProblem,
  onHomeDone,
  offsitePaused,
  pauseReadFailed,
}: Props) {
  // Only a read that says "not paused" lets staff offer off-site waiting.
  const onSiteOnly = offsitePaused !== false;

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
        result === "paused"
          ? PAUSED_NOT_SAVED
          : result === "not_saved"
            ? "Not saved: the database could not be reached. Nothing was recorded. Try again."
            : `Visit ${homeVisit.code} changed or is already checked in. No check-in was saved.`,
      );
      return null;
    }
    const visit = await createDeskVisit(form, outcome);
    if (visit === "paused") {
      setMessage(PAUSED_NOT_SAVED);
      return null;
    }
    if (visit === "refused") {
      setMessage("Not saved: the database refused this check-in. Nothing was recorded.");
      return null;
    }
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
    if (outcome === "waiting" && onSiteOnly) {
      setMessage(`${onSiteOnlyText(offsitePaused, pauseReadFailed)} Press "Waits on-site" instead.`);
      return;
    }
    if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
      setMessage("Tick all three checklist items to start off-site waiting.");
      return;
    }
    setSaving(true);
    setMessage("Saving...");
    const code = await save(outcome, ctas);
    setSaving(false);
    if (!code) return;
    setCtas(null);
    setTicked({});
    setMessage(
      outcome === "waiting"
        ? `Visit ${code} is now waiting off-site.`
        : `Visit ${code} recorded as ${outcome === "declined" ? "offered, declined" : offsitePaused === true ? "waiting on-site (off-site waiting paused)" : offsitePaused === null ? "waiting on-site" : "not eligible"}. The patient waits on-site as usual.`,
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
          <p>
            {homeVisit.source === "home" && homeVisit.triaged_at === null
              ? "Started from home. The patient already has this visit on their phone."
              : "Back for reassessment. The patient already has this visit on their phone. Their place in line starts again at this triage."}
          </p>
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
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.approved ? menuLabel(l) : `${menuLabel(l)}, draft until checked`}
            </option>
          ))}
        </select>
      </label>

      {!homeProblem && (
        <div className="flex flex-wrap gap-3">
          {onSiteOnly ? (
            <p className="w-full rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
              {onSiteOnlyText(offsitePaused, pauseReadFailed)}
            </p>
          ) : (
            <>
              {pauseReadFailed && (
                <p className="w-full rounded-lg border-2 border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950">
                  {STALE_READ}
                </p>
              )}
              <Button type="submit" aria-disabled={saving}>
                Start off-site waiting
              </Button>
            </>
          )}
          {/* While paused nobody can be offered off-site waiting, so "Offered, declined" would count
              a patient as offered by mistake. "Waits on-site" records not_eligible, which leaves the
              patient out of the dashboard's "offered" percentage, as it should. */}
          {!onSiteOnly && (
            <Button variant="secondary" aria-disabled={saving} onClick={() => finish("declined")}>
              Offered, declined
            </Button>
          )}
          <Button variant="secondary" aria-disabled={saving} onClick={() => finish("not_eligible")}>
            {offsitePaused === true ? "Waits on-site (off-site waiting paused)" : offsitePaused === null ? "Waits on-site" : "Not eligible"}
          </Button>
        </div>
      )}

      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
    </form>
  );
}
