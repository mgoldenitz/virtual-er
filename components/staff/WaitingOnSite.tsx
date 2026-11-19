"use client";

// The staff "Waiting on-site: offered, declined" list. A patient who said no to off-site waiting
// at triage may change their mind. Staff tick the eligibility checklist with them again, then
// switch them to off-site waiting. They keep their place in line from triage, and staff give
// them the slip. Not shown while off-site waiting is paused (the database refuses it then too).

import { useRef, useState } from "react";
import { SWITCH_TO_OFFSITE_HOURS, waitingOnSite } from "@/lib/switchToOffsite";
import { minutesBetween } from "@/lib/queue";
import type { ChangeResult, Site, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";
import { CHECKLIST } from "./eligibility";
import { DemoTag } from "./DemoTag";
import { Duration } from "./Duration";

type Props = {
  visits: Visit[];
  site: Site;
  now: Date;
  /** true: paused; null: not read yet. Both mean no switch is offered. */
  offsitePaused: boolean | null;
  /** Saves the switch (data/staffActions.ts switchVisitToOffsite); `onSaved` gets the updated visit. */
  save: (id: string, onSaved: (visit: Visit) => void) => Promise<ChangeResult>;
  /** The switch was saved: show the patient's slip. */
  onSwitched: (visit: Visit) => void;
};

const RESULT_TEXT: Record<Exclude<ChangeResult, "saved">, string> = {
  paused: "Off-site waiting is paused at this site. Nothing was saved. The patient keeps waiting on-site.",
  refused: "This visit changed on another screen. Nothing was saved. Check the list again.",
  not_saved: "Not saved: the database could not be reached. Try again.",
};

export function WaitingOnSite({ visits, site, now, offsitePaused, save, onSwitched }: Props) {
  const list = waitingOnSite(visits, site, now);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const canSwitch = offsitePaused === false;
  const open = list.find((v) => v.id === openId) ?? null;

  function start(visit: Visit) {
    setOpenId(visit.id);
    setTicked({});
    setMessage("");
  }

  function cancel() {
    if (saving) return;
    setOpenId(null);
    setTicked({});
    setMessage("");
  }

  async function confirm(visit: Visit) {
    if (saving) return; // a second press while the first is on its way must not save twice
    if (!canSwitch) return setMessage(RESULT_TEXT.paused);
    if (!CHECKLIST.every((item) => ticked[item.id])) {
      return setMessage("Tick all three checklist items to switch to off-site waiting.");
    }
    setSaving(true);
    setMessage("Saving...");
    const result = await save(visit.id, onSwitched);
    setSaving(false);
    if (result !== "saved") return setMessage(RESULT_TEXT[result]);
    setOpenId(null);
    setTicked({});
    setMessage(`Visit ${visit.code} is now waiting off-site, at its place in line from triage. Give the patient the slip.`);
    // The row and its focused button are gone, so focus moves to the heading.
    heading.current?.focus();
  }

  return (
    <section aria-labelledby="onsite-heading" className="glass-panel space-y-3">
      <h2 id="onsite-heading" ref={heading} tabIndex={-1} className="text-xl font-bold">
        Waiting on-site: offered, declined ({list.length})
      </h2>
      <p className="text-sm text-slate-700">
        {`Declined in the last ${SWITCH_TO_OFFSITE_HOURS} hours. If a patient changes their mind, they can switch to off-site waiting and keep their place in line from triage.`}
      </p>
      {!canSwitch && list.length > 0 && (
        <p className="font-semibold">
          {offsitePaused ? "Off-site waiting is paused at this site, so no one can switch now." : "Checking whether off-site waiting is paused."}
        </p>
      )}
      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((visit) => (
            <li
              key={visit.id}
              className="space-y-3 rounded-lg border-2 border-slate-300 bg-white p-3"
              data-testid={`onsite-${visit.code}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p>
                  <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span>
                  <DemoTag isDemo={visit.is_demo} /> · CTAS {visit.ctas_level} · declined{" "}
                  <Duration minutes={minutesBetween(visit.closed_at!, now)} /> ago
                </p>
                {canSwitch && open?.id !== visit.id && (
                  <Button variant="secondary" onClick={() => start(visit)}>
                    Switch to off-site waiting<span className="sr-only"> visit {visit.code}</span>
                  </Button>
                )}
              </div>
              {canSwitch && open?.id === visit.id && (
                <fieldset className="min-w-0 space-y-2">
                  <legend className="font-semibold">Eligibility checklist for visit {visit.code}</legend>
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
                  <div className="flex flex-wrap gap-2">
                    <Button aria-disabled={saving} onClick={() => void confirm(visit)}>
                      Start off-site waiting<span className="sr-only"> for visit {visit.code}</span>
                    </Button>
                    <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
                      Cancel
                    </Button>
                  </div>
                </fieldset>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
