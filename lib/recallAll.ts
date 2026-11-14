// "Recall all off-site patients" (SPEC "Call everyone back", renamed by the owner on
// 2026-11-11): for a surge or a system problem, staff recall at once every patient still
// waiting off-site at one site. Only those shown in the confirmation are recalled.

import { patientCount } from "./patientCount";
import { activeLine } from "./queue";
import type { Site, Visit } from "./visit";

/** Patients still waiting off-site (not yet recalled) at one site, in line order. */
export function recallAllTargets(visits: Visit[], site: Site): Visit[] {
  return activeLine(visits, site).filter((v) => v.status === "waiting");
}

/** How a "Recall all" went: recalled, already changed elsewhere, or not saved. */
export type RecallAllResult = { recalled: number; changed: number; notSaved: boolean };

/** Plain words for staff (and screen readers) after "Recall all". */
export function recallAllMessage(result: RecallAllResult, site: Site): string {
  if (result.notSaved) {
    return "Not saved: the database could not be reached. No one was recalled. Try again.";
  }
  const recalled = `Recalled ${patientCount(result.recalled)} at Demo Site ${site}.`;
  if (result.changed === 0) return recalled;
  return `${recalled} ${patientCount(result.changed)} had already changed on another screen; check the list.`;
}
