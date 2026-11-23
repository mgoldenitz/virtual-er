"use client";

// The staff "Waiting on-site: offered, declined" list. A patient who said no to off-site waiting
// at triage may change their mind. Staff tick the eligibility checklist with them again, check
// the language, then switch them to off-site waiting. They keep their place in line from triage,
// and staff give them the slip. A switch made by mistake can be undone until the recall.
// No switch is offered while off-site waiting is paused (the database refuses it then too).

import { useEffect, useRef, useState } from "react";
import { serverNow } from "@/data/serverClock";
import {
  SWITCH_TO_OFFSITE_HOURS,
  canSwitchToOffsite,
  canUndoSwitch,
  placeIfSwitched,
  waitingOnSite,
} from "@/lib/switchToOffsite";
import { minutesBetween } from "@/lib/queue";
import type { ChangeResult, Site, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";
import { CHECKLIST } from "./eligibility";
import { DemoTag } from "./DemoTag";
import { Duration } from "./Duration";
import { LanguageSelect } from "./LanguageSelect";

type Props = {
  visits: Visit[];
  site: Site;
  now: Date;
  /** true: paused; null: not read yet. Both mean no switch is offered. */
  offsitePaused: boolean | null;
  /** Saves the switch (data/staffActions.ts switchVisitToOffsite); `onSaved` gets the updated visit. */
  save: (id: string, language: string, onSaved: (visit: Visit) => void) => Promise<ChangeResult>;
  /** Saves an Undo of a switch (data/staffActions.ts undoSwitchVisit). */
  undo: (id: string) => Promise<ChangeResult>;
  /** The switch was saved: show the patient's slip. */
  onSwitched: (visit: Visit) => void;
  /** The switch was undone: hide the slip. */
  onUndone: () => void;
};

const RESULT_TEXT: Record<Exclude<ChangeResult, "saved">, string> = {
  paused: "Off-site waiting is paused at this site. Nothing was saved. The patient keeps waiting on-site.",
  refused: "This visit changed on another screen. Nothing was saved. Check the list again.",
  not_saved: "Not saved: the database could not be reached. Try again.",
};
const TOO_LATE = `More than ${SWITCH_TO_OFFSITE_HOURS} hours have passed since this patient declined. Nothing was saved.`;

const boxId = (visitId: string, item: string) => `switch-${visitId}-${item}`;
const switchButtonId = (visitId: string) => `switch-open-${visitId}`;
const focusById = (id: string) => document.getElementById(id)?.focus();

export function WaitingOnSite({ visits, site, now, offsitePaused, save, undo, onSwitched, onUndone }: Props) {
  const list = waitingOnSite(visits, site, now);
  const [openId, setOpenId] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState("en");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  /** The visit just switched, for its Undo button. */
  const [lastSwitched, setLastSwitched] = useState<{ id: string; code: string } | null>(null);
  /** Where focus goes once React has drawn the change (an element id, or "heading"). Every change that sets it also changes state, so the screen draws again. */
  const focusTarget = useRef<string | null>(null);
  const setFocusTarget = (target: string) => {
    focusTarget.current = target;
  };
  /** Counts checklists closed by a pause or a list change, so focus can move to the heading. */
  const [closedCount, setClosedCount] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const canSwitch = offsitePaused === false;
  const open = list.find((v) => v.id === openId) ?? null;
  const justSwitched = lastSwitched ? visits.find((v) => v.id === lastSwitched.id) : undefined;
  const showUndo = !!lastSwitched && !!justSwitched && canUndoSwitch(justSwitched);

  // Paused on another screen, or the visit left the list, while its checklist was open:
  // close it, clear the ticks so none come back later, and keep focus on the list.
  if (openId && (!canSwitch || !open) && !saving) {
    setOpenId(null);
    setTicked({});
    setClosedCount((n) => n + 1);
    if (!canSwitch) setMessage("Off-site waiting was paused at this site. The checklist was closed. Nothing was saved.");
  }

  // The checklist was closed by a pause or a list change: focus the heading, not the page.
  useEffect(() => {
    if (closedCount > 0) heading.current?.focus();
  }, [closedCount]);

  // After every draw: move focus if a change asked for it.
  useEffect(() => {
    const target = focusTarget.current;
    if (!target) return;
    focusTarget.current = null;
    if (target === "heading") heading.current?.focus();
    else focusById(target);
  });

  function start(visit: Visit) {
    setOpenId(visit.id);
    setTicked({});
    setLanguage(visit.language);
    setMessage("");
    setFocusTarget(boxId(visit.id, CHECKLIST[0].id));
  }

  function cancel() {
    if (saving || !openId) return;
    setFocusTarget(switchButtonId(openId));
    setOpenId(null);
    setTicked({});
    setMessage("");
  }

  async function confirm(visit: Visit) {
    if (saving) return; // a second press while the first is on its way must not save twice
    if (!canSwitch) return setMessage(RESULT_TEXT.paused);
    const unticked = CHECKLIST.find((item) => !ticked[item.id]);
    if (unticked) {
      setMessage("Tick all three checklist items to switch to off-site waiting.");
      return focusById(boxId(visit.id, unticked.id));
    }
    if (!canSwitchToOffsite(visit, serverNow())) return setMessage(TOO_LATE);
    setSaving(true);
    setMessage("Saving...");
    const result = await save(visit.id, language, onSwitched);
    setSaving(false);
    if (result !== "saved") {
      // The 6 hours may have run out on the database's clock while the nurse read the checklist.
      return setMessage(result === "refused" && !canSwitchToOffsite(visit, serverNow()) ? TOO_LATE : RESULT_TEXT[result]);
    }
    setOpenId(null);
    setTicked({});
    setLastSwitched({ id: visit.id, code: visit.code });
    setMessage(`Visit ${visit.code} is now waiting off-site, at its place in line from triage. Give the patient the slip.`);
    // The row and its focused button are gone, so focus moves to the heading.
    setFocusTarget("heading");
  }

  async function undoLast() {
    if (saving || !lastSwitched) return;
    setSaving(true);
    const result = await undo(lastSwitched.id);
    setSaving(false);
    if (result !== "saved") return setMessage(`Undo not saved. ${RESULT_TEXT[result]}`);
    onUndone();
    setMessage(`Visit ${lastSwitched.code} is back to "offered, declined". The patient waits on-site.`);
    setLastSwitched(null);
    setFocusTarget("heading");
  }

  return (
    <section aria-labelledby="onsite-heading" className="clean-card space-y-3">
      <h2 id="onsite-heading" ref={heading} tabIndex={-1} className="text-2xl font-bold">
        Waiting on-site: offered, declined ({list.length})
      </h2>
      <p className="text-sm text-muted">
        {`Declined in the last ${SWITCH_TO_OFFSITE_HOURS} hours. If a patient changes their mind, they can switch to off-site waiting and keep their place in line from triage. Patients already seen inside stay on this list until ${SWITCH_TO_OFFSITE_HOURS} hours after they declined.`}
      </p>
      {!canSwitch && list.length > 0 && (
        <p className="font-semibold">
          {offsitePaused ? "Off-site waiting is paused at this site, so no one can switch now." : "Checking whether off-site waiting is paused."}
        </p>
      )}
      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
      {showUndo && (
        <Button variant="secondary" aria-disabled={saving} onClick={() => void undoLast()}>
          Undo switch<span className="sr-only"> for visit {lastSwitched.code}</span>
        </Button>
      )}
      {list.length > 0 && (
        <ul className="space-y-2">
          {list.map((visit) => {
            const place = placeIfSwitched(visits, visit, now);
            return (
              <li
                key={visit.id}
                className="space-y-3 rounded-lg border-2 border-line bg-card p-3"
                data-testid={`onsite-${visit.code}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p>
                    <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span>
                    <DemoTag isDemo={visit.is_demo} /> · CTAS {visit.ctas_level} · triaged{" "}
                    <Duration minutes={minutesBetween(visit.triaged_at!, now)} /> ago · declined{" "}
                    <Duration minutes={minutesBetween(visit.closed_at!, now)} /> ago
                    {place !== null && (
                      <>
                        <br />
                        {place === 1 ? "Would be next in line if switched now." : `Would be number ${place} in line if switched now.`}
                      </>
                    )}
                  </p>
                  {canSwitch && open?.id !== visit.id && (
                    <Button id={switchButtonId(visit.id)} variant="secondary" onClick={() => start(visit)}>
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
                          id={boxId(visit.id, item.id)}
                          type="checkbox"
                          className="size-5"
                          checked={!!ticked[item.id]}
                          onChange={(e) => setTicked({ ...ticked, [item.id]: e.target.checked })}
                        />
                        {item.label}
                      </label>
                    ))}
                    <LanguageSelect value={language} onChange={setLanguage} />
                    <div className="flex flex-wrap gap-2">
                      <Button aria-disabled={saving} onClick={() => void confirm(visit)}>
                        Start off-site waiting<span className="sr-only"> for visit {visit.code}</span>
                      </Button>
                      <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
                        Cancel<span className="sr-only"> switch for visit {visit.code}</span>
                      </Button>
                    </div>
                  </fieldset>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
