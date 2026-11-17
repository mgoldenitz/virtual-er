// What staff screens can do to visits. Each action applies a rule from lib/visitActions to
// the copy of the visit on screen, then saves only the changed fields to the database, and
// only if nobody else changed the visit in the meantime (its version number still matches).
// The database sets every time itself, so the device clock never decides line order; the
// rules judge "how long ago" by the server's clock (serverNow), not the laptop's.

import { changedFields } from "@/lib/changedFields";
import { makeAccessToken, makeUniqueDisplayCode, normalizeDisplayCode } from "@/lib/codes";
import type { RecallAllResult } from "@/lib/recallAll";
import { PAUSE_REFUSED, resultForError } from "@/lib/saveResult";
import type { ChangeResult, Site, Visit } from "@/lib/visit";
import {
  callBack,
  checkInAtDesk,
  checkInHomeVisit,
  confirmUnableToReach,
  issueNewLink,
  markArrived,
  markRemoved,
  recordPhoneCall,
  reopenUnableToReach,
  undoClose,
  type Closure,
  type DeskOutcome,
} from "@/lib/visitActions";
import { serverNow } from "./serverClock";
import { reloadSitePauses } from "./sitePauses";
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

/**
 * Create a desk visit after triage. Returns the new visit so the slip can be shown,
 * "paused" if the site was paused on another screen, or null if it could not be saved.
 */
export async function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Promise<Visit | "paused" | null> {
  try {
    for (let attempt = 0; attempt < CODE_TRIES; attempt++) {
      const taken = new Set((readVisitList().visits ?? []).map((v) => v.code));
      const visit = checkInAtDesk(
        { id: crypto.randomUUID(), code: makeUniqueDisplayCode(taken), access_token: makeAccessToken(), ...form },
        outcome,
        serverNow(),
      );
      const { data, error } = await supabaseBrowser().from("visits").insert(visit).select();
      if (error?.code === ALREADY_USED) continue; // an older visit not on this screen has the code
      if (error?.code === PAUSE_REFUSED) {
        void reloadSitePauses();
        return "paused";
      }
      if (error ||!Array.isArray(data) || data.length === 0) return null;
      putVisit(data[0] as StoredVisit);
      return data[0] as StoredVisit;
    }
  } catch {
    // Could not reach the database.
  }
  return null;
}

/** Check in, after triage, a visit that already exists (started from home, or back for reassessment). */
export const checkInVisitFromHome = (id: string, form: CheckInForm, outcome: DeskOutcome) =>
  changeVisit(id, (v) => (v.site === form.site ? checkInHomeVisit(v, form, outcome, serverNow()) : null));

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

export const callBackVisit = (id: string) => changeVisit(id, (v) => callBack(v, serverNow()));
export const markVisitArrived = (id: string) => changeVisit(id, (v) => markArrived(v, serverNow()));
export const removeVisit = (id: string, reason: "left" | "no_show") =>
  changeVisit(id, (v) => markRemoved(v, reason, serverNow()));
/** Lost or stolen phone: give the visit a new link. On "saved", `onSaved` gets the visit with its new token. */
export async function issueNewVisitLink(id: string, onSaved: (visit: Visit) => void): Promise<ChangeResult> {
  const result = await changeVisit(id, (v) => issueNewLink(v, makeAccessToken()));
  const updated = cachedVisit(id);
  if (result === "saved" && updated) onSaved(updated);
  return result;
}
/**
 * "Recall all off-site patients": recall, in one database update, exactly the visits staff saw
 * in the confirmation, and only those still waiting (one recalled or closed on another screen
 * meanwhile is left alone and counted as changed). The database sets called_at itself.
 */
export async function recallAll(ids: string[]): Promise<RecallAllResult> {
  if (ids.length === 0) return { recalled: 0, changed: 0, notSaved: false };
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .update({ status: "called", called_at: serverNow().toISOString() })
      .in("id", ids)
      .eq("status", "waiting")
      .select();
    if (error || !Array.isArray(data)) return { recalled: 0, changed: 0, notSaved: true };
    (data as StoredVisit[]).forEach(putVisit);
    if (data.length < ids.length) void loadVisits();
    return { recalled: data.length, changed: ids.length - data.length, notSaved: false };
  } catch {
    return { recalled: 0, changed: 0, notSaved: true };
  }
}

/** Record one simulated phone call ("Phoned, answered" or "Phoned, no answer"). */
export const recordPhoneCallFor = (id: string, result: "answered" | "no_answer") =>
  changeVisit(id, (v) => recordPhoneCall(v, result, serverNow()));
/** A nurse confirms "Review: unable to reach"; the visit leaves the active line. */
export const confirmUnableToReachFor = (id: string) => changeVisit(id, (v) => confirmUnableToReach(v, serverNow()));
/** Reopen an "unable to reach" visit; it goes back to triage (needs reassessment). */
export const reopenVisit = (id: string) => changeVisit(id, (v) => reopenUnableToReach(v));
/** Undo one closure; `closure` is the closure the Undo button belongs to. */
export const undoCloseVisit = (id: string, closure: Closure) => changeVisit(id, (v) => undoClose(v, closure));

/** Read the list again now (the "Try again" button). */
export { loadVisits as reloadVisits } from "./visitCache";
