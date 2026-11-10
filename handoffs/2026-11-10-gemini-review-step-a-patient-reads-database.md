# Review request: step A, the patient screen reads its visit from the database

Project: concept prototype of an emergency department virtual waiting room (Next.js 16 App Router,
React 19, Supabase). Demo data only: no names, health numbers, phone numbers or symptoms. Built by a
beginner with Claude Code. No keys, tokens or passwords are in this file.

## What changed

Step A of the storage plan (`handoffs/2026-11-10-gemini-review-supabase-storage-plan.md`). Before, the
patient screen read visits from the browser's localStorage. Now:

- `usePatientView(token)` calls the database function `get_patient_visit(p_token)` (security definer,
  callable by anon, returns only patient-safe fields; SQL below). It keeps the answer in memory, read
  through `useSyncExternalStore`, and re-reads every 30 seconds, when the tab becomes visible and when
  the browser comes back online. Live updates come in a later step.
- A failed read: the first one keeps the last view and retries after 5 seconds; a second in a row
  shows "We cannot load your visit right now". If nothing has loaded yet, the first failure shows that
  message at once. It never shows "No visit found" because of an error.
- `recordSeen` and `confirmOnMyWayByToken` call `record_seen` and `confirm_on_my_way`: true = saved,
  false = refused, an error = not_saved. The page retries `record_seen` every 10 seconds while it is
  not saved. The "I'm on my way" button shows "Sending…" and ignores a second tap while in flight.
- Not changed yet (steps B and C): starting a visit from home and all staff actions still use
  localStorage, so `startVisitFromHome` in the file below is the old code.

Checks so far: type check, lint, 77 unit tests. In a browser at 390 x 844: a token that matches no
visit shows "No visit found on this phone"; with the database blocked it shows "We cannot load your
visit right now" and recovers by itself when unblocked.

## Questions

1. Any bug in the read cache in `data/patientVisit.ts`: out-of-order answers, timers left running,
   a wrong value on first render or after the token changes, anything that breaks
   `useSyncExternalStore`'s rules?
2. Is "keep the last view through one failed read, then show cannot load" a safe choice for a patient
   who may be about to be called back? Would you choose different numbers (5-second retry, 2 failures)?
3. `seen_at` recording in `app/patient/page.tsx`: can it be missed, or sent when the called screen is
   not really showing?
4. Anything a patient's browser could learn or do here beyond hard rule 5 (a token reads only its own
   visit; patients can only record seen and confirm on my way)?
5. Anything confusing for a beginner to maintain, or simpler ways to do the same thing?

## `data/patientVisit.ts`

```ts
// Everything a patient's phone may do, each as one narrow call that takes the token
// (SPEC rule 5). Patient screens use only this file. Reading the visit and the two patient
// steps go to the database functions; starting from home still uses browser storage until
// the server route is built (step B of the storage plan).

import { useCallback, useSyncExternalStore } from "react";
import { makeAccessToken, makeUniqueDisplayCode } from "@/lib/codes";
import { afterFailedRead } from "@/lib/failedRead";
import type { PatientView } from "@/lib/patientView";
import { patientViewFromRow, type PatientVisitRow } from "@/lib/patientViewFromRow";
import type { Site } from "@/lib/visit";
import { startFromHome } from "@/lib/visitActions";
import { saveToken } from "./savedToken";
import { supabaseBrowser } from "./supabaseBrowser";
import { addVisit, readVisits, type ChangeResult } from "./visitStore";

/**
 * Start a visit from home on the start page, and remember it on this phone.
 * Still the Phase 1 stand-in (browser storage) until step B replaces it with the server route.
 * Returns the new visit's token, or null if this browser could not save it.
 */
export function startVisitFromHome(site: Site, language: string): string | null {
  const taken = new Set(readVisits().map((v) => v.code));
  const visit = startFromHome(
    { id: crypto.randomUUID(), code: makeUniqueDisplayCode(taken), access_token: makeAccessToken(), site, language },
    new Date(),
  );
  if (addVisit(visit) !== "saved") return null;
  saveToken(visit.access_token);
  return visit.access_token;
}

/** A visit, null if the token matches no visit, or "unavailable" if it could not be read. */
type Shown = PatientView | null | "unavailable";

const REREAD_MS = 30_000; // until live updates arrive in the next step
const RETRY_MS = 5_000; // sooner while reads are failing

// What each token last showed, kept in memory only (nothing about the visit is saved on the phone).
type Entry = { shown?: Shown; key: string; failures: number; latestRead: number };
const entries = new Map<string, Entry>();
const listeners = new Set<() => void>();

function entryFor(token: string): Entry {
  let entry = entries.get(token);
  if (!entry) {
    entry = { key: "", failures: 0, latestRead: 0 };
    entries.set(token, entry);
  }
  return entry;
}

async function readFromDatabase(token: string): Promise<PatientView | null | "failed"> {
  try {
    const { data, error } = await supabaseBrowser().rpc("get_patient_visit", { p_token: token });
    if (error || !Array.isArray(data)) return "failed";
    return data.length === 0 ? null : patientViewFromRow(data[0] as PatientVisitRow);
  } catch {
    return "failed";
  }
}

/** Read the visit again and tell the screens if anything changed. */
async function refreshPatientView(token: string): Promise<void> {
  const entry = entryFor(token);
  const thisRead = ++entry.latestRead;
  const read = await readFromDatabase(token);
  if (thisRead !== entry.latestRead) return; // a newer read has started; its answer wins
  entry.failures = read === "failed" ? entry.failures + 1 : 0;
  const next = read === "failed" ? afterFailedRead(entry.shown, entry.failures) : read;
  // Keep the same object until the view really changes, so React does not redraw for nothing.
  const key = JSON.stringify(next);
  if (entry.shown !== undefined && key === entry.key) return;
  entry.key = key;
  entry.shown = next;
  listeners.forEach((tell) => tell());
}

/** While a screen is showing this token: read now, every 30 seconds, and when the tab comes back. */
function watch(token: string | null, onChange: () => void): () => void {
  if (!token) return () => {};
  listeners.add(onChange);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const readNow = async () => {
    await refreshPatientView(token);
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(readNow, entryFor(token).failures > 0 ? RETRY_MS : REREAD_MS);
  };
  const onBack = () => {
    if (document.visibilityState === "visible") void readNow();
  };
  void readNow();
  document.addEventListener("visibilitychange", onBack);
  window.addEventListener("online", onBack);
  return () => {
    stopped = true;
    clearTimeout(timer);
    listeners.delete(onChange);
    document.removeEventListener("visibilitychange", onBack);
    window.removeEventListener("online", onBack);
  };
}

/**
 * The patient view for one token, read through the database function get_patient_visit.
 * Returns undefined while loading, null if the token matches no visit, and "unavailable"
 * if the visit could not be read (so the screen never says "no visit" because of an error).
 */
export function usePatientView(token: string | null): Shown | undefined {
  const subscribe = useCallback((onChange: () => void) => watch(token, onChange), [token]);
  const getSnapshot = useCallback(() => (token ? entries.get(token)?.shown : null), [token]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

/** Saved = the step was recorded; refused = not allowed now; not_saved = could not reach the database. */
async function patientStep(step: "record_seen" | "confirm_on_my_way", token: string): Promise<ChangeResult> {
  try {
    const { data, error } = await supabaseBrowser().rpc(step, { p_token: token });
    if (error || typeof data !== "boolean") return "not_saved";
    await refreshPatientView(token); // show the result straight away
    return data ? "saved" : "refused";
  } catch {
    return "not_saved";
  }
}

/** Record that the called screen was shown. Only while called, and only once. */
export function recordSeen(token: string): Promise<ChangeResult> {
  return patientStep("record_seen", token);
}

/** The patient taps "I'm on my way". Only while called. */
export function confirmOnMyWayByToken(token: string): Promise<ChangeResult> {
  return patientStep("confirm_on_my_way", token);
}
```

## `lib/patientViewFromRow.ts`

```ts
// Turns the row that the database function get_patient_visit returns into the PatientView
// shape the patient screens already use, and works out the simulated wait range.

import type { PatientView } from "./patientView";
import { DEFAULT_GAP_MINUTES, waitRange } from "./queue";
import type { Site, VisitStatus } from "./visit";

/** One row from get_patient_visit (supabase/migrations/20261110061049_patient_functions.sql). */
export type PatientVisitRow = {
  code: string;
  site: string;
  language: string;
  status: string;
  place_in_line: number | null;
  /** Whole minutes between recent call-backs at this site; null until there is history. */
  average_gap_minutes: number | null;
  called_at: string | null;
  last_still_here_at: string | null;
  seen: boolean;
  closed: boolean;
  expired: boolean;
};

export function patientViewFromRow(row: PatientVisitRow): PatientView {
  const place = row.place_in_line;
  // The same rule as averageCallGap in lib/queue.ts: 15 minutes until there is history, never under 1.
  const gap = Math.max(row.average_gap_minutes ?? DEFAULT_GAP_MINUTES, 1);
  const range = place === null ? null : waitRange(place, gap);
  return {
    code: row.code,
    site: row.site as Site,
    language: row.language,
    status: row.status as VisitStatus,
    placeInLine: place,
    waitLow: range?.low ?? null,
    waitHigh: range?.high ?? null,
    calledAt: row.called_at,
    lastStillHereAt: row.last_still_here_at,
    seen: row.seen,
    closed: row.closed,
    expired: row.expired,
  };
}
```

## `lib/failedRead.ts`

```ts
// Decides what the patient screen shows when reading the visit from the database fails.
// One failed read (a short signal drop) keeps the last view on screen; a second in a row
// shows "We cannot load your visit right now", so an old status is never shown for long.

import type { PatientView } from "./patientView";

export const FAILED_READS_BEFORE_UNAVAILABLE = 2;

type Shown = PatientView | null | "unavailable";

/** `shown` is what the screen has now (undefined = still loading). */
export function afterFailedRead(shown: Shown | undefined, failuresInARow: number): Shown {
  if (shown === undefined) return "unavailable"; // never a first answer of "no visit" on an error
  return failuresInARow >= FAILED_READS_BEFORE_UNAVAILABLE ? "unavailable" : shown;
}
```

## `app/patient/page.tsx`

```tsx
"use client";

// The patient screen on the patient's own phone: opens the visit from the link's token
// (or the one saved on this phone) and updates live.

import { useEffect, useState } from "react";
import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
import { takeTokenFromLink } from "@/data/savedToken";
import { EmergencyLine } from "@/components/EmergencyLine";
import { PatientShell } from "@/components/PatientShell";
import { PatientStatus } from "@/components/patient/PatientStatus";
import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";

export default function PatientPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [problem, setProblem] = useState("");
  const [brokenLink, setBrokenLink] = useState(false);
  const [sending, setSending] = useState(false);

  // Reading the link and browser storage can only happen in the browser, after the first render.
  // A new link opened on this same page (only the #t=... part changes) switches to that visit.
  useEffect(() => {
    const readLink = () => {
      const link = takeTokenFromLink();
      setToken(link.token);
      setBrokenLink(link.brokenLink);
      setProblem("");
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  const result = usePatientView(token ?? null);
  const loading = token === undefined || result === undefined;
  const unavailable = result === "unavailable";
  const view = result === "unavailable" ? null : result;

  // The first time the called screen is actually on screen, record seen_at
  // (shown, not necessarily read). A tab in the background waits until it is brought forward.
  useEffect(() => {
    if (!token || view?.status !== "called" || view.seen) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const recordIfVisible = async () => {
      clearTimeout(retry);
      if (stopped || document.visibilityState !== "visible") return;
      const result = await recordSeen(token);
      // Could not reach the database: try again shortly, for as long as the called screen is showing.
      if (result === "not_saved" && !stopped) retry = setTimeout(recordIfVisible, 10_000);
    };
    void recordIfVisible();
    document.addEventListener("visibilitychange", recordIfVisible);
    return () => {
      stopped = true;
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", recordIfVisible);
    };
  }, [token, view?.status, view?.seen]);

  async function onOnMyWay() {
    if (!token || sending) return;
    setSending(true);
    const result = await confirmOnMyWayByToken(token);
    setSending(false);
    setProblem(
      result === "not_saved"
        ? "Your answer was not saved, so staff have not been told. Please try again, or come back to the desk."
        : "",
    );
  }

  return (
    <PatientShell>
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-xl font-bold">Virtual Waiting Room</h1>
      <EmergencyLine />

      {loading ? (
        <p>Loading your visit…</p>
      ) : unavailable ? (
        <section aria-labelledby="unavailable-heading" className="clean-card space-y-2">
          <h2 id="unavailable-heading" className="text-2xl font-bold">
            We cannot load your visit right now
          </h2>
          <p className="text-lg">
            Nothing you do on this page can be saved at the moment, so staff may not see it. Please
            contact the emergency department desk.
          </p>
        </section>
      ) : !view ? (
        <section aria-labelledby="none-heading" className="clean-card space-y-2">
          <h2 id="none-heading" className="text-2xl font-bold">
            {brokenLink ? "This link did not work" : "No visit found on this phone"}
          </h2>
          {brokenLink && (
            <p className="text-lg">The link may have been cut short or mistyped, so no visit was opened.</p>
          )}
          <p className="text-lg">
            Scan the QR code on your desk slip with your phone&apos;s camera, or type the link
            printed under it. If that doesn&apos;t work, ask the desk to show the QR code again.
          </p>
        </section>
      ) : (
        <>
          <p className="text-base">
            Visit code: <strong className="font-mono tracking-widest">{view.code}</strong> · Demo
            Site {view.site}
          </p>
          <PatientStatus view={view} onOnMyWay={onOnMyWay} sending={sending} />
          {problem && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {problem}
            </p>
          )}
          <StatusAnnouncer key={token} status={view.status} />
        </>
      )}
    </main>
    </PatientShell>
  );
}
```

## `lib/patientViewFromRow.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { patientViewFromRow, type PatientVisitRow } from "./patientViewFromRow";

const waiting: PatientVisitRow = {
  code: "ABC234",
  site: "A",
  language: "en",
  status: "waiting",
  place_in_line: 2,
  average_gap_minutes: null,
  called_at: null,
  last_still_here_at: null,
  seen: false,
  closed: false,
  expired: false,
};

describe("patient view from a database row", () => {
  it("uses the 15-minute default gap until there is call-back history", () => {
    const view = patientViewFromRow(waiting);
    expect(view.placeInLine).toBe(2);
    expect(view.waitLow).toBe(20);
    expect(view.waitHigh).toBe(40);
  });

  it("uses the site's average gap when the database sends one", () => {
    const view = patientViewFromRow({ ...waiting, average_gap_minutes: 10 });
    expect(view.waitLow).toBe(15);
    expect(view.waitHigh).toBe(25);
  });

  it("never uses a gap under 1 minute", () => {
    const view = patientViewFromRow({ ...waiting, average_gap_minutes: 0 });
    expect(view.waitLow).toBe(5);
    expect(view.waitHigh).toBe(10);
  });

  it("has no place or wait range once called", () => {
    const view = patientViewFromRow({
      ...waiting,
      status: "called",
      place_in_line: null,
      called_at: "2026-11-10T20:00:00+00:00",
      seen: true,
    });
    expect(view.status).toBe("called");
    expect(view.placeInLine).toBeNull();
    expect(view.waitLow).toBeNull();
    expect(view.waitHigh).toBeNull();
    expect(view.calledAt).toBe("2026-11-10T20:00:00+00:00");
    expect(view.seen).toBe(true);
  });

  it("passes on closed and expired", () => {
    expect(patientViewFromRow({ ...waiting, status: "arrived", place_in_line: null, closed: true }).closed).toBe(true);
    expect(patientViewFromRow({ ...waiting, status: "pre_arrival", place_in_line: null, expired: true }).expired).toBe(true);
  });

  it("returns only the patient-safe fields, even if the row carried more", () => {
    const extra = { ...waiting, access_token: "secret", ctas_level: 5, id: "1" } as PatientVisitRow;
    const keys = Object.keys(patientViewFromRow(extra));
    for (const hidden of ["access_token", "ctas_level", "id"]) expect(keys).not.toContain(hidden);
  });
});
```

## `lib/failedRead.test.ts`

```ts
import { describe, expect, it } from "vitest";
import { afterFailedRead } from "./failedRead";
import type { PatientView } from "./patientView";

const view = { code: "ABC234", status: "waiting" } as PatientView;

describe("after a failed read of the patient's visit", () => {
  it("says unavailable, never 'no visit', when nothing has loaded yet", () => {
    expect(afterFailedRead(undefined, 1)).toBe("unavailable");
  });

  it("keeps the last view through one failed read", () => {
    expect(afterFailedRead(view, 1)).toBe(view);
    expect(afterFailedRead(null, 1)).toBeNull();
  });

  it("says unavailable after two failed reads in a row", () => {
    expect(afterFailedRead(view, 2)).toBe("unavailable");
    expect(afterFailedRead(null, 2)).toBe("unavailable");
  });

  it("stays unavailable while reads keep failing", () => {
    expect(afterFailedRead("unavailable", 3)).toBe("unavailable");
  });
});
```

## `supabase/migrations/20261110061049_patient_functions.sql` (lines 1 to 105)

```sql
-- Phase 2, part 2: everything a patient's phone may do, each as one narrow function
-- (hard rule 5). A phone proves which visit is its own only with the long access token.
-- These functions run with the table owner's rights ("security definer"), so they can
-- reach the visits table that patients cannot, and they return or change only what
-- the rule allows. Each mirrors a rule in lib/ (named in its comment).

-- ---------------------------------------------------------------------------
-- Read my visit: the patient-safe fields only (lib/patientView.ts PatientView).
-- Place in line counts patients still waiting at the same site who were triaged earlier
-- (ties broken by id, like lib/queue.ts). The wait range itself is worked out in
-- lib/queue.ts from place_in_line and average_gap_minutes, so that rule stays tested.
-- ---------------------------------------------------------------------------
create function public.get_patient_visit(p_token text)
returns table (
  code text,
  site text,
  language text,
  status text,
  place_in_line integer,
  -- Average minutes between the last 5 call-backs at this site, rounded to whole minutes
  -- so it cannot be used to work out exactly when other patients were called.
  -- Null with under 2 call-backs.
  average_gap_minutes integer,
  called_at timestamptz,
  last_still_here_at timestamptz,
  seen boolean,
  closed boolean,
  -- Started from home, never triaged, and 6 or more hours old (lib/expectedArrivals.ts).
  expired boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    me.code,
    me.site,
    me.language,
    me.status,
    case when me.status = 'waiting' and me.triaged_at is not null then (
      select count(*)::integer + 1
      from public.visits other
      where other.site = me.site
        and other.status = 'waiting'
        and other.triaged_at is not null
        and (other.triaged_at, other.id) < (me.triaged_at, me.id)
    ) end,
    case when me.status = 'waiting' then (
      -- The average of the gaps between 6 call-backs is (last - first) / 5.
      select case when count(*) >= 2
        then round(extract(epoch from max(last6.called_at) - min(last6.called_at)) / 60 / (count(*) - 1))::integer
      end
      from (
        select other.called_at
        from public.visits other
        where other.site = me.site and other.called_at is not null
        order by other.called_at desc
        limit 6
      ) last6
    ) end,
    me.called_at,
    me.last_still_here_at,
    me.seen_at is not null,
    me.closed_at is not null,
    me.status = 'pre_arrival' and me.triaged_at is null
      and me.created_at <= now() - interval '6 hours'
  from public.visits me
  where me.access_token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- The called screen was shown: sets seen_at once, only while called (lib markSeen).
-- Returns true if it was recorded, false if the step is not allowed now.
-- ---------------------------------------------------------------------------
create function public.record_seen(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set seen_at = now()
  where access_token = p_token and status = 'called' and seen_at is null;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- "I'm on my way": only while called (lib confirmOnMyWay).
-- ---------------------------------------------------------------------------
create function public.confirm_on_my_way(p_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
  set status = 'on_the_way', confirmed_at = now()
  where access_token = p_token and status = 'called';
  return found;
end;
$$;
```

