// Decides when the patient screen shows "Before you leave" (components/patient/BeforeYouLeave.tsx):
// only while the visit waits off-site, because the tips are for the time away from the hospital.

import type { PatientView } from "./patientView";

export function beforeYouLeaveShows(view: PatientView): boolean {
  return view.status === "waiting" && !view.expired;
}
