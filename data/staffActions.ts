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
  const changed = changedFields(before, after);
  if (Object.keys(changed).length === 0) return "refused"; // nothing to save
  try {
    const { data, error } = await supabaseBrowser()
      .from("visits")
      .update(changed)
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
