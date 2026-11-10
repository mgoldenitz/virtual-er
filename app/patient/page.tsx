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
