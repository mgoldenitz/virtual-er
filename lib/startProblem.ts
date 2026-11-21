// Decides whether the start page shows the start problem text (a refused start, or a busy or not-saved one).

import type { StartResult } from "@/data/patientVisit";

export type StartProblem = Exclude<StartResult, "saved">;

/** Stub: always shows the problem. The real rule is written after the test. */
export function startProblemShows(problem: StartProblem | null, sitePaused: boolean): boolean {
  void problem;
  void sitePaused;
  return true;
}
