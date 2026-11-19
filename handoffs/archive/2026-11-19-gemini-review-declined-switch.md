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

## Response

Gemini Hydrogen 4, High, 2026-11-19 (pasted by the owner, verbatim):

1. Queue rules, site pause, concurrency, and stale state

1. Double-clicking "Start off-site waiting" overwrites the success state with a false "changed on another screen" error and hides the QR slip — Severity: must fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 61–75 and 118; `app/staff/page.tsx`, lines 129–133.
   * What goes wrong: `Button` uses `aria-disabled={saving}` rather than the HTML `disabled` attribute, so rapid clicks still fire `onClick`. Because `setSaving(true)` in `confirm()` does not take effect until React re-renders, a second click within the same frame enters `confirm()` with `saving === false`. `app/staff/page.tsx`'s `save` wrapper immediately runs `setSlip(null)` (hiding the QR slip that the first click just opened or is about to open), and the second `switchVisitToOffsite` call fails either the `version` check or `canSwitchToOffsite` on the updated cache, returning `"refused"` and replacing the success status message with "This visit changed on another screen. Nothing was saved. Check the list again."
   * Concrete case: A nurse ticks all three boxes for visit `ABC234` and double-clicks "Start off-site waiting". Click 1 updates the database to `waiting`, opens `VisitSlip`, and announces success; click 2 runs before re-render, calls `setSlip(null)`, gets `"refused"`, closes the slip, and tells the nurse nothing was saved.
   * Smallest fix: Guard `confirm()` with a synchronous `useRef(false)` lock (`if (submitting.current) return; submitting.current = true;`) cleared in a `finally` block, and only call `setSlip(null)` when `start()` opens a row rather than inside `save()`.
2. 6-hour window expiring while the checklist is open reports "This visit changed on another screen" — Severity: should fix
   * File and line: `data/staffActions.ts`, lines 175–179 (`changeVisit` lines 189–193); `components/staff/WaitingOnSite.tsx`, lines 31–35.
   * What goes wrong: `switchVisitToOffsite` evaluates `switchToOffsite(v, serverNow())` inside `changeVisit`. If `now - closed_at` crosses 6 hours while the nurse is reviewing the checklist with the patient, `switchToOffsite` returns `null`, `changeVisit` returns `"refused"`, and `WaitingOnSite` displays `RESULT_TEXT.refused` ("This visit changed on another screen. Nothing was saved. Check the list again."), even though no other screen touched the visit. Furthermore, because `WaitingOnSite` filters the list using `useNow()` while `switchVisitToOffsite` uses `serverNow()`, clock offset between `useNow()` and `serverNow()` can leave the expired visit visible in the list after telling the nurse to check the list again.
   * Concrete case: Visit `DEF456` declined at `10:00:00`. At `15:59:10`, a nurse clicks "Switch to off-site waiting" and reads the 3 checklist items with the patient. At `16:00:15` (6h 00m 15s after `closed_at`), the nurse clicks "Start off-site waiting". `canSwitchToOffsite` returns `false`, and the screen falsely blames another staff screen.
   * Smallest fix: Check `canSwitchToOffsite(visit, serverNow())` before calling `save()` (or return a distinct `"expired"` result from `switchVisitToOffsite`) and show "More than 6 hours have passed since this patient declined. Nothing was saved."
3. Pausing the site on another screen unmounts an open checklist mid-interaction and retains stale checkbox state — Severity: should fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 86–90, 99, and 106.
   * What goes wrong: When `offsitePaused` changes from `false` to `true` via background polling while a nurse has `openId === visit.id` expanded, `{canSwitch && open?.id === visit.id && (<fieldset>...</fieldset>)}` immediately unmounts the open `<fieldset>` and drops keyboard/screen-reader focus to `document.body`. Worse, `openId` and `ticked` are never cleared when `canSwitch` becomes `false`, so if the site is unpaused later, the old checklist pops back open with stale ticks.
   * Concrete case: Nurse A opens the checklist for `GHI789` and ticks two boxes. Nurse B pauses off-site waiting at that site. On the next poll, Nurse A's checklist vanishes without warning; if Nurse B unpauses 2 minutes later, `GHI789`'s checklist reappears mid-screen with two boxes pre-ticked.
   * Smallest fix: Clear `openId` and `ticked` (and restore focus to `heading.current`) when `offsitePaused` becomes `true`.
4. Lexicographic ISO string sort in `waitingOnSite` misorders same-second triages — Severity: minor
   * File and line: `lib/switchToOffsite.ts`, line 33.
   * What goes wrong: `a.triaged_at! < b.triaged_at!` compares PostgREST `timestamptz` strings lexicographically. When Postgres omits trailing fractional-second zeros (e.g., `.82+00:00` vs `.82226+00:00`), `'+'` (ASCII 43) sorts after `'2'` (ASCII 50), inverting the display order of patients triaged in the same second.
   * Concrete case: Patient A is triaged at `14:00:00.820000Z` (`".82+00:00"`) and Patient B at `14:00:00.822260Z` (`".82226+00:00"`). `waitingOnSite` lists Patient B above Patient A.
   * Smallest fix: Sort by `Date.parse(a.triaged_at!) - Date.parse(b.triaged_at!)`.

2. Keeping original `triaged_at` and setting `last_still_here_at`

1. Setting `last_still_here_at` at the switch misleads staff into thinking the patient confirmed on their phone — Severity: should fix
   * File and line: `lib/switchToOffsite.ts`, line 26; `components/staff/VisitRow.tsx` (`progress` display of `last_still_here_at`).
   * What goes wrong: Resetting the 30-minute "I'm still here" timer at the switch is necessary because `triaged_at` can be up to 6 hours old (without a reset, the patient's phone would immediately show an overdue "I'm still here" alert and flag them on `/staff`). However, writing `last_still_here_at = now` causes `VisitRow` to render the same "last 'I'm still here' X min ago" indicator used when a patient actively taps the button on their phone. Staff cannot tell whether the patient actually opened their QR link and confirmed they are watching the app or never loaded the page at all.
   * Concrete case: A patient declines at 10:00, switches to off-site waiting at 12:00 (`last_still_here_at = 12:00`), and walks out without ever scanning the QR code (or with a dead battery). For the next 30 minutes, `VisitRow` displays "last 'I'm still here' 5 min ago", misleading another nurse into assuming the patient has an active phone session.
   * Smallest fix: Only show `"last 'I'm still here'"` in `VisitRow` when `last_still_here_at` was updated by a patient tap (e.g., record or check a separate timestamp/flag when `record_still_here` runs vs. desk switch, or label the switch timestamp `"switched to off-site X min ago"` until the patient taps).
2. Keeping an hours-old `triaged_at` inserts the patient at Place #1 and can trigger an immediate recall — Severity: should fix
   * File and line: `lib/switchToOffsite.ts`, lines 24–27; `get_patient_visit` queue ordering (`ORDER BY triaged_at`).
   * What goes wrong: Keeping `triaged_at` preserves the owner's rule (crediting time already waited inside), and `called_at`-based recall follow-ups (10/20/30 min) are unaffected because `called_at` is set fresh upon recall. However, if the clinic's wait time has caught up to their original triage time, a patient who declined 3–5 hours ago jumps straight to Place #1 ahead of every waiting off-site patient (pushing everyone else's wait estimate back by one call gap) and may be recalled within seconds of leaving the desk.
   * Concrete case: Patients triaged at `11:00` are currently being called at `14:30`. A patient triaged at `10:30` who initially declined switches to off-site waiting at `14:30`, gets a paper slip showing Place #1 (`0 to 15 minutes`), and is recalled before reaching the parking lot.
   * Smallest fix: Show the patient's projected place in line (and original triage time) on the `WaitingOnSite` row and confirmation step so the nurse can warn patients who are already near the front of the queue.
3. 24-hour row cleanup (`delete_old_visits`) can delete a switched visit while the patient is still waiting off-site — Severity: minor
   * File and line: `lib/switchToOffsite.ts`, lines 12–16; `delete_old_visits()` (`created_at < now() - interval '24 hours'`).
   * What goes wrong: Because the 6-hour switch window is measured from `closed_at` rather than `created_at`, a visit created at 22:00, triaged/declined at 01:00, and switched to `waiting` at 06:50 is already 8h 50m old; if ER waits exceed ~15 hours, the 24-hour retention job deletes the active `waiting` row and folds it into `daily_stats.open_at_deletion` while the patient is still waiting.
   * Concrete case: A visit started from home at `20:00` is triaged and declined at `02:00`, switched to `waiting` at `07:50`, and is deleted at `20:00` while still in `waiting`.
   * Smallest fix: Document this prototype boundary (or measure the switch window from `triaged_at` if triage-to-decline is always immediate).

3. Database trigger (`visits_check_step`)

1. Trigger does not enforce the 6-hour window, `triaged_at IS NOT NULL`, or `ctas_level IN (4, 5)` on `('declined', 'waiting')` — Severity: should fix
   * File and line: `supabase/migrations/20261119000000_declined_to_waiting.sql`, lines 28–31 and 43–44.
   * What goes wrong: Any authenticated staff session calling Supabase directly (or a client whose `serverNow()` has not yet synced) can move a `declined` visit to `waiting` 12 or 23 hours after `closed_at`, or move a corrupted `declined` row with `triaged_at IS NULL` or `ctas_level NOT IN (4, 5)` into the active off-site queue. (The trigger does properly block `not_eligible -> waiting`, block `declined -> called/on_the_way/arrived/removed`, and enforce `VWR02` when `site_settings.offsite_paused` is not `false`.)
   * Concrete case: A staff user (or integration test) executes `UPDATE visits SET status = 'waiting', closed_at = null WHERE id = ...` on a visit whose `closed_at` was 10 hours ago; `visits_check_step` accepts it without error.
   * Smallest fix: In `visits_check_step`, when `old.status = 'declined' and new.status = 'waiting'`, raise `VWR01` unless `old.closed_at is not null and old.closed_at > now() - interval '6 hours' and new.triaged_at is not null and new.ctas_level in (4, 5)`.
2. Direct SQL updates from `declined` to `waiting` can leave `closed_at` non-null — Severity: minor
   * File and line: `supabase/migrations/20261119000000_declined_to_waiting.sql`, lines 30–31.
   * What goes wrong: `switchToOffsite` sets `closed_at: null` in the client payload, so normal UI updates clear `closed_at`. However, neither `visits_check_step` nor `visits_before_write` requires or clears `new.closed_at` on `('declined', 'waiting')`, allowing an open `waiting` row to retain a stale `closed_at` timestamp if updated outside `switchToOffsite`.
   * Concrete case: An SQL update `UPDATE visits SET status = 'waiting' WHERE status = 'declined' AND id = ...` leaves `closed_at` populated on an active `waiting` visit.
   * Smallest fix: Require `new.closed_at is null` in `visits_check_step` when `new.status = 'waiting'`.

4. Accessibility and wording (WCAG 2.2 AA)

1. Opening or cancelling the checklist drops keyboard and screen-reader focus to `document.body` (WCAG 2.4.3) — Severity: must fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 48–59 and 99–124.
   * What goes wrong: Clicking `"Switch to off-site waiting"` hides that button (`open?.id !== visit.id`) and renders `<fieldset>` without moving focus into it, dropping focus to `document.body` (top of the page). Clicking `"Cancel"` unmounts `<fieldset>` and the focused `"Cancel"` button without returning focus to `"Switch to off-site waiting"`, again dropping focus to `document.body`.
   * Concrete case: A keyboard-only or NVDA/VoiceOver user activates `"Switch to off-site waiting visit ABC234"`; focus jumps back to the browser URL/page top instead of the first eligibility checkbox.
   * Smallest fix: Focus the first checkbox in `<fieldset>` when `openId` is set (via `useEffect` or callback ref), and return focus to that row's `"Switch to off-site waiting"` button (or `heading.current`) when `cancel()` runs.
2. Checklist validation failure leaves focus on the submit button without programmatic error association (WCAG 3.3.1 / 4.1.3) — Severity: should fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 63–65 and 109–116.
   * What goes wrong: Submitting with fewer than 3 checkboxes ticked updates `message` above the `<ul>` while keeping focus on `"Start off-site waiting"`, and none of the unticked inputs gets focus or `aria-invalid` / `aria-describedby`.
   * Concrete case: A nurse ticks 2 of 3 boxes and presses Enter; focus remains on the button below the list while the error renders above the list.
   * Smallest fix: Move focus to the first unticked checkbox in `CHECKLIST` when validation fails.
3. `heading.current?.focus()` races with `onSwitched` opening `VisitSlip` (WCAG 2.4.3) — Severity: should fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 68–75; `app/staff/page.tsx`, lines 69 and 122.
   * What goes wrong: `save(visit.id, onSwitched)` invokes `showSlip(updated)` to mount `<VisitSlip/>`, and `confirm()` immediately calls `heading.current?.focus()` afterward. Depending on whether `VisitSlip` manages focus on mount, `heading.current?.focus()` either steals focus out of the newly opened slip or triggers back-to-back focus announcements, and `<h2 ref={heading} tabIndex={-1}>` has no `focus-visible` outline class.
   * Concrete case: A nurse completes a switch; `<VisitSlip>` renders above `<WaitingOnSite>`, and `heading.current?.focus()` pulls focus away from the slip's close/print controls down to `"Waiting on-site: offered, declined (0)"`.
   * Smallest fix: Coordinate focus with `VisitSlip` (focus the slip when opened, and return focus to `heading.current` when `VisitSlip` closes) and add `focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950` to `<h2>`.
4. Missing space before `<DemoTag/>`, spoken `"middle dot"` separators, uncontextualized `"Cancel"` label, and `"Saving..."` live-region collision (WCAG 1.3.1 / 2.4.6 / 4.1.3) — Severity: should fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 67, 92–94, 102–104, and 121.
   * What goes wrong:
      * `{visit.code}<DemoTag .../>` has no whitespace separator, so screen readers concatenate the code and badge (`"ABC234Demo visit, synthetic data"`) and narrow viewports at 200% zoom can clip or overlap the inline badge border.
      * Bare `·` characters are read aloud as `"middle dot"`.
      * `"Cancel"` lacks `<span className="sr-only"> switch for visit {visit.code}</span>`, unlike the other two buttons in the row.
      * Setting `setMessage("Saving...")` inside `role="status"` right before the final message causes screen readers to announce `"Saving..."` and interrupt or delay the confirmation.
   * Concrete case: VoiceOver reads a row as `"ABC234Demo visit, synthetic data middle dot CTAS 4 middle dot declined 14 min ago"`, and announces `"Saving..."` when the nurse confirms.
   * Smallest fix: Add a space before `<DemoTag/>`, wrap `·` in `<span aria-hidden="true"> · </span>`, add `<span className="sr-only"> switch for visit {visit.code}</span>` to `"Cancel"`, and omit `setMessage("Saving...")` (relying on `aria-disabled={saving}` and the final `message`).

5. Missing capabilities for a nurse at the desk

1. No Undo or reverse path if a nurse switches the wrong patient — Severity: must fix
   * File and line: `lib/allowedSteps.ts`, lines 23–24; `supabase/migrations/20261119000000_declined_to_waiting.sql`, line 31; `components/staff/WaitingOnSite.tsx`, lines 71–75.
   * What goes wrong: Once a nurse ticks the 3 boxes and clicks `"Start off-site waiting"`, the row disappears from `WaitingOnSite` and moves to `waiting`. Neither `ALLOWED_MOVES` nor `visits_check_step` permits moving `waiting -> declined`. If a nurse clicks the wrong visit code (e.g., `ABC234` instead of `ABC243`) or the patient immediately changes their mind back at the counter, the nurse cannot return them to `declined`—their only options are marking them `arrived` or `removed`, which falsifies clinic metrics.
   * Concrete case: A nurse accidentally switches `ABC234` instead of `ABC243`. `ABC234` vanishes from the on-site list and enters the off-site queue with no way to put `ABC234` back in `declined`.
   * Smallest fix: Allow a short-window Undo (or `waiting -> declined` before recall when `called_at is null`) or show an Undo control in the confirmation banner.
2. Row omits original triage time (`triaged_at`) and projected queue position — Severity: should fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 102–104.
   * What goes wrong: Each row shows only `declined X ago` (`closed_at`), hiding `triaged_at` and how many people are ahead of them. A nurse handing over a QR slip cannot see whether the patient will enter at Place #12 (safe to leave) or Place #1 (about to be called immediately).
   * Concrete case: A patient who declined 3 hours ago switches to off-site waiting; the nurse hands them the slip without realizing they are immediately #1 in line.
   * Smallest fix: Display `triaged <Duration minutes="{minutesBetween(visit.triaged_at!," now)}/> ago` (and their projected place in `activeLine`) in the row metadata.
3. No way to view or update the patient's language before showing the slip — Severity: should fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 102–104; `app/staff/page.tsx`, line 120.
   * What goes wrong: Patients who originally declined at triage often have `language: "en"` recorded because they were not using the app. When they return to switch to off-site waiting, the nurse cannot see or change `visit.language` before `VisitSlip` renders with `slip.language`.
   * Concrete case: A Mandarin-speaking patient initially declines; an hour later their daughter arrives with a smartphone to wait off-site, and `VisitSlip` opens in English with no language selector in the switch flow.
   * Smallest fix: Show the visit's language badge (or a language selector inside the checklist `<fieldset>`) before generating the slip.
4. No way to mark a `declined` patient as called/seen or left from `"Waiting on-site: offered, declined"` — Severity: should fix
   * File and line: `components/staff/WaitingOnSite.tsx`, lines 95–127.
   * What goes wrong: Because `declined` stays in the `"Waiting on-site: offered, declined"` list for a full 6 hours and has no `"Mark arrived / seen"` or `"Left"` action, patients who have already been called into an exam room or left the ER remain mixed in with patients still waiting in the lobby.
   * Concrete case: Over a busy afternoon, 18 patients decline off-site waiting; 14 have already been seen and discharged, but all 18 remain listed under `"Waiting on-site: offered, declined"` until 6 hours pass.
   * Smallest fix: Either provide a `"Mark seen / close"` action on `WaitingOnSite` rows or add a note under the heading clarifying that the list shows all declined visits from the last 6 hours regardless of whether they were already called inside.

## Check (Claude, 2026-11-19)

Each point checked against the code on `declined-to-offsite` (`213be49`).

1.1 Double click. Not valid as described. Each click is its own browser event, and React draws the `saving` state before the next click arrives, so the second click returns at `if (saving) return`. `CheckInPanel.finish()` uses the same guard. No change.
1.2 Window ends while the checklist is open. Valid, minor: the nurse is told another screen changed the visit. Fix: check `canSwitchToOffsite` with the server clock before saving and say the 6 hours have passed.
1.3 Pause while the checklist is open. Valid: the checklist vanishes, focus is lost, and old ticks come back after a resume. Fix: close the checklist and clear the ticks when the switch stops being offered, focus the heading.
1.4 Sort on time text. Valid (the same problem `lib/queue.ts` already handles). Fix: compare `Date.parse` values, then the text, then the id, as `byTriage` does.
2.1 `last_still_here_at` set at the switch. Valid; noted in decisions.md as a trade-off. Owner decision needed (see below).
2.2 and 5.2 Place 1 at once. Valid as a desk need; the place itself is the owner's decision. Fix: show the triage time and the place in line the patient would get on the row and in the checklist.
2.3 24-hour cleanup. Valid edge case, already true for any visit waiting near 24 hours. No change; one line in docs/known-issues.md.
3.1 Trigger does not check the 6 hours. Partly valid: staff are trusted and every other move has the same reach, but the limit is cheap to enforce. Fix: the trigger refuses `declined` to `waiting` unless `old.closed_at` is under 6 hours old and `old.triaged_at` is set (`ctas_level` is already limited to 4 or 5 by the table check).
3.2 `closed_at` left set. Valid, minor. Fix: the trigger refuses `declined` to `waiting` unless `new.closed_at is null`. Only on this move, since every other move into `waiting` already clears it.
4.1 Focus on open and Cancel. Valid. Fix: focus the first checkbox when the checklist opens; Cancel returns focus to that row's switch button.
4.2 Focus after a failed checklist. Valid. Fix: focus the first unticked box.
4.3 Heading focus and the slip. Not valid: `VisitSlip` does not take focus, and the heading is the place the other lists use. No change.
4.4 Partly valid. `DemoTag` already adds a space and ", Demo visit" for screen readers; the "·" separator is the same as in `ExpectedArrivals`; "Saving..." is the same as in `CheckInPanel`. Fix only: Cancel gets the hidden words "switch for visit CODE".
5.1 No Undo. Valid. Owner decision needed (see below).
5.3 Language. Valid: the slip opens in the language recorded at triage. Fix: a language choice in the checklist, saved with the switch.
5.4 Patients already seen stay listed. Valid; the app does not track on-site patients after they decline. Owner decision needed (see below).

Owner decisions (2026-11-19): fix list OK; A yes ("switched to off-site N min ago" until the first tap), B yes (Undo before the recall), C note.
Fixed: lib and database `f35a3bc` (migration `20261119010000_declined_switch_checks.sql`; `supabase/checks/allowed_steps.sql` now 59 rows, all ok on a local Postgres 16 copy, and rows 30, 31, 33 and 110 fail against the earlier trigger as they should), staff screen `452cec9`. Checks: 74 test files, 449 tests pass; lint passed; build passed. Review done; file moved to `handoffs/archive/`. Not checked: the screen in a browser, and the new migration in the live database (owner runs it).
