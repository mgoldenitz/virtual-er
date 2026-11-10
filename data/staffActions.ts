// What staff screens can do to visits. Phase 2 replaces the insides with Supabase calls
// behind staff login; the screens keep calling these same functions.

import { makeAccessToken, makeUniqueDisplayCode } from "@/lib/codes";
import type { Site, Visit } from "@/lib/visit";
import {
  callBack,
  checkInAtDesk,
  markArrived,
  markRemoved,
  undoClose,
  type Closure,
  type DeskOutcome,
} from "@/lib/visitActions";
import { addVisit, readVisits, updateVisit } from "./visitStore";

export type CheckInForm = { site: Site; ctas_level: 4 | 5; language: string };

/**
 * Create a desk visit after triage. Returns the new visit so the slip can be shown,
 * or null if this browser could not save it.
 */
export function createDeskVisit(form: CheckInForm, outcome: DeskOutcome): Visit | null {
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
  return addVisit(visit) === "saved" ? visit : null;
}

export const callBackVisit = (id: string) => updateVisit(id, (v) => callBack(v, new Date()));
export const markVisitArrived = (id: string) => updateVisit(id, (v) => markArrived(v, new Date()));
export const removeVisit = (id: string, reason: "left" | "no_show") =>
  updateVisit(id, (v) => markRemoved(v, reason, new Date()));
/** Undo one closure; `closure` is the closure the Undo button belongs to. */
export const undoCloseVisit = (id: string, closure: Closure) => updateVisit(id, (v) => undoClose(v, closure));

/** Staff confirmed: back up the unreadable saved list, then start a new one. */
export { resetUnreadableStorage as startNewVisitList } from "./visitStore";
