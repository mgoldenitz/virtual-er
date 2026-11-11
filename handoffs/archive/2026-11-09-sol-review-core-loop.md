# Virtual Waiting Room: Phase 1 core loop, for review

Next.js 16 App Router + TypeScript + Tailwind. Phase 1 has no server: visits live in the browser's localStorage, and tabs sync through the 'storage' event. Demo data only; no real patients, keys or tokens are included.

## Project rules (excerpt from SPEC.md)
## Hard rules

1. Store no real personal or health information. A visit has two identifiers. The display code is 6 characters (letters and digits, no look-alike characters such as O/0 or I/1) so people can read it aloud or type it at the desk. The access token is long and random (at least 128 bits, for example 22 or more random URL-safe characters); the QR code and the link saved on the phone carry the token, and only the token opens a visit on a patient's phone. Only logged-in staff can look up a visit by its short code. Patients open a visit only with the token: the link saved on their phone or the QR code on a desk slip. No names, health card numbers, phone numbers or symptoms are stored.
2. The app never makes clinical decisions. Staff choose the CTAS level and confirm eligibility. No symptom checker, no AI triage.
3. Every patient screen, in every state and every language, shows: "If your symptoms get worse, call 911 or come back to the emergency department now."
4. Visits older than 24 hours are deleted automatically. Just before a visit is deleted, add its contribution to a daily_stats table, counting each number on the date of its own event (survey responses count on the closed_at date). No survey can arrive after deletion, so no day ever needs reprocessing; do not use a once-a-night summary job. The dashboard shows a day as its daily_stats totals plus the visits still in the visits table. daily_stats holds only totals (no codes, tokens or single-visit times).
5. A patient's token can read only its own visit, through one database function that returns only the fields a patient may see. Patients can do exactly five things, each through its own narrow function or server route: start a visit from home (a rate-limited server route that itself sets source = home and status = pre_arrival; the browser never sets them, it is refused while off-site waiting is paused, and this never grants a place in line), record that the called screen was shown (sets seen_at once, only while called), confirm "I'm on my way" (only while called), tap "I'm still here" (only while waiting), and submit the survey score once (only after the visit is closed, and only if the visit waited off-site and arrived). Everything else, including the queue, is staff only (Supabase row-level security). Patient pages learn about changes from a signal that holds no visit data (for example a one-row table touched on every change) and then re-read through the function, so they never subscribe to visit rows.
6. No hospital logos or official branding.
7. Joining from home never holds a place in the doctor's line. A patient's place in line starts when a nurse triages them at the hospital, because urgent patients are always seen first.
8. Do not copy or display THP's wait-time numbers. Link to THP's dashboard on THP's own site (https://trilliumhealthpartners.ca/emergency/a/visit.html, also served at https://www.thp.ca/emergency/A/visit.html). THP's terms prohibit reuse of its site material without written permission. All wait estimates inside the app are simulated.
9. Accessibility target: WCAG 2.2 AA (Ontario's legal minimum for public websites is WCAG 2.0 AA; 2.2 AA is the stronger design target). That means keyboard access, visible focus, labelled controls, touch targets of at least 24 by 24 CSS pixels, enough colour contrast, text that still works at 200% size, and pages that reflow on a small phone without sideways scrolling. Never rely on sound or colour alone: every alert and status also appears as words on screen.

### /patient (phone, no login)

- Opens the visit saved on this phone automatically. For patients who did not start on their own phone, the triage desk prints a slip with a QR code (carrying the token), the short code, and the full link written out under the QR code with a label ("Or type this link into your phone's browser"), so a patient whose camera cannot scan still has a way in. The patient scans the QR code with the phone camera; if that fails, staff show the QR code again from /staff. Typing the short code on /patient does not open a visit.
- Shows: place in line, estimated time to see a doctor after triage, as a range (for example "40 to 60 minutes", simulated; THP's own dashboard also measures waits from triage), and status: Waiting, Please head back now, Ready at the desk.
- Under the place in line, always show: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first."
- "I'm on my way" button after the patient is called.
- Every 30 minutes while waiting off-site, an "I'm still here" button appears. A missed tap (no tap within 10 minutes of the prompt) flags the patient on the staff screen. "I'm still here" only tells staff the patient is still following the visit; it is not a clinical reassessment, and neither the patient screen nor the staff screen may describe it as one. If symptoms change, the 911 line applies.
- The first time the called screen is shown, the page records seen_at. This means the screen was displayed in an open browser, not that the patient read it or is coming; staff still wait for "I'm on my way" and arrival. Sent, seen, on my way and arrived are tracked separately.
- While called but unconfirmed, the screen alerts with sound and vibration where the phone allows. These are on-screen demo alerts: they work only while the page is open and the phone is unlocked, and the demo must say so. Do not claim the app can wake a locked phone. A hospital version would use text messages or push notifications (iPhones allow web push only for sites added to the home screen). After the 20-minute step it shows: "Please return now. Staff will review your visit if you do not respond."
- Language switch: English plus two languages (TBD). All text comes from one translation file so it can be checked by a fluent speaker.
- Text size control. Works on a small phone. Screen-reader labels on all controls.
- Screen readers announce meaningful status changes (for example "You have been called back") through a polite live region, or an assertive one for the call-back. The wait range and any countdown are not announced on every update.
- After the visit is closed, only for patients who waited off-site and arrived: one survey question, "How would you rate your waiting experience?" on a 0 to 10 scale.
- Updates live without refreshing.

## lib/visit.ts
```tsx
// The shape of one visit, matching the visits table in SPEC.md.
// Times are ISO strings (for example "2026-11-09T20:15:00.000Z"), or null if not set yet.

export type Site = "A" | "B";

export type VisitStatus =
  | "pre_arrival"
  | "waiting"
  | "called"
  | "on_the_way"
  | "arrived"
  | "unable_to_reach"
  | "needs_reassessment"
  | "removed"
  | "declined"
  | "not_eligible";

export type Visit = {
  id: string;
  code: string;
  access_token: string;
  site: Site;
  source: "home" | "desk";
  ctas_level: 4 | 5 | null;
  language: string;
  status: VisitStatus;
  removed_reason: "left" | "no_show" | null;
  created_at: string;
  triaged_at: string | null;
  offered_at: string | null;
  last_still_here_at: string | null;
  called_at: string | null;
  seen_at: string | null;
  confirmed_at: string | null;
  review_flagged_at: string | null;
  arrived_at: string | null;
  closed_at: string | null;
  phone_attempts: number;
  last_phone_result: "answered" | "no_answer" | null;
  followup_paused_until: string | null;
  survey_score: number | null;
  is_demo: boolean;
};

/** Statuses that are still in the off-site line (not yet closed). */
export const ACTIVE_STATUSES: VisitStatus[] = ["waiting", "called", "on_the_way"];
```

## lib/codes.ts
```tsx
// Makes the two visit identifiers from SPEC rule 1:
// a short display code people can read aloud, and a long secret access token.

/** Letters and digits with no look-alikes (no O/0, I/1, L). */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Crockford base32: case-insensitive, no I, L, O or U. */
const TOKEN_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

type RandomBytes = (length: number) => Uint8Array;

const browserRandomBytes: RandomBytes = (length) =>
  crypto.getRandomValues(new Uint8Array(length));

/** 6-character display code. Not a secret; it never opens a visit for a patient. */
export function makeDisplayCode(randomBytes: RandomBytes = browserRandomBytes): string {
  let code = "";
  while (code.length < 6) {
    // Reject bytes that would bias the result (256 is not a multiple of 31).
    const limit = 256 - (256 % CODE_ALPHABET.length);
    for (const byte of randomBytes(12)) {
      if (byte < limit && code.length < 6) code += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return code;
}

/** Display code that is not already used by an existing visit. */
export function makeUniqueDisplayCode(
  taken: Set<string>,
  randomBytes: RandomBytes = browserRandomBytes,
): string {
  for (let attempt = 0; attempt < 50; attempt++) {
    const code = makeDisplayCode(randomBytes);
    if (!taken.has(code)) return code;
  }
  throw new Error("Could not find a free display code");
}

/** Access token: 16 random bytes (128 bits) as 26 Crockford base32 characters. */
export function makeAccessToken(randomBytes: RandomBytes = browserRandomBytes): string {
  const bytes = randomBytes(16);
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += TOKEN_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += TOKEN_ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

/** Token split into groups of 4, so a typed link is easier to copy from paper. */
export function groupToken(token: string): string {
  return token.match(/.{1,4}/g)?.join("-") ?? token;
}

/** Undo grouping and typing slips: drop spaces/hyphens, upper-case, and map look-alikes. */
export function normalizeToken(typed: string): string {
  return typed
    .replace(/[\s-]/g, "")
    .toUpperCase()
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
}
```

## lib/visitActions.ts
```tsx
// The core-loop steps as small rules. Each one takes a visit and the time,
// and returns the updated visit, or null when the step is not allowed right now
// (for example a second click after the list already changed).

import type { Site, Visit } from "./visit";

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

function blankVisit(input: DeskCheckIn, nowIso: string): Visit {
  return {
    id: input.id,
    code: input.code,
    access_token: input.access_token,
    site: input.site,
    source: "desk",
    ctas_level: input.ctas_level,
    language: input.language,
    status: "waiting",
    removed_reason: null,
    created_at: nowIso,
    triaged_at: nowIso,
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
 * A nurse checks in a patient at the desk after triage.
 * - waiting: offered and accepted off-site waiting; joins the line now.
 * - declined: offered, said no; waits on-site as usual (closed for virtual waiting).
 * - not_eligible: not offered; waits on-site as usual.
 */
export function checkInAtDesk(input: DeskCheckIn, outcome: DeskOutcome, now: Date): Visit {
  const nowIso = now.toISOString();
  const visit = blankVisit(input, nowIso);
  if (outcome === "not_eligible") {
    return { ...visit, status: "not_eligible", closed_at: nowIso };
  }
  visit.offered_at = nowIso;
  if (outcome === "declined") {
    return { ...visit, status: "declined", closed_at: nowIso };
  }
  return visit;
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
```

## lib/queue.ts
```tsx
// Line order and the simulated wait range.
// The line is ordered by triaged_at, never by created_at (SPEC data section).

import { ACTIVE_STATUSES, type Site, type Visit } from "./visit";

const byTriage = (a: Visit, b: Visit) =>
  (a.triaged_at ?? "").localeCompare(b.triaged_at ?? "");

/** Visits still in the off-site line at one site, oldest triage first. */
export function activeLine(visits: Visit[], site: Site): Visit[] {
  return visits
    .filter((v) => v.site === site && v.triaged_at && ACTIVE_STATUSES.includes(v.status))
    .sort(byTriage);
}

/** 1-based place among patients still waiting at the same site, or null if not waiting. */
export function placeInLine(visits: Visit[], visit: Visit): number | null {
  if (visit.status !== "waiting" || !visit.triaged_at) return null;
  const ahead = visits.filter(
    (v) =>
      v.site === visit.site &&
      v.status === "waiting" &&
      v.triaged_at !== null &&
      v.triaged_at < visit.triaged_at!,
  ).length;
  return ahead + 1;
}

export const DEFAULT_GAP_MINUTES = 15;

/** Average minutes between the last 5 call-backs at a site; 15 until there is history. */
export function averageCallGap(visits: Visit[], site: Site): number {
  const times = visits
    .filter((v) => v.site === site && v.called_at)
    .map((v) => new Date(v.called_at!).getTime())
    .sort((a, b) => a - b)
    .slice(-6); // 6 call-backs give 5 gaps
  if (times.length < 2) return DEFAULT_GAP_MINUTES;
  const gaps = times.slice(1).map((t, i) => (t - times[i]) / 60_000);
  const avg = gaps.reduce((sum, g) => sum + g, 0) / gaps.length;
  return Math.max(avg, 1);
}

/**
 * Simulated wait range in minutes (SPEC rule 8: never THP's numbers).
 * place × average gap, shown as 80% to 125%, rounded out to 5 minutes.
 */
export function waitRange(place: number, gapMinutes: number): { low: number; high: number } {
  const middle = place * gapMinutes;
  const low = Math.max(5, Math.floor((middle * 0.8) / 5) * 5);
  const high = Math.max(low + 5, Math.ceil((middle * 1.25) / 5) * 5);
  return { low, high };
}

/** Whole minutes from one time to another (never negative). */
export function minutesBetween(fromIso: string, to: Date): number {
  return Math.max(0, Math.floor((to.getTime() - new Date(fromIso).getTime()) / 60_000));
}
```

## lib/patientView.ts
```tsx
// What a patient's phone is allowed to see about its own visit (SPEC rule 5).
// In Phase 2 a database function returns this same shape; nothing else leaves the database.

import { averageCallGap, placeInLine, waitRange } from "./queue";
import type { Site, Visit, VisitStatus } from "./visit";

export type PatientView = {
  code: string;
  site: Site;
  language: string;
  status: VisitStatus;
  placeInLine: number | null;
  waitLow: number | null;
  waitHigh: number | null;
  calledAt: string | null;
  lastStillHereAt: string | null;
  seen: boolean;
  closed: boolean;
};

/** Find the visit with this token and return only the patient-safe fields, or null. */
export function patientViewFor(visits: Visit[], token: string): PatientView | null {
  const visit = visits.find((v) => v.access_token === token);
  if (!visit) return null;
  const place = placeInLine(visits, visit);
  const range = place === null ? null : waitRange(place, averageCallGap(visits, visit.site));
  return {
    code: visit.code,
    site: visit.site,
    language: visit.language,
    status: visit.status,
    placeInLine: place,
    waitLow: range?.low ?? null,
    waitHigh: range?.high ?? null,
    calledAt: visit.called_at,
    lastStillHereAt: visit.last_still_here_at,
    seen: visit.seen_at !== null,
    closed: visit.closed_at !== null,
  };
}
```

## data/visitStore.ts
```tsx
// Phase 1 stand-in for the database: keeps all visits in this browser's localStorage.
// Every tab of the same browser shares it, and other tabs hear about changes
// through the browser's "storage" event, so two tabs stay in sync without a server.

import type { Visit } from "@/lib/visit";

const STORAGE_KEY = "vwr.visits.v1";
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cachedVisits: Visit[] = [];

function safeGet(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/** All visits, as one stable array until something changes. */
export function readVisits(): Visit[] {
  const raw = safeGet();
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    try {
      cachedVisits = raw ? (JSON.parse(raw) as Visit[]) : [];
    } catch {
      cachedVisits = [];
    }
  }
  return cachedVisits;
}

function writeVisits(visits: Visit[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
  } catch {
    // Storage blocked (private mode, full disk): the demo can't save, but must not crash.
  }
  listeners.forEach((notify) => notify()); // the "storage" event only reaches other tabs
}

export function addVisit(visit: Visit): void {
  writeVisits([...readVisits(), visit]);
}

/**
 * Apply one rule (from lib/visitActions) to one visit.
 * Returns false when the visit is gone or the rule refused, for example a double click.
 */
export function updateVisit(id: string, step: (visit: Visit) => Visit | null): boolean {
  const visits = readVisits();
  const current = visits.find((v) => v.id === id);
  if (!current) return false;
  const next = step(current);
  if (!next) return false;
  writeVisits(visits.map((v) => (v.id === id ? next : v)));
  return true;
}

/** Call `onChange` whenever visits change in this tab or another tab. Returns an unsubscribe. */
export function subscribeToVisits(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY || event.key === null) onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
```

## data/patientVisit.ts
```tsx
// Everything a patient's phone may do, each as one narrow function that takes the token
// (SPEC rule 5). Patient screens use only this file, never visitStore directly,
// so Phase 2 can swap these for database functions without touching the screens.

import { useCallback, useSyncExternalStore } from "react";
import { patientViewFor, type PatientView } from "@/lib/patientView";
import { confirmOnMyWay, markSeen } from "@/lib/visitActions";
import { readVisits, subscribeToVisits, updateVisit } from "./visitStore";

function idForToken(token: string): string | null {
  return readVisits().find((v) => v.access_token === token)?.id ?? null;
}

/** Record that the called screen was shown. Only while called, and only once. */
export function recordSeen(token: string): boolean {
  const id = idForToken(token);
  return id ? updateVisit(id, (v) => markSeen(v, new Date())) : false;
}

/** The patient taps "I'm on my way". Only while called. */
export function confirmOnMyWayByToken(token: string): boolean {
  const id = idForToken(token);
  return id ? updateVisit(id, (v) => confirmOnMyWay(v, new Date())) : false;
}

// Cache so React gets the same object until the view really changes.
let lastKey = "";
let lastView: PatientView | null = null;

function readView(token: string): PatientView | null {
  const view = patientViewFor(readVisits(), token);
  const key = token + JSON.stringify(view);
  if (key !== lastKey) {
    lastKey = key;
    lastView = view;
  }
  return lastView;
}

/**
 * Live patient view for one token. The change signal carries no visit data:
 * on every change the hook simply re-reads through patientViewFor.
 * Returns undefined before the browser has loaded, null if the token matches no visit.
 */
export function usePatientView(token: string | null): PatientView | null | undefined {
  const getSnapshot = useCallback(() => (token ? readView(token) : null), [token]);
  return useSyncExternalStore(subscribeToVisits, getSnapshot, () => undefined);
}
```

## data/savedToken.ts
```tsx
// Remembers this phone's visit token in browser storage, so reopening the site
// brings the visit back without the patient typing anything.

import { normalizeToken } from "@/lib/codes";

const TOKEN_KEY = "vwr.patientToken";

export function loadSavedToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token: string): void {
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Storage blocked: the visit still works in this tab, it just won't be remembered.
  }
}

/**
 * Take a token from the link's #t=... part (never sent to a server), save it,
 * and remove it from the address bar. Falls back to the token saved earlier.
 */
export function takeTokenFromLink(): string | null {
  const match = window.location.hash.match(/[#&]t=([^&]+)/);
  if (match) {
    const token = normalizeToken(decodeURIComponent(match[1]));
    saveToken(token);
    window.history.replaceState(null, "", window.location.pathname);
    return token;
  }
  return loadSavedToken();
}

/** The link printed on the desk slip and carried by the QR code. */
export function patientLink(origin: string, token: string): string {
  return `${origin}/patient#t=${token}`;
}
```

## data/staffActions.ts
```tsx
// What staff screens can do to visits. Phase 2 replaces the insides with Supabase calls
// behind staff login; the screens keep calling these same functions.

import { makeAccessToken, makeUniqueDisplayCode } from "@/lib/codes";
import type { Site, Visit } from "@/lib/visit";
import {
  callBack,
  checkInAtDesk,
  markArrived,
  markRemoved,
  type DeskOutcome,
} from "@/lib/visitActions";
import { addVisit, readVisits, updateVisit } from "./visitStore";

export type CheckInForm = { site: Site; ctas_level: 4 | 5; language: string };

/** Create a desk visit after triage. Returns the new visit so the slip can be shown. */
export function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Visit {
  const taken = new Set(readVisits().map((v) => v.code));
  const visit = checkInAtDesk(
    {
      id: crypto.randomUUID(),
      code: makeUniqueDisplayCode(taken),
      access_token: makeAccessToken(),
      ...form,
    },
    outcome,
    new Date(),
  );
  addVisit(visit);
  return visit;
}

export const callBackVisit = (id: string) => updateVisit(id, (v) => callBack(v, new Date()));
export const markVisitArrived = (id: string) => updateVisit(id, (v) => markArrived(v, new Date()));
export const removeVisit = (id: string, reason: "left" | "no_show") =>
  updateVisit(id, (v) => markRemoved(v, reason, new Date()));
```

## app/staff/page.tsx
```tsx
"use client";

// The staff screen: check patients in, see who is waiting off-site, call them back.

import { useState } from "react";
import { useVisits } from "@/data/useVisits";
import { activeLine } from "@/lib/queue";
import type { Site, Visit } from "@/lib/visit";
import { CheckInPanel } from "@/components/staff/CheckInPanel";
import { VisitRow } from "@/components/staff/VisitRow";
import { VisitSlip } from "@/components/staff/VisitSlip";
import { useNow } from "@/components/useNow";

export default function StaffPage() {
  const visits = useVisits();
  const now = useNow();
  const [site, setSite] = useState<Site>("A");
  const [slip, setSlip] = useState<Visit | null>(null);

  const line = visits ? activeLine(visits, site) : [];
  // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none.
  const showSlip = (visit: Visit) => setSlip(visit.status === "waiting" || visit.called_at ? visit : null);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Staff: Virtual Waiting Room</h1>
        <label className="flex items-center gap-2">
          <span className="font-semibold">Site</span>
          <select
            value={site}
            onChange={(e) => {
              setSite(e.target.value as Site);
              setSlip(null);
            }}
            className="min-h-11 rounded-lg border-2 border-slate-400 px-3"
          >
            <option value="A">Demo Site A</option>
            <option value="B">Demo Site B</option>
          </select>
        </label>
      </header>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
        Phase 1 demo: no staff login yet, and all data stays in this browser.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <CheckInPanel site={site} onCreated={showSlip} />
          {slip && <VisitSlip code={slip.code} token={slip.access_token} onClose={() => setSlip(null)} />}
        </div>

        <section aria-labelledby="list-heading" className="space-y-3">
          <h2 id="list-heading" className="text-xl font-bold">
            Waiting off-site ({line.length})
          </h2>
          {visits === null || now === null ? (
            <p>Loading…</p>
          ) : line.length === 0 ? (
            <p>No one is waiting off-site at this site.</p>
          ) : (
            <ol className="space-y-3">
              {line.map((visit) => (
                <VisitRow key={visit.id} visit={visit} now={now} onShowSlip={setSlip} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
}
```

## components/staff/CheckInPanel.tsx
```tsx
"use client";

// Staff check-in after triage: CTAS level, eligibility checklist, language, then one of
// "start off-site waiting", "offered, declined" or "not eligible".

import { useState, type FormEvent } from "react";
import { createDeskVisit } from "@/data/staffActions";
import type { Site, Visit } from "@/lib/visit";
import type { DeskOutcome } from "@/lib/visitActions";
import { Button } from "@/components/Button";

const CHECKLIST = [
  { id: "phone", label: "Has a phone with them" },
  { id: "return", label: "Can return within 20 minutes" },
  { id: "agrees", label: "Agrees to wait off-site" },
] as const;

type Props = { site: Site; onCreated: (visit: Visit) => void };

export function CheckInPanel({ site, onCreated }: Props) {
  const [ctas, setCtas] = useState<4 | 5 | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [language, setLanguage] = useState("en");
  const [message, setMessage] = useState("");

  function finish(outcome: DeskOutcome) {
    if (ctas === null) {
      setMessage("Choose CTAS 4 or 5 first.");
      return;
    }
    if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
      setMessage("Tick all three checklist items to start off-site waiting.");
      return;
    }
    const visit = createDeskVisit({ site, ctas_level: ctas, language }, outcome);
    setCtas(null);
    setTicked({});
    setMessage(
      outcome === "waiting"
        ? `Visit ${visit.code} is now waiting off-site.`
        : `Recorded as ${outcome === "declined" ? "offered, declined" : "not eligible"}. The patient waits on-site as usual.`,
    );
    onCreated(visit);
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    finish("waiting");
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4" aria-labelledby="checkin-heading">
      <h2 id="checkin-heading" className="text-xl font-bold">
        Check in a patient after triage
      </h2>

      <fieldset>
        <legend className="font-semibold">CTAS level (chosen by the triage nurse)</legend>
        <div className="mt-2 flex gap-3">
          {([4, 5] as const).map((level) => (
            <label key={level} className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-slate-400 px-4">
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

      <fieldset>
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
          className="mt-2 block min-h-11 rounded-lg border-2 border-slate-400 px-3"
        >
          <option value="en">English</option>
        </select>
        <span className="mt-1 block text-sm text-slate-700">Two more languages come in Phase 3.</span>
      </label>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Start off-site waiting</Button>
        <Button variant="secondary" onClick={() => finish("declined")}>
          Offered, declined
        </Button>
        <Button variant="secondary" onClick={() => finish("not_eligible")}>
          Not eligible
        </Button>
      </div>

      <p role="status" className="min-h-6 font-semibold">
        {message}
      </p>
    </form>
  );
}
```

## components/staff/VisitRow.tsx
```tsx
"use client";

// One patient in the staff's off-site list: minutes waited, call-back progress and actions.

import { useState } from "react";
import { callBackVisit, markVisitArrived, removeVisit } from "@/data/staffActions";
import { minutesBetween } from "@/lib/queue";
import type { Visit } from "@/lib/visit";
import { Button } from "@/components/Button";

type Props = { visit: Visit; now: Date; onShowSlip: (visit: Visit) => void };

function progress(visit: Visit, now: Date): string {
  if (visit.status === "waiting") return "Waiting off-site";
  const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
  const steps = [`Called ${sinceCall} min ago`];
  if (visit.seen_at) steps.push("Seen");
  if (visit.status === "on_the_way") steps.push("On the way");
  return steps.join(" · ");
}

export function VisitRow({ visit, now, onShowSlip }: Props) {
  const [note, setNote] = useState("");
  const act = (ok: boolean) => setNote(ok ? "" : "The list just changed. Check this patient again.");
  const waited = visit.triaged_at ? minutesBetween(visit.triaged_at, now) : 0;

  return (
    <li className="rounded-xl border-2 border-slate-300 p-4" data-testid={`row-${visit.code}`}>
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
          <Button onClick={() => act(callBackVisit(visit.id))}>Call back</Button>
        )}
        <Button variant="secondary" onClick={() => act(markVisitArrived(visit.id))}>
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
          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "left"))}>
            Left
          </Button>
          <Button variant="danger" onClick={() => act(removeVisit(visit.id, "no_show"))}>
            No-show
          </Button>
        </div>
      </details>
      {note && (
        <p role="status" className="mt-2 font-semibold text-red-800">
          {note}
        </p>
      )}
    </li>
  );
}
```

## components/staff/VisitSlip.tsx
```tsx
"use client";

// The desk slip: QR code carrying the token, the short code, and the full link written out
// for patients whose camera can't scan (SPEC /patient).

import { QRCodeSVG } from "qrcode.react";
import { groupToken } from "@/lib/codes";
import { patientLink } from "@/data/savedToken";
import { Button } from "@/components/Button";

type Props = { code: string; token: string; onClose: () => void };

export function VisitSlip({ code, token, onClose }: Props) {
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const scanLink = patientLink(origin, token);
  const typedLink = patientLink(origin, groupToken(token));

  return (
    <section
      aria-labelledby="slip-heading"
      className="rounded-xl border-2 border-slate-800 bg-white p-4"
    >
      <h3 id="slip-heading" className="text-lg font-bold">
        Patient slip for visit {code}
      </h3>
      <div className="mt-3 flex flex-wrap items-start gap-4">
        <QRCodeSVG
          value={scanLink}
          size={176}
          marginSize={2}
          role="img"
          aria-label={`QR code that opens visit ${code} on the patient's phone`}
        />
        <div className="min-w-0 flex-1 space-y-2">
          <p>
            Visit code: <strong className="font-mono text-2xl tracking-widest">{code}</strong>
          </p>
          <p className="text-sm">Or type this link into your phone&apos;s browser:</p>
          <p className="font-mono text-sm break-all" data-testid="slip-link">
            {typedLink}
          </p>
          <a
            href={scanLink}
            target="_blank"
            rel="noopener"
            className="inline-block text-blue-800 underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-amber-500"
          >
            Demo: open the patient screen in a new tab
          </a>
        </div>
      </div>
      <Button variant="secondary" className="mt-4" onClick={onClose}>
        Done, hide slip
      </Button>
    </section>
  );
}
```

## app/patient/page.tsx
```tsx
"use client";

// The patient screen on the patient's own phone: opens the visit from the link's token
// (or the one saved on this phone) and updates live.

import { useEffect, useState } from "react";
import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
import { takeTokenFromLink } from "@/data/savedToken";
import { EmergencyLine } from "@/components/EmergencyLine";
import { PatientStatus } from "@/components/patient/PatientStatus";
import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";

export default function PatientPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  // Reading the link and browser storage can only happen in the browser, after the first render.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setToken(takeTokenFromLink()), []);

  const view = usePatientView(token ?? null);
  const loading = token === undefined || view === undefined;

  // The first time the called screen is shown, record seen_at (shown, not necessarily read).
  useEffect(() => {
    if (token && view?.status === "called" && !view.seen) recordSeen(token);
  }, [token, view?.status, view?.seen]);

  return (
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-xl font-bold">Virtual Waiting Room</h1>
      <EmergencyLine />

      {loading ? (
        <p>Loading your visit…</p>
      ) : view === null ? (
        <section aria-labelledby="none-heading" className="space-y-2">
          <h2 id="none-heading" className="text-2xl font-bold">
            No visit found on this phone
          </h2>
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
          <PatientStatus view={view} onOnMyWay={() => token && confirmOnMyWayByToken(token)} />
          <StatusAnnouncer status={view.status} />
        </>
      )}
    </main>
  );
}
```

## components/patient/PatientStatus.tsx
```tsx
"use client";

// The main part of the patient screen, which changes with the visit's status:
// Waiting, Please head back now, or Ready at the desk.

import type { PatientView } from "@/lib/patientView";
import { Button } from "@/components/Button";

type Props = { view: PatientView; onOnMyWay: () => void };

function Waiting({ view }: { view: PatientView }) {
  return (
    <section aria-labelledby="status-heading" className="space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        Status: Waiting
      </h2>
      <p className="text-lg">
        Your place in line: <strong className="text-3xl">{view.placeInLine}</strong>
      </p>
      <p className="text-base">
        Your place can change if more urgent patients arrive. The most urgent patients are always
        seen first.
      </p>
      <p className="text-lg">
        Estimated time to see a doctor after triage:{" "}
        <strong>
          {view.waitLow} to {view.waitHigh} minutes
        </strong>
      </p>
      <p className="text-sm text-slate-700">This estimate is simulated for the demo.</p>
    </section>
  );
}

function Called({ view, onOnMyWay }: Props) {
  const confirmed = view.status === "on_the_way";
  return (
    <section
      aria-labelledby="status-heading"
      className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
    >
      <h2 id="status-heading" className="text-2xl font-bold text-green-950">
        Please head back now
      </h2>
      <p className="text-lg">Please return to the emergency department and go to the desk.</p>
      {confirmed ? (
        <p className="text-lg font-semibold" data-testid="confirmed">
          Thank you. Staff know you are on your way.
        </p>
      ) : (
        <Button onClick={onOnMyWay} className="w-full text-lg">
          I&apos;m on my way
        </Button>
      )}
      <p className="text-sm text-slate-800">
        Demo limits: alerts on this page only work while it is open and your phone is unlocked.
      </p>
    </section>
  );
}

function Closed({ view }: { view: PatientView }) {
  const arrived = view.status === "arrived";
  return (
    <section aria-labelledby="status-heading" className="space-y-3">
      <h2 id="status-heading" className="text-2xl font-bold">
        {arrived ? "Status: Ready at the desk" : "Your off-site wait has ended"}
      </h2>
      <p className="text-lg">
        {arrived
          ? "Staff have marked you as back. Please stay in the waiting area until staff call you."
          : "Please check with the emergency department desk."}
      </p>
    </section>
  );
}

export function PatientStatus({ view, onOnMyWay }: Props) {
  if (view.status === "waiting") return <Waiting view={view} />;
  if (view.status === "called" || view.status === "on_the_way") {
    return <Called view={view} onOnMyWay={onOnMyWay} />;
  }
  return <Closed view={view} />;
}
```

## components/patient/StatusAnnouncer.tsx
```tsx
"use client";

// Tells screen readers about status changes only (never the wait range or countdowns):
// an assertive message for the call-back, a polite one for everything else.

import { useState } from "react";
import type { VisitStatus } from "@/lib/visit";

const MESSAGES: Partial<Record<VisitStatus, string>> = {
  called: "You have been called back. Please head back to the emergency department now.",
  on_the_way: "Thank you. Staff know you are on your way.",
  arrived: "Staff have marked you as back at the emergency department.",
  removed: "Your off-site wait has ended.",
};

export function StatusAnnouncer({ status }: { status: VisitStatus }) {
  // The status already on screen when the page opened is not announced.
  const [previous, setPrevious] = useState(status);
  const [polite, setPolite] = useState("");
  const [urgent, setUrgent] = useState("");

  // Update the messages while rendering, the moment the status changes.
  if (status !== previous) {
    setPrevious(status);
    const text = MESSAGES[status] ?? "";
    if (status === "called") setUrgent(text);
    else setPolite(text);
  }

  return (
    <>
      <p aria-live="polite" className="sr-only">
        {polite}
      </p>
      <p aria-live="assertive" className="sr-only">
        {urgent}
      </p>
    </>
  );
}
```

