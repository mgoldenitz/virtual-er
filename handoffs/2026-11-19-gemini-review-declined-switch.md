# Gemini review: declined patients can switch to off-site waiting

Model: Gemini Hydrogen 4, High, in a new chat. (If no Hydrogen 4 credits: Gemini 3.6 Flash, High.)
Branch: `declined-to-offsite` (`cf4a01c` failing tests, `6c946b3` change, `c264100` docs), off `main` at `a70a09a`.

## Prompt to paste

You review a change to a Next.js 16 App Router + Supabase prototype (a virtual ER waiting room, synthetic data only). Find problems. Do not confirm that it works; list each way it can fail, with a concrete case, and say how bad it is.

Background. Low-acuity patients (CTAS 4 or 5) can wait off-site after triage and follow their place in line on their phone. A visit's `status` is one of `pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed, declined, not_eligible`. Off-site waiting is `waiting`, `called`, `on_the_way`. A patient offered off-site waiting who says no is recorded `declined` at triage: `offered_at`, `triaged_at` and `closed_at` are set, and the patient waits inside as usual. Until now `declined` was final. The line is ordered by `triaged_at` (oldest first). Staff screens update `visits` directly from the browser through row-level security (staff only), saving only the changed fields and only "where version = the version I read". A trigger `visits_before_write` replaces every newly filled time with the database's `now()` (so the device clock never decides line order) and bumps `version`. A trigger `visits_check_step` refuses any status move not in its list (error VWR01) and refuses starting off-site waiting while the site is paused (VWR02). An "I'm still here" prompt appears on the patient's phone 30 minutes after the later of `triaged_at` and `last_still_here_at`; a tap missed for 10 more minutes flags the patient for staff.

The change. Staff can now switch a `declined` patient to `waiting`, from a new list "Waiting on-site: offered, declined" on the staff screen. Owner decisions: the patient keeps the place in line from the original triage time (they have been waiting inside since triage); `not_eligible` stays final; the switch is allowed only within 6 hours of declining; staff tick the same 3-item eligibility checklist again; the patient then gets the slip (QR code and link). On the dashboard, the visit then counts as offered and no longer as declined.

Questions:
1. Can a switch put a patient in the line in a way that breaks a rule above (place in line, pause, a second staff screen, a stale copy, a visit that changed since the list was drawn)?
2. Is keeping the original `triaged_at` safe with the other rules that read it (wait estimate, "I'm still here", follow-up after a call)? Is setting `last_still_here_at` at the switch right, or does it mislead staff?
3. Does the trigger change let anything else through that it should not?
4. Accessibility and wording of the new list (WCAG 2.2 AA: focus, status messages, labels).
5. Anything missing that a nurse at the desk would need.

### lib/switchToOffsite.ts (35 lines, new)

```ts
// A patient recorded as "offered, declined" waits on-site, then changes their mind and wants
// to wait off-site after all. Staff can switch them, but only for a few hours after triage.
// The patient keeps the place in line from the original triage time (owner, 2026-11-19),
// because they have been waiting inside the whole time.

import type { Site, Visit } from "./visit";

/** How long after declining a patient can still be switched to off-site waiting. */
export const SWITCH_TO_OFFSITE_HOURS = 6;

/** True if staff can switch this visit to off-site waiting now: declined, and declined under 6 hours ago. */
export function canSwitchToOffsite(visit: Visit, now: Date): boolean {
  if (visit.status !== "declined" || !visit.triaged_at || !visit.closed_at) return false;
  const hours = (now.getTime() - new Date(visit.closed_at).getTime()) / 3_600_000;
  return hours < SWITCH_TO_OFFSITE_HOURS;
}

/**
 * Staff press "Switch to off-site waiting" after ticking the eligibility checklist again.
 * The visit joins the line at its original triage time, and closed_at is cleared because
 * virtual waiting starts again. The "I'm still here" clock starts at the switch (the patient
 * is at the desk right then), so the first prompt comes 30 minutes later, not at once.
 * Null when the switch is not allowed.
 */
export function switchToOffsite(visit: Visit, now: Date): Visit | null {
  if (!canSwitchToOffsite(visit, now)) return null;
  return { ...visit, status: "waiting", closed_at: null, last_still_here_at: now.toISOString() };
}

/** The staff "Waiting on-site (offered, declined)" list at one site: visits that can still switch, oldest triage first. */
export function waitingOnSite(visits: Visit[], site: Site, now: Date): Visit[] {
  return visits
    .filter((v) => v.site === site && canSwitchToOffsite(v, now))
    .sort((a, b) => (a.triaged_at! < b.triaged_at! ? -1 : a.triaged_at! > b.triaged_at! ? 1 : 0));
}
```

### Trigger change: supabase/migrations/20261119000000_declined_to_waiting.sql (68 lines, new; replaces `visits_check_step`, shown as a diff against the previous version)

```diff
@@ -27,7 +27,8 @@
         ('on_the_way', 'arrived'), ('on_the_way', 'removed'),
         ('unable_to_reach', 'needs_reassessment'),
         ('arrived', 'waiting'), ('arrived', 'called'), ('arrived', 'on_the_way'),
-        ('removed', 'waiting'), ('removed', 'called'), ('removed', 'on_the_way')
+        ('removed', 'waiting'), ('removed', 'called'), ('removed', 'on_the_way'),
+        ('declined', 'waiting')
       ) -- end of allowed moves
       then
         raise exception 'A visit cannot move from % to %', old.status, new.status using errcode = 'VWR01';
@@ -36,10 +37,11 @@
   end if;
 
   -- No new start of off-site waiting while the site is paused: a new visit that waits off-site,
-  -- or a triage that puts a visit in the line. Undo back to waiting stays allowed, because that
-  -- patient was already waiting off-site before the closure.
+  -- a triage that puts a visit in the line, or a declined patient who switches to off-site.
+  -- Undo back to waiting stays allowed, because that patient was already waiting off-site
+  -- before the closure.
   if new.status = 'waiting'
-     and (tg_op = 'INSERT' or old.status in ('pre_arrival', 'needs_reassessment')) then
+     and (tg_op = 'INSERT' or old.status in ('pre_arrival', 'needs_reassessment', 'declined')) then
     select offsite_paused into site_paused from public.site_settings where site = new.site for share;
     if site_paused is distinct from false then
       raise exception 'Off-site waiting is paused at site %', new.site using errcode = 'VWR02';
```

### lib/allowedSteps.ts (8 lines added)

```diff
@@ -20,6 +20,8 @@ export const ALLOWED_MOVES: Partial<Record<VisitStatus, VisitStatus[]>> = {
   // Undo: back to the status before the closure.
   arrived: ["waiting", "called", "on_the_way"],
   removed: ["waiting", "called", "on_the_way"],
+  // Changed their mind: a patient who declined at triage switches to off-site waiting (lib/switchToOffsite.ts).
+  declined: ["waiting"],
 };
 
 /** The statuses a new visit may start in (desk check-in, or start from home). */
@@ -31,6 +33,12 @@ export const START_STATUSES: VisitStatus[] = ["pre_arrival", "waiting", "decline
  */
 export const TRIAGE_STATUSES: VisitStatus[] = ["pre_arrival", "needs_reassessment"];
 
+/**
+ * The statuses a move to waiting starts off-site waiting from: a triage, or a declined patient
+ * who switches to off-site waiting. The database refuses these moves while the site is paused.
+ */
+export const OFFSITE_START_STATUSES: VisitStatus[] = [...TRIAGE_STATUSES, "declined"];
+
 /** True if a visit may move from one status to another. Staying in the same status is always allowed. */
 export function isAllowedMove(from: VisitStatus, to: VisitStatus): boolean {
   return from === to || (ALLOWED_MOVES[from] ?? []).includes(to);
```

### data/staffActions.ts (12 lines added) and the helper it calls

```diff
@@ -23,6 +23,7 @@ import {
   type Closure,
   type DeskOutcome,
 } from "@/lib/visitActions";
+import { switchToOffsite } from "@/lib/switchToOffsite";
 import { serverNow } from "./serverClock";
 import { reloadSitePauses } from "./sitePauses";
 import { supabaseBrowser } from "./supabaseBrowser";
@@ -167,6 +168,17 @@ export async function recallAll(ids: string[]): Promise<RecallAllResult> {
   }
 }
 
+/**
+ * A declined patient changed their mind: switch them to off-site waiting, at their original
+ * place in line. On "saved", `onSaved` gets the visit, so the screen can show its slip.
+ */
+export async function switchVisitToOffsite(id: string, onSaved: (visit: Visit) => void): Promise<ChangeResult> {
+  const result = await changeVisit(id, (v) => switchToOffsite(v, serverNow()));
+  const updated = cachedVisit(id);
+  if (result === "saved" && updated) onSaved(updated);
+  return result;
+}
+
 /** Record one simulated phone call ("Phoned, answered" or "Phoned, no answer"). */
 export const recordPhoneCallFor = (id: string, result: "answered" | "no_answer") =>
   changeVisit(id, (v) => recordPhoneCall(v, result, serverNow()));
```

`changeVisit` (unchanged, called above):

```ts

/** Apply one rule to one visit and save it. */
async function changeVisit(id: string, step: (visit: Visit) => Visit | null): Promise<ChangeResult> {
  const before = cachedVisit(id);
  const after = before ? step(before) : null;
  if (!before || !after) {
    void loadVisits();
    return "refused";
  }
  const changed = changedFields(before, after);
  if (Object.keys(changed).length === 0) return "refused"; // nothing to save
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .update(changed)
      .eq("id", id)
      .eq("version", before.version)
      .select();
    if (error) {
      // "refused": the step check does not allow this move. "paused": the site was paused on
      // another screen. Either way, read the list (and the pause switch) again.
      const result = resultForError(error.code);
      if (result === "paused") void reloadSitePauses();
      if (result !== "not_saved") void loadVisits();
      return result;
    }
    if (!Array.isArray(data)) return "not_saved";
    if (data.length === 0) {
      // Someone else (another staff screen, or the patient) changed this visit first.
      void loadVisits();
      return "refused";
    }
    putVisit(data[0] as StoredVisit);
    return "saved";
  } catch {
    return "not_saved";
  }
}
```

### components/staff/WaitingOnSite.tsx (142 lines, new)

```tsx
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
```

`components/staff/eligibility.ts` (8 lines, new) holds the 3-item `CHECKLIST` moved out of `CheckInPanel.tsx` unchanged.

### app/staff/page.tsx (25 lines changed)

```diff
@@ -1,11 +1,11 @@
 "use client";
 
-// The staff screen: check patients in (new at the desk, or expected from home), see who is
-// waiting off-site, and call them back.
+// The staff screen: check patients in (new at the desk, or expected from home), switch a patient
+// who declined to off-site waiting, see who is waiting off-site, and call them back.
 
 import { useEffect, useRef, useState } from "react";
 import { useSitePauses } from "@/data/sitePauses";
-import { reloadVisits } from "@/data/staffActions";
+import { reloadVisits, switchVisitToOffsite } from "@/data/staffActions";
 import { useVisits } from "@/data/useVisits";
 import { homeCheckInProblem } from "@/lib/homeCheckIn";
 import { activeLine } from "@/lib/queue";
@@ -20,6 +20,7 @@ import { RecentlyClosed } from "@/components/staff/RecentlyClosed";
 import { SignOutButton } from "@/components/staff/SignOutButton";
 import { VisitRow } from "@/components/staff/VisitRow";
 import { VisitSlip } from "@/components/staff/VisitSlip";
+import { WaitingOnSite } from "@/components/staff/WaitingOnSite";
 import { StaffShell } from "@/components/staff/StaffShell";
 import { Button } from "@/components/Button";
 import { useNow } from "@/components/useNow";
@@ -63,7 +64,8 @@ export default function StaffPage() {
     homeVisit && visits && now
       ? homeCheckInProblem(homeVisit, visits.find((v) => v.id === homeVisit.id) ?? null, now)
       : null;
-  // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none.
+  // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none
+  // (a declined patient who switches to off-site waiting gets one then).
   const showSlip = (visit: Visit) => setSlip(visit.status === "waiting" || visit.called_at ? visit : null);
 
   return (
@@ -118,6 +120,21 @@ export default function StaffPage() {
             onHomeDone={() => setHomeVisit(null)}
           />
           {slip && <VisitSlip code={slip.code} token={slip.access_token} language={slip.language} onClose={() => setSlip(null)} />}
+          {visits && now && (
+            <WaitingOnSite
+              key={`onsite-${site}`}
+              visits={visits}
+              site={site}
+              now={now}
+              offsitePaused={paused}
+              save={(id, onSaved) => {
+                // Hide the last patient's slip first, so a failed save never leaves it on screen.
+                setSlip(null);
+                return switchVisitToOffsite(id, onSaved);
+              }}
+              onSwitched={showSlip}
+            />
+          )}
         </div>
 
         <section aria-labelledby="list-heading" className="glass-panel space-y-3">
```

## Checked (output in this session)

- `npm test`: 74 test files, 432 tests pass (new: `lib/switchToOffsite.test.ts` 8, `components/staff/WaitingOnSite.click.test.tsx` 6, `lib/allowedSteps.test.ts` +1, with the old "declined to waiting is refused" line replaced). `npm run lint` passed. `npm run build` passed.
- `supabase/checks/allowed_steps.sql` on the live database (owner ran it, 2026-11-19): 52 of 52 rows ok, including declined to waiting saved, triage time kept, and refused while paused.

## Not checked

- The new list in a browser (needs the staff sign-in).
- The patient phone after a switch (it should move from the on-site message to the line).
- The dashboard numbers after a switch.
