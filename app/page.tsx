// The start page, on the patient's own phone at home or in the waiting room (no login).
// Its contents are in components/start/StartPageBody.tsx, which follows the phone's language.

import { PatientShell } from "@/components/PatientShell";
import { StartPageBody } from "@/components/start/StartPageBody";

export default function StartPage() {
  return (
    <PatientShell>
      <StartPageBody />
    </PatientShell>
  );
}
