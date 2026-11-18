"use client";

// The "Recall all off-site patients" button for a surge or a system problem, with a
// confirmation that names the site and how many patients it reaches. Only the patients
// counted in that confirmation are recalled (lib/recallAll.ts).

import { useEffect, useRef, useState } from "react";
import { recallAll } from "@/data/staffActions";
import { patientCount } from "@/lib/patientCount";
import { recallAllMessage, recallAllTargets } from "@/lib/recallAll";
import type { Site, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = {
  visits: Visit[];
  site: Site;
  /**
   * Called with words for staff and screen readers after a recall, or after a failed one.
   * `closed` is true when the confirmation closed (the page then moves focus, because the
   * focused button just disappeared); after a failed save the box stays open with focus in it.
   */
  onResult: (message: string, closed: boolean) => void;
};

export function RecallAllPanel({ visits, site, onResult }: Props) {
  /** The visits shown in the open confirmation, or null when it is closed. */
  const [asked, setAsked] = useState<Visit[] | null>(null);
  const [saving, setSaving] = useState(false);
  const question = useRef<HTMLHeadingElement>(null);
  const openButton = useRef<HTMLButtonElement>(null);
  const targets = recallAllTargets(visits, site);

  // Move focus to the question when it opens, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (asked) question.current?.focus();
  }, [asked]);

  // Cancel does nothing while a recall runs: aria-disabled does not stop a click.
  const cancel = () => {
    if (saving) return;
    setAsked(null);
    // Focus goes back to the button once it is shown again.
    window.setTimeout(() => openButton.current?.focus(), 0);
  };

  const confirm = async () => {
    if (!asked || saving) return;
    setSaving(true);
    const result = await recallAll(asked.map((v) => v.id));
    setSaving(false);
    if (!result.notSaved) setAsked(null);
    onResult(recallAllMessage(result, site), !result.notSaved);
  };

  if (!asked) {
    if (targets.length === 0) return null;
    return (
      <Button ref={openButton} variant="danger" onClick={() => setAsked(targets)}>
        Recall all off-site patients ({targets.length})
      </Button>
    );
  }

  const n = asked.length;
  return (
    <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="recall-all-confirm">
      <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
        Recall all {patientCount(n)} waiting off-site at Demo Site {site}?
      </h3>
      <p>
        {`Each patient's phone will show "Please head back now". Use this for a surge or a system problem. `}
        There is no undo: recalled patients stay recalled.
      </p>
      <p className="font-mono tracking-widest">{asked.map((v) => v.code).join(" · ")}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="danger" aria-disabled={saving} onClick={confirm}>
          {saving ? "Saving…" : `Yes, recall all ${n}`}
        </Button>
        <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
