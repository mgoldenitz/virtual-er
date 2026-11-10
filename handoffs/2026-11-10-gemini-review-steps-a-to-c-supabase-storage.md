# Review request: steps A to C, visits moved from the browser to Supabase

Project: concept prototype of an emergency department virtual waiting room (Next.js 16 App Router,
React 19, Supabase). Demo data only: no names, health numbers, phone numbers or symptoms. Built by a
beginner with Claude Code. No keys, tokens or passwords are in this file.

You reviewed the plan for this work earlier (version numbers and database-set times came from your
answer). This is the code that followed. Live updates are NOT built yet: for now screens re-read on a
timer. Deployment and the per-device limit on starting a visit also come later; the app runs only on
the owner's computer.

## What changed

**Step A, the patient screen reads the database.** `usePatientView(token)` calls the database function
`get_patient_visit(p_token)` (security definer, callable by anon, returns only patient-safe fields),
keeps the answer in memory through `useSyncExternalStore`, and re-reads every 30 seconds, when the tab
becomes visible and when the browser comes back online. A failed read: the first keeps the last view
and retries after 5 seconds; a second in a row shows "We cannot load your visit right now"; with
nothing loaded yet the first failure shows it at once. `recordSeen` and `confirmOnMyWayByToken` call
`record_seen` and `confirm_on_my_way` (true = saved, false = refused, error = not_saved).

**Step B, starting a visit from home.** The phone POSTs only `{site, language}` to
`app/api/start-visit/route.ts`. The route makes the display code and token and calls
`start_home_visit` with the secret key (`data/supabaseServer.ts`, marked `server-only`). The database
function sets source = home and status = pre_arrival, refuses while paused, and allows 10 starts per
site per minute. The route retries up to 3 times on "taken".

**Step C, staff screens.** `data/visitCache.ts` loads visits (row-level security: signed-in staff
only) into memory: everyone still in the line, plus anything created or closed in the last 24 hours.
It re-reads every 15 seconds, on tab focus, and after each action. `data/staffActions.ts` applies a
tested rule from `lib/visitActions.ts` to the cached visit, then saves only the changed fields with
`update(changed).eq("id", id).eq("version", before.version).select()`. No row back = refused. A
database trigger raises `version` on every change and replaces every newly set time with `now()`.
Buttons show "Saving…" and ignore further presses while a change is in flight.

Checks done: type check, lint, 86 unit tests. In a browser: the whole loop through the database; two
staff tabs pressing "Call back" on one patient (second refused); a blocked database (not saved, and an
out-of-date banner that clears with "Try again"); axe-core WCAG 2.2 AA on the new states.

Not checked: the "paused" and "busy" answers of the start route.

## Questions

1. `data/visitCache.ts` and `data/patientVisit.ts`: any bug in the read caches? Out-of-order answers,
   a slow read putting an old row back after a save (see `latestLoad` and `putVisit`), timers left
   running, or anything that breaks the rules of `useSyncExternalStore`?
2. `data/staffActions.ts`: is the version check used correctly everywhere? Is there any staff action
   that can still overwrite someone else's change, or save twice?
3. The rules in `lib/visitActions.ts` still decide what is allowed, from the browser's copy of the
   visit; the database only checks the version. A signed-in staff account could send any update. The
   owner decided to move those checks into the database in Phase 3. Is anything here too risky to
   leave until then?
4. `app/api/start-visit/route.ts` and `data/supabaseServer.ts`: can the secret key leak to the
   browser? Is the request checked well enough? Anything missing besides the per-device limit?
5. Patient safety of the timing: a called patient's phone can take up to 30 seconds to show the
   call-back, and one failed read keeps the old screen for 5 more seconds. Staff see the patient's
   answer within 15 seconds. Acceptable until live updates are built, or change the numbers?
6. Timestamps come back from the database as text like `2026-11-10T09:13:09.82226+00:00` and some
   `lib/` rules compare them as text (`lib/queue.ts` `byTriage`, `lib/recentlyClosed.ts`). Is that
   safe, given every value now comes from the database in UTC?
7. Anything confusing for a beginner to maintain, or a simpler way to do the same thing?

## `data/patientVisit.ts`

```ts
// Everything a patient's phone may do, each as one narrow call that takes the token
// (SPEC rule 5). Patient screens use only this file. Reading the visit and the two patient
// steps go to the database functions; starting from home goes through the server route
// app/api/start-visit.

import { useCallback, useSyncExternalStore } from "react";
import { isAccessToken } from "@/lib/codes";
import { afterFailedRead } from "@/lib/failedRead";
import type { PatientView } from "@/lib/patientView";
import { patientViewFromRow, type PatientVisitRow } from "@/lib/patientViewFromRow";
import type { ChangeResult, Site } from "@/lib/visit";
import { saveToken } from "./savedToken";
import { supabaseBrowser } from "./supabaseBrowser";

/** saved = started and remembered on this phone; paused and busy = refused for now. */
export type StartResult = "saved" | "paused" | "busy" | "not_saved";

/**
 * Start a visit from home on the start page, and remember it on this phone.
 * The phone sends only the site and language to the server route, which makes the code and
 * token and asks the database; the database sets source = home and status = pre_arrival.
 */
export async function startVisitFromHome(site: Site, language: string): Promise<StartResult> {
  try {
    const response = await fetch("/api/start-visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ site, language }),
    });
    const answer: unknown = await response.json();
    const { result, token } = (answer ?? {}) as { result?: unknown; token?: unknown };
    if (result === "paused" || result === "busy") return result;
    if (result !== "saved" || typeof token !== "string" || !isAccessToken(token)) return "not_saved";
    saveToken(token);
    return "saved";
  } catch {
    return "not_saved";
  }
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

## `app/api/start-visit/route.ts`

```ts
// The server route a phone calls to start a visit from home (SPEC rule 5). The phone sends
// only a site and a language; this route makes the code and token, and the database function
// start_home_visit sets source = home and status = pre_arrival itself, refuses while off-site
// waiting is paused, and allows 10 starts per site per minute.

import { supabaseServer } from "@/data/supabaseServer";
import { makeAccessToken, makeDisplayCode } from "@/lib/codes";
import { parseStartVisitRequest } from "@/lib/startVisitRequest";

const TRIES = 3; // a new code and token each time the database says "taken"
const MAX_BODY_CHARACTERS = 200;

function answer(body: { result: string; token?: string }, status: number): Response {
  // The answer carries the token, so it must never be kept by a cache.
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_CHARACTERS) return answer({ result: "bad_request" }, 400);
    body = JSON.parse(text);
  } catch {
    return answer({ result: "bad_request" }, 400);
  }
  const wanted = parseStartVisitRequest(body);
  if (!wanted) return answer({ result: "bad_request" }, 400);

  try {
    const supabase = supabaseServer();
    for (let attempt = 0; attempt < TRIES; attempt++) {
      const token = makeAccessToken();
      const { data, error } = await supabase.rpc("start_home_visit", {
        p_site: wanted.site,
        p_language: wanted.language,
        p_code: makeDisplayCode(),
        p_token: token,
      });
      if (error) break;
      if (data === "saved") return answer({ result: "saved", token }, 200);
      if (data === "paused") return answer({ result: "paused" }, 409);
      if (data === "busy") return answer({ result: "busy" }, 429);
      if (data !== "taken") break;
    }
  } catch {
    // A missing setting or an unreachable database: the phone gets the same plain answer.
  }
  return answer({ result: "error" }, 500);
}
```

## `data/supabaseServer.ts`

```ts
// The Supabase connection that uses the secret key. It runs only on the server (the first
// line makes the build fail if a browser file ever imports it), and only the start-a-visit
// route uses it. The secret key is read from .env.local (or Vercel's settings), never from code.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;

export function supabaseServer(): SupabaseClient {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const secretKey = process.env.SUPABASE_SECRET_KEY;
    if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local (see .env.example).");
    if (!secretKey) throw new Error("SUPABASE_SECRET_KEY is missing. Add it to .env.local (see .env.example).");
    // No sign-in is kept or refreshed: this connection acts as the server itself, not as a person.
    client = createClient(url, secretKey, { auth: { persistSession: false, autoRefreshToken: false } });
  }
  return client;
}
```

## `lib/startVisitRequest.ts`

```ts
// Checks what a phone sends when it asks to start a visit from home: only a site and a
// language, and only values the app knows. Anything else is refused before the database is asked.

import type { Site } from "./visit";

/** Languages a visit can be started in. Two more are added in Phase 3. */
export const START_LANGUAGES = ["en"];

export type StartVisitRequest = { site: Site; language: string };

/** The site and language from the request body, or null if the body is not acceptable. */
export function parseStartVisitRequest(body: unknown): StartVisitRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { site, language } = body as Record<string, unknown>;
  if (site !== "A" && site !== "B") return null;
  if (typeof language !== "string" || !START_LANGUAGES.includes(language)) return null;
  // Only these two fields go on: the browser never sets the source, status, code or token.
  return { site, language };
}
```

## `data/visitCache.ts`

```ts
// The staff screens' copy of the visits: read from the database (row-level security lets only
// signed-in staff do this), held in memory, and read again on a timer, when the tab comes
// back, and after every staff action. Nothing here is saved in the browser.

import { ACTIVE_STATUSES, type Visit } from "@/lib/visit";
import { supabaseBrowser } from "./supabaseBrowser";

/** A visit as the database holds it: the version goes up by one on every change. */
export type StoredVisit = Visit & { version: number };

/** `visits` is null until the first read works; `outOfDate` is true when the last read failed. */
export type VisitList = { visits: StoredVisit[] | null; outOfDate: boolean };

export const EMPTY_LIST: VisitList = { visits: null, outOfDate: false };

const LIST_HOURS = 24; // plus everyone still in the line, however long ago they were triaged
const REREAD_MS = 15_000; // until live updates arrive in the next step
const RETRY_MS = 5_000; // sooner while reads are failing

let list: VisitList = EMPTY_LIST;
let visitsKey = "";
let latestLoad = 0;
const listeners = new Set<() => void>();

export function readVisitList(): VisitList {
  return list;
}

/** One visit from the copy on screen (with the version staff were looking at), or null. */
export function cachedVisit(id: string): StoredVisit | null {
  return list.visits?.find((v) => v.id === id) ?? null;
}

function show(visits: StoredVisit[] | null, outOfDate: boolean): void {
  // Keep the same list object until the visits really change: screens compare lists to
  // announce changes, and React does not redraw for nothing.
  const key = JSON.stringify(visits);
  const sameVisits = key === visitsKey;
  if (sameVisits && outOfDate === list.outOfDate) return;
  visitsKey = key;
  list = { visits: sameVisits ? list.visits : visits, outOfDate };
  listeners.forEach((tell) => tell());
}

/** Read the visits again: everyone still in the line, plus anything made or closed in the last 24 hours. */
export async function loadVisits(): Promise<void> {
  const thisLoad = ++latestLoad;
  const since = new Date(Date.now() - LIST_HOURS * 3_600_000).toISOString();
  let rows: StoredVisit[] | null = null;
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .select("*")
      .or(`status.in.(${ACTIVE_STATUSES.join(",")}),created_at.gte."${since}",closed_at.gte."${since}"`);
    if (!error && Array.isArray(data)) rows = data as StoredVisit[];
  } catch {
    // Treated like any other failed read below.
  }
  if (thisLoad !== latestLoad) return; // a newer read or a saved change has happened since; it wins
  if (rows) show(rows, false);
  else show(list.visits, true); // keep what was on screen, marked as possibly out of date
}

/** Put one freshly saved or freshly read visit into the copy straight away, then read everything again. */
export function putVisit(visit: StoredVisit): void {
  const others = (list.visits ?? []).filter((v) => v.id !== visit.id);
  latestLoad++; // a read that started before this change must not put the old row back
  show([...others, visit], list.outOfDate);
  void loadVisits();
}

/** While a staff screen is open: read now, every 15 seconds, and when the tab comes back. */
export function watchVisits(onChange: () => void): () => void {
  listeners.add(onChange);
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const readNow = async () => {
    await loadVisits();
    if (stopped) return;
    clearTimeout(timer);
    timer = setTimeout(readNow, list.outOfDate ? RETRY_MS : REREAD_MS);
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
```

## `data/useVisits.ts`

```ts
// React hook for staff screens: the list of visits from the database, kept up to date.
// `visits` is null until the first read works; `outOfDate` is true when the last read failed.

import { useSyncExternalStore } from "react";
import { EMPTY_LIST, readVisitList, watchVisits, type VisitList } from "./visitCache";

export function useVisits(): VisitList {
  return useSyncExternalStore(watchVisits, readVisitList, () => EMPTY_LIST);
}
```

## `data/staffActions.ts`

```ts
// What staff screens can do to visits. Each action applies a rule from lib/visitActions to
// the copy of the visit on screen, then saves only the changed fields to the database, and
// only if nobody else changed the visit in the meantime (its version number still matches).
// The database sets every time itself, so the device clock never decides line order.

import { changedFields } from "@/lib/changedFields";
import { makeAccessToken, makeUniqueDisplayCode, normalizeDisplayCode } from "@/lib/codes";
import type { ChangeResult, Site, Visit } from "@/lib/visit";
import {
  callBack,
  checkInAtDesk,
  checkInHomeVisit,
  markArrived,
  markRemoved,
  undoClose,
  type Closure,
  type DeskOutcome,
} from "@/lib/visitActions";
import { supabaseBrowser } from "./supabaseBrowser";
import { cachedVisit, loadVisits, putVisit, readVisitList, type StoredVisit } from "./visitCache";

export type CheckInForm = { site: Site; ctas_level: 4 | 5; language: string };

const CODE_TRIES = 3;
const ALREADY_USED = "23505"; // the database's error code for "this code or token is already used"

/** Apply one rule to one visit and save it. */
async function changeVisit(id: string, step: (visit: Visit) => Visit | null): Promise<ChangeResult> {
  const before = cachedVisit(id);
  const after = before ? step(before) : null;
  if (!before || !after) {
    void loadVisits();
    return "refused";
  }
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .update(changedFields(before, after))
      .eq("id", id)
      .eq("version", before.version)
      .select();
    if (error || !Array.isArray(data)) return "not_saved";
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

/**
 * Create a desk visit after triage. Returns the new visit so the slip can be shown,
 * or null if it could not be saved.
 */
export async function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Promise<Visit | null> {
  try {
    for (let attempt = 0; attempt < CODE_TRIES; attempt++) {
      const taken = new Set((readVisitList().visits ?? []).map((v) => v.code));
      const visit = checkInAtDesk(
        { id: crypto.randomUUID(), code: makeUniqueDisplayCode(taken), access_token: makeAccessToken(), ...form },
        outcome,
        new Date(),
      );
      const { data, error } = await supabaseBrowser().from("visits").insert(visit).select();
      if (error?.code === ALREADY_USED) continue; // an older visit not on this screen has the code
      if (error || !Array.isArray(data) || data.length === 0) return null;
      putVisit(data[0] as StoredVisit);
      return data[0] as StoredVisit;
    }
  } catch {
    // Could not reach the database.
  }
  return null;
}

/** Check in, after triage, a visit the patient started from home. */
export const checkInVisitFromHome = (id: string, form: CheckInForm, outcome: DeskOutcome) =>
  changeVisit(id, (v) => (v.site === form.site ? checkInHomeVisit(v, form, outcome, new Date()) : null));

/**
 * Staff-only lookup of a visit by the short code the patient reads out or shows. It asks the
 * database, so a visit started from home a moment ago is found. Returns "failed" if the
 * database could not be asked.
 */
export async function findVisitByCode(typed: string): Promise<Visit | null | "failed"> {
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .select("*")
      .eq("code", normalizeDisplayCode(typed))
      .maybeSingle();
    if (error) return "failed";
    if (data) putVisit(data as StoredVisit);
    return (data as StoredVisit | null) ?? null;
  } catch {
    return "failed";
  }
}

export const callBackVisit = (id: string) => changeVisit(id, (v) => callBack(v, new Date()));
export const markVisitArrived = (id: string) => changeVisit(id, (v) => markArrived(v, new Date()));
export const removeVisit = (id: string, reason: "left" | "no_show") =>
  changeVisit(id, (v) => markRemoved(v, reason, new Date()));
/** Undo one closure; `closure` is the closure the Undo button belongs to. */
export const undoCloseVisit = (id: string, closure: Closure) => changeVisit(id, (v) => undoClose(v, closure));

/** Read the list again now (the "Try again" button). */
export { loadVisits as reloadVisits } from "./visitCache";
```

## `lib/changedFields.ts`

```ts
// Works out which fields of a visit a staff action changed, so only those are sent to the
// database. A field nobody touched is never written back, so it cannot overwrite a newer value.

import type { Visit } from "./visit";

/** Set by the database only; the app never sends them in a change. */
const NEVER_SENT = ["id", "created_at", "version"];

export function changedFields(before: Visit, after: Visit): Partial<Visit> {
  const changed: Record<string, unknown> = {};
  for (const [field, value] of Object.entries(after)) {
    if (NEVER_SENT.includes(field)) continue;
    if (value !== (before as Record<string, unknown>)[field]) changed[field] = value;
  }
  return changed as Partial<Visit>;
}
```

## `lib/visitActions.ts`

```ts
// The core-loop steps as small rules. Each one takes a visit and the time,
// and returns the updated visit, or null when the step is not allowed right now
// (for example a second click after the list already changed).

import { isExpected } from "./expectedArrivals";
import { type Site, type Visit, type VisitStatus } from "./visit";

export type DeskCheckIn = {
  id: string;
  code: string;
  access_token: string;
  site: Site;
  ctas_level: 4 | 5;
  language: string;
  is_demo?: boolean;
};

export type DeskOutcome = "waiting" | "declined" | "not_eligible";

/** What a new visit needs, whether started at the desk or from home. */
export type NewVisit = { id: string; code: string; access_token: string; site: Site; language: string; is_demo?: boolean };

function blankVisit(input: NewVisit, source: "home" | "desk", nowIso: string): Visit {
  return {
    id: input.id,
    code: input.code,
    access_token: input.access_token,
    site: input.site,
    source,
    ctas_level: null,
    language: input.language,
    status: "pre_arrival",
    removed_reason: null,
    created_at: nowIso,
    triaged_at: null,
    offered_at: null,
    last_still_here_at: null,
    called_at: null,
    seen_at: null,
    confirmed_at: null,
    review_flagged_at: null,
    arrived_at: null,
    closed_at: null,
    phone_attempts: 0,
    last_phone_result: null,
    followup_paused_until: null,
    survey_score: null,
    is_demo: input.is_demo ?? false,
  };
}

/**
 * The nurse's check-in after triage, applied to a visit that has not been triaged yet.
 * Its place in line starts now (triaged_at), never when it was created (SPEC rule 7).
 * - waiting: offered and accepted off-site waiting; joins the line now.
 * - declined: offered, said no; waits on-site as usual (closed for virtual waiting).
 * - not_eligible: not offered; waits on-site as usual.
 */
function applyTriage(visit: Visit, ctas: 4 | 5, language: string, outcome: DeskOutcome, nowIso: string): Visit {
  const triaged = { ...visit, ctas_level: ctas, language, triaged_at: nowIso };
  if (outcome === "not_eligible") return { ...triaged, status: "not_eligible", closed_at: nowIso };
  const offered = { ...triaged, offered_at: nowIso };
  if (outcome === "declined") return { ...offered, status: "declined", closed_at: nowIso };
  return { ...offered, status: "waiting" };
}

/** A nurse checks in a patient at the desk after triage, for a patient who did not start a visit. */
export function checkInAtDesk(input: DeskCheckIn, outcome: DeskOutcome, now: Date): Visit {
  const nowIso = now.toISOString();
  return applyTriage(blankVisit(input, "desk", nowIso), input.ctas_level, input.language, outcome, nowIso);
}

/**
 * A patient starts a visit from home on the start page: "Checked in from home, not yet triaged".
 * This never gives a place in line (SPEC rule 7); that starts at triage.
 */
export function startFromHome(input: NewVisit, now: Date): Visit {
  return blankVisit(input, "home", now.toISOString());
}

/** A nurse checks in, after triage, a visit the patient started from home. Only before triage. */
export function checkInHomeVisit(
  visit: Visit,
  triage: { ctas_level: 4 | 5; language: string },
  outcome: DeskOutcome,
  now: Date,
): Visit | null {
  // Only while still expected: not triaged yet, and under 6 hours old.
  if (!isExpected(visit, now)) return null;
  return applyTriage(visit, triage.ctas_level, triage.language, outcome, now.toISOString());
}

/** Staff press "Call back". Only while waiting. */
export function callBack(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "waiting") return null;
  return { ...visit, status: "called", called_at: now.toISOString() };
}

/** The called screen was shown on the patient's phone. Sets seen_at once, only while called. */
export function markSeen(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "called" || visit.seen_at) return null;
  return { ...visit, seen_at: now.toISOString() };
}

/** The patient taps "I'm on my way". Only while called. */
export function confirmOnMyWay(visit: Visit, now: Date): Visit | null {
  if (visit.status !== "called") return null;
  return { ...visit, status: "on_the_way", confirmed_at: now.toISOString() };
}

/** Staff mark the patient as back at the hospital. Ends virtual waiting. */
export function markArrived(visit: Visit, now: Date): Visit | null {
  if (!["waiting", "called", "on_the_way"].includes(visit.status)) return null;
  const nowIso = now.toISOString();
  return { ...visit, status: "arrived", arrived_at: nowIso, closed_at: nowIso };
}

/** Staff remove the patient (left, or did not show). Ends virtual waiting. */
export function markRemoved(visit: Visit, reason: "left" | "no_show", now: Date): Visit | null {
  if (!["waiting", "called", "on_the_way"].includes(visit.status)) return null;
  return { ...visit, status: "removed", removed_reason: reason, closed_at: now.toISOString() };
}

/**
 * The status a closed visit had just before Mark arrived, Left or No-show.
 * Statuses only move forward (waiting, then called, then on the way) and closing keeps
 * called_at and confirmed_at, so the visit's own times say where it was.
 */
export function statusBeforeClose(visit: Visit): VisitStatus {
  if (visit.confirmed_at) return "on_the_way";
  if (visit.called_at) return "called";
  return "waiting";
}

/** What one closure left behind; the Undo button for that closure carries a copy. */
export type Closure = Pick<Visit, "status" | "removed_reason" | "arrived_at" | "closed_at">;

/**
 * Staff press Undo on one closure in the "Recently closed" list. There is no time limit.
 * `closure` names the exact closure the button belongs to: if the visit was reopened and
 * closed again since, its status, reason or times differ and the old button is refused, so it
 * can never reverse a newer action. (Two closures could only match on all four if they were
 * the same kind and happened in the same millisecond, and then undoing either gives the same
 * result.) The visit goes back to exactly its state before that closure.
 */
export function undoClose(visit: Visit, closure: Closure): Visit | null {
  if (visit.status !== "arrived" && visit.status !== "removed") return null;
  if (!visit.triaged_at || !visit.closed_at) return null;
  const sameClosure =
    visit.status === closure.status &&
    visit.removed_reason === closure.removed_reason &&
    visit.arrived_at === closure.arrived_at &&
    visit.closed_at === closure.closed_at;
  if (!sameClosure) return null;
  return {
    ...visit,
    status: statusBeforeClose(visit),
    arrived_at: null,
    removed_reason: null,
    closed_at: null,
  };
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

## `app/staff/page.tsx`

```tsx
"use client";

// The staff screen: check patients in (new at the desk, or expected from home), see who is
// waiting off-site, and call them back.

import { useEffect, useRef, useState } from "react";
import { reloadVisits } from "@/data/staffActions";
import { useVisits } from "@/data/useVisits";
import { homeCheckInProblem } from "@/lib/homeCheckIn";
import { activeLine } from "@/lib/queue";
import type { Site, Visit } from "@/lib/visit";
import { CheckInPanel } from "@/components/staff/CheckInPanel";
import { ExpectedArrivals } from "@/components/staff/ExpectedArrivals";
import { ProgressAnnouncer } from "@/components/staff/ProgressAnnouncer";
import { RecentlyClosed } from "@/components/staff/RecentlyClosed";
import { SignOutButton } from "@/components/staff/SignOutButton";
import { VisitRow } from "@/components/staff/VisitRow";
import { VisitSlip } from "@/components/staff/VisitSlip";
import { StaffShell } from "@/components/staff/StaffShell";
import { Button } from "@/components/Button";
import { useNow } from "@/components/useNow";

export default function StaffPage() {
  const { visits, outOfDate } = useVisits();
  const now = useNow();
  const [site, setSite] = useState<Site>("A");
  const [slip, setSlip] = useState<Visit | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [homeVisit, setHomeVisit] = useState<Visit | null>(null);

  // Staff chose an expected arrival: hide any old slip and move focus to the check-in form.
  const chooseHomeVisit = (visit: Visit) => {
    setSlip(null);
    setHomeVisit(visit);
  };
  useEffect(() => {
    if (homeVisit) document.getElementById("checkin-heading")?.focus();
  }, [homeVisit]);
  const listHeading = useRef<HTMLHeadingElement>(null);

  // A patient just left the list: say so, and move keyboard focus from the vanished row
  // to the list heading, so it is never lost.
  const onLeftList = (message: string) => {
    setAnnouncement(message);
    listHeading.current?.focus();
  };
  // After a working Undo its row (and the focused button) vanishes, so focus moves to the
  // list heading too; after a failed one, focus stays on the Undo button so staff can try again.
  const onUndoResult = (message: string, undone: boolean) => {
    setAnnouncement(message);
    if (undone) listHeading.current?.focus();
  };

  const line = visits ? activeLine(visits, site) : [];
  // The chosen home visit may have been checked in on another screen, or expired, since staff opened it.
  const homeProblem =
    homeVisit && visits && now
      ? homeCheckInProblem(homeVisit, visits.find((v) => v.id === homeVisit.id) ?? null, now)
      : null;
  // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none.
  const showSlip = (visit: Visit) => setSlip(visit.status === "waiting" || visit.called_at ? visit : null);

  return (
    <StaffShell>
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <header className="glass-panel flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Staff: Virtual Waiting Room</h1>
        <label className="flex items-center gap-2">
          <span className="font-semibold">Site</span>
          <select
            value={site}
            onChange={(e) => {
              setSite(e.target.value as Site);
              setSlip(null);
              setHomeVisit(null);
            }}
            className="min-h-11 rounded-lg border-2 border-control px-3"
          >
            <option value="A">Demo Site A</option>
            <option value="B">Demo Site B</option>
          </select>
        </label>
        <SignOutButton />
      </header>
      {outOfDate && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-red-800 bg-white p-3">
          <p className="font-semibold text-red-900">
            {visits
              ? "This list may be out of date: the visits could not be read just now. Check your connection."
              : "The visits could not be loaded. Check your connection, or sign out and sign in again."}
          </p>
          <Button variant="secondary" onClick={() => void reloadVisits()}>
            Try again
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          {visits && now && (
            <ExpectedArrivals visits={visits} site={site} now={now} onChoose={chooseHomeVisit} />
          )}
          <CheckInPanel
            key={site}
            site={site}
            onAttempt={() => setSlip(null)}
            onCreated={showSlip}
            homeVisit={homeVisit}
            homeProblem={homeProblem}
            onHomeDone={() => setHomeVisit(null)}
          />
          {slip && <VisitSlip code={slip.code} token={slip.access_token} onClose={() => setSlip(null)} />}
        </div>

        <section aria-labelledby="list-heading" className="glass-panel space-y-3">
          <h2 id="list-heading" ref={listHeading} tabIndex={-1} className="text-xl font-bold">
            Off-site: waiting or called back ({line.length})
          </h2>
          <p role="status" className="min-h-6 font-semibold">
            {announcement}
          </p>
          {visits === null || now === null ? (
            <p>{outOfDate ? "No list to show yet." : "Loading…"}</p>
          ) : line.length === 0 ? (
            <p>No one is waiting off-site at this site.</p>
          ) : (
            <ol className="space-y-3">
              {line.map((visit) => (
                <VisitRow
                  key={visit.id}
                  visit={visit}
                  now={now}
                  onShowSlip={setSlip}
                  onLeftList={onLeftList}
                />
              ))}
            </ol>
          )}
          {visits && <RecentlyClosed key={site} visits={visits} site={site} onUndoResult={onUndoResult} />}
          {visits && <ProgressAnnouncer visits={visits} site={site} />}
        </section>
      </div>
    </main>
    </StaffShell>
  );
}
```

## `components/staff/VisitRow.tsx`

```tsx
"use client";

// One patient in the staff's off-site list: minutes waited, call-back progress and actions.

import { useState } from "react";
import { callBackVisit, markVisitArrived, removeVisit } from "@/data/staffActions";
import { minutesBetween } from "@/lib/queue";
import type { ChangeResult, Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = {
  visit: Visit;
  now: Date;
  onShowSlip: (visit: Visit) => void;
  /** Called after a change takes this patient off the list, so the page can say so and move focus. */
  onLeftList: (message: string) => void;
};

const NOT_SAVED = "Not saved: the database could not be reached. Try again.";
const CHANGED = "The list just changed. Check this patient again.";

function progress(visit: Visit, now: Date): string {
  if (visit.status === "waiting") return "Waiting off-site";
  const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
  const steps = [`Called ${sinceCall} min ago`];
  // seen_at means the called screen was displayed on the phone, not that the patient read it.
  if (visit.seen_at) steps.push("Seen (screen shown, not necessarily read)");
  if (visit.status === "on_the_way") steps.push("On the way");
  return steps.join(" · ");
}

export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  /** Save one change and show what happened. `leftListMessage` is announced when the patient leaves the list. */
  const act = async (change: () => Promise<ChangeResult>, leftListMessage?: string) => {
    if (saving) return; // while one change is on its way, further presses do nothing
    setSaving(true);
    const result = await change();
    setSaving(false);
    if (result === "saved" && leftListMessage) {
      onLeftList(leftListMessage);
    }
    setNote(result === "saved" ? "" : result === "not_saved" ? NOT_SAVED : CHANGED);
  };
  const waited = visit.triaged_at ? minutesBetween(visit.triaged_at, now) : 0;

  return (
    <li className="rounded-xl border-2 border-slate-300 bg-white p-4" data-testid={`row-${visit.code}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xl font-bold tracking-widest">{visit.code}</p>
        <p>
          CTAS {visit.ctas_level} · waited <strong>{waited} min</strong>
        </p>
      </div>
      <p className="mt-1 font-semibold" data-testid="progress">
        {progress(visit, now)}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {visit.status === "waiting" && (
          <Button aria-disabled={saving} onClick={() => act(() => callBackVisit(visit.id))}>
            Call back
          </Button>
        )}
        <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => markVisitArrived(visit.id), `Visit ${visit.code} marked arrived. Undo is under Recently closed.`)}>
          Mark arrived
        </Button>
        <Button variant="secondary" onClick={() => onShowSlip(visit)}>
          Show QR again
        </Button>
      </div>
      <details className="mt-3">
        <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
          Remove from list
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="danger" aria-disabled={saving} onClick={() => act(() => removeVisit(visit.id, "left"), `Visit ${visit.code} removed: left. Undo is under Recently closed.`)}>
            Left
          </Button>
          <Button variant="danger" aria-disabled={saving} onClick={() => act(() => removeVisit(visit.id, "no_show"), `Visit ${visit.code} removed: no-show. Undo is under Recently closed.`)}>
            No-show
          </Button>
        </div>
      </details>
      {(saving || note) && (
        <p role="status" className={`mt-2 font-semibold ${saving ? "" : "text-red-800"}`}>
          {saving ? "Saving…" : note}
        </p>
      )}
    </li>
  );
}
```

## `supabase/migrations/20261110061049_patient_functions.sql`

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

-- ---------------------------------------------------------------------------
-- Start a visit from home. Only the app's server route may call this (it holds the
-- server-only key); browsers cannot. The function itself sets source = home and
-- status = pre_arrival, so it never grants a place in line (hard rule 7).
-- The server route makes the code and token with lib/codes.ts and retries on "taken".
-- Returns: saved, paused (off-site waiting is paused at this site), busy (10 or more
-- starts at this site in the last minute), or taken (code or token already used).
-- ---------------------------------------------------------------------------
create function public.start_home_visit(p_site text, p_language text, p_code text, p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- One start at a time per site, so two requests at once cannot both pass the cap below.
  perform pg_advisory_xact_lock(hashtext('start_home_visit:' || p_site));
  if exists (select 1 from public.site_settings where site = p_site and offsite_paused) then
    return 'paused';
  end if;
  -- A demo-sized cap for the whole site. A per-device limit is added on Vercel.
  if (select count(*) from public.visits
      where site = p_site and source = 'home' and created_at > now() - interval '1 minute') >= 10 then
    return 'busy';
  end if;
  insert into public.visits (code, access_token, site, source, language, status)
  values (p_code, p_token, p_site, 'home', p_language, 'pre_arrival');
  return 'saved';
exception
  when unique_violation then
    return 'taken';
end;
$$;

-- ---------------------------------------------------------------------------
-- Who may call what. New functions are callable by everyone unless this is done.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_patient_visit(text) from public, anon, authenticated;
revoke execute on function public.record_seen(text) from public, anon, authenticated;
revoke execute on function public.confirm_on_my_way(text) from public, anon, authenticated;
revoke execute on function public.start_home_visit(text, text, text, text) from public, anon, authenticated;

grant execute on function public.get_patient_visit(text) to anon, authenticated;
grant execute on function public.record_seen(text) to anon, authenticated;
grant execute on function public.confirm_on_my_way(text) to anon, authenticated;
grant execute on function public.start_home_visit(text, text, text, text) to service_role;
```

## `supabase/migrations/20261110090134_visit_version_and_database_times.sql`

```sql
-- Phase 2, part 3 (after Gemini 3.1 Pro's review of the storage plan):
-- 1. A version number on each visit that goes up on every change, so a staff screen working
--    from an older copy of a visit cannot overwrite a newer change (the app saves only
--    "where version = the version I read").
-- 2. The database's clock sets every time, never a device's clock, so a laptop with a wrong
--    clock cannot put patients in the wrong place in line.

alter table public.visits add column version integer not null default 1;

-- Runs before every insert and update of a visit.
-- Any time that is newly filled in is replaced with now(); a time cleared to empty (Undo)
-- stays empty. followup_paused_until is a time in the future, so it is left as given.
create function public.visits_before_write()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.version := 1;
    new.created_at := now();
    if new.triaged_at is not null then new.triaged_at := now(); end if;
    if new.offered_at is not null then new.offered_at := now(); end if;
    if new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
    if new.called_at is not null then new.called_at := now(); end if;
    if new.seen_at is not null then new.seen_at := now(); end if;
    if new.confirmed_at is not null then new.confirmed_at := now(); end if;
    if new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
    if new.arrived_at is not null then new.arrived_at := now(); end if;
    if new.closed_at is not null then new.closed_at := now(); end if;
  else
    new.version := old.version + 1;
    new.created_at := old.created_at;
    if new.triaged_at is distinct from old.triaged_at and new.triaged_at is not null then new.triaged_at := now(); end if;
    if new.offered_at is distinct from old.offered_at and new.offered_at is not null then new.offered_at := now(); end if;
    if new.last_still_here_at is distinct from old.last_still_here_at and new.last_still_here_at is not null then new.last_still_here_at := now(); end if;
    if new.called_at is distinct from old.called_at and new.called_at is not null then new.called_at := now(); end if;
    if new.seen_at is distinct from old.seen_at and new.seen_at is not null then new.seen_at := now(); end if;
    if new.confirmed_at is distinct from old.confirmed_at and new.confirmed_at is not null then new.confirmed_at := now(); end if;
    if new.review_flagged_at is distinct from old.review_flagged_at and new.review_flagged_at is not null then new.review_flagged_at := now(); end if;
    if new.arrived_at is distinct from old.arrived_at and new.arrived_at is not null then new.arrived_at := now(); end if;
    if new.closed_at is distinct from old.closed_at and new.closed_at is not null then new.closed_at := now(); end if;
  end if;
  return new;
end;
$$;

-- Only the trigger runs it; nobody can call it directly.
revoke execute on function public.visits_before_write() from public, anon, authenticated;

create trigger visits_before_write
  before insert or update on public.visits
  for each row execute function public.visits_before_write();
```

