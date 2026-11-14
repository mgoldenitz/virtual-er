"use client";

// The "Pause off-site waiting" switch for one site (SPEC /staff), for downtime or a contact
// problem. Pausing needs one confirmation. While paused, a banner asks staff to check every
// outstanding recall and offer on-site waiting. Turning it back on needs a second, separate
// confirmation: a tick that patients can be reached again, then the button.

import { useEffect, useRef, useState } from "react";
import { setSitePaused } from "@/data/sitePauses";
import { patientCount } from "@/lib/patientCount";
import type { ChangeResult, Site } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = {
  site: Site;
  /** The switch as last read, or null if it could not be read yet. */
  paused: boolean | null;
  /** Patients still in the off-site line at this site (waiting or recalled). */
  offSiteCount: number;
  /** Called with words for staff and screen readers after each change. */
  onResult: (message: string) => void;
};

type Mode = "idle" | "confirmPause" | "confirmResume";

export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
  const [mode, setMode] = useState<Mode>("idle");
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const question = useRef<HTMLHeadingElement>(null);

  // Keyboard and screen-reader users land on each confirmation question when it opens.
  useEffect(() => {
    if (mode !== "idle") question.current?.focus();
  }, [mode]);

  if (paused === null) {
    return <p className="text-sm text-slate-700">Checking whether off-site waiting is paused at this site…</p>;
  }

  const close = () => {
    setMode("idle");
    setChecked(false);
    setNote("");
    window.setTimeout(() => heading.current?.focus(), 0);
  };

  const save = async (pause: boolean) => {
    if (saving) return;
    if (!pause && !checked) {
      setNote("Tick the box first to confirm patients can be reached again.");
      return;
    }
    setSaving(true);
    const result: ChangeResult = await setSitePaused(site, pause);
    setSaving(false);
    if (result === "not_saved") {
      setNote("Not saved: the database could not be reached. Nothing changed. Try again.");
      return;
    }
    if (result === "refused") {
      onResult(`Another screen already ${pause ? "paused" : "resumed"} off-site waiting at Demo Site ${site}.`);
    } else {
      onResult(
        pause
          ? `Off-site waiting paused at Demo Site ${site}. Check every outstanding recall.`
          : `Off-site waiting is back on at Demo Site ${site}.`,
      );
    }
    close();
  };

  return (
    <section aria-labelledby={`pause-heading-${site}`} className="space-y-2" data-testid="pause-switch">
      <h3 id={`pause-heading-${site}`} ref={heading} tabIndex={-1} className="sr-only">
        Off-site waiting switch, Demo Site {site}
      </h3>

      {paused && (
        <div className="space-y-2 rounded-xl border-4 border-red-800 bg-red-50 p-4 text-red-950" data-testid="paused-banner">
          <p className="text-lg font-bold">Off-site waiting is paused at Demo Site {site}.</p>
          <p>
            No new off-site sign-ups: the start page sends patients to the emergency department, and check-in offers
            on-site waiting only. Check every outstanding recall, and offer on-site waiting to the{" "}
            {patientCount(offSiteCount)} still off-site.
          </p>
          {mode === "idle" && (
            <Button variant="secondary" onClick={() => setMode("confirmResume")}>
              Turn off-site waiting back on…
            </Button>
          )}
        </div>
      )}

      {!paused && mode === "idle" && (
        <Button variant="secondary" onClick={() => setMode("confirmPause")}>
          Pause off-site waiting at Demo Site {site}…
        </Button>
      )}

      {mode === "confirmPause" && (
        <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="pause-confirm">
          <h4 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
            Pause off-site waiting at Demo Site {site}?
          </h4>
          <p>
            Use this for downtime or a contact problem. New patients will wait on-site. The {patientCount(offSiteCount)}{" "}
            already off-site keep their visits, and you will be asked to check each one.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" aria-disabled={saving} onClick={() => save(true)}>
              {saving ? "Saving…" : "Yes, pause off-site waiting"}
            </Button>
            <Button variant="secondary" aria-disabled={saving} onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {mode === "confirmResume" && (
        <div className="space-y-3 rounded-xl border-4 border-slate-700 bg-white p-4" data-testid="resume-confirm">
          <h4 ref={question} tabIndex={-1} className="text-lg font-bold">
            Turn off-site waiting back on at Demo Site {site}?
          </h4>
          <label className="flex min-h-11 items-center gap-3">
            <input type="checkbox" className="size-5" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            I have checked that patients can be reached again (phones and this app work).
          </label>
          <div className="flex flex-wrap gap-2">
            <Button aria-disabled={saving || !checked} onClick={() => save(false)}>
              {saving ? "Saving…" : "Yes, turn it back on"}
            </Button>
            <Button variant="secondary" aria-disabled={saving} onClick={close}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {note && (
        <p role="alert" className="font-semibold text-red-800">
          {note}
        </p>
      )}
    </section>
  );
}
