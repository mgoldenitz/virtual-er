// Decides whether the start page shows the start problem text (a refused start, or a busy or not-saved one).

import type { StartResult } from "@/data/patientVisit";

export type StartProblem = Exclude<StartResult, "saved">;

/** True when the problem text shows. A "paused" refusal hides while the site-paused box already says the same words. */
export function startProblemShows(problem: StartProblem | null, sitePaused: boolean): boolean {
  if (problem === null) return false;
  return !(problem === "paused" && sitePaused);
}
