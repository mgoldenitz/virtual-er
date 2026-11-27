// Which of the four progress steps (Triage, Waiting, Head back, At the desk) a visit is on.
// null means the steps do not show: the visit left the line, ended or expired.

import type { VisitStatus } from "@/lib/visit";

export type ProgressStep = 1 | 2 | 3 | 4;

export function progressStep(status: VisitStatus, closed: boolean, expired: boolean): ProgressStep | null {
  if (closed || expired) return null;
  switch (status) {
    case "pre_arrival":
      return 1;
    case "waiting":
      return 2;
    case "called":
    case "on_the_way":
      return 3;
    case "arrived":
      return 4;
    default:
      return null;
  }
}
