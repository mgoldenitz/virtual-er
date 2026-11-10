"use client";

// The patient screen on the patient's own phone: opens the visit from the link's token
// (or the one saved on this phone) and updates live.

import { useEffect, useState } from "react";
import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
import { takeTokenFromLink } from "@/data/savedToken";
import { EmergencyLine } from "@/components/EmergencyLine";
import { PatientShell } from "@/components/PatientShell";
import { PatientStatus } from "@/components/patient/PatientStatus";
import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";

export default function PatientPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [problem, setProblem] = useState("");
  const [brokenLink, setBrokenLink] = useState(false);
  const [sending, setSending] = useState(false);

  // Reading the link and browser storage can only happen in the browser, after the first render.
  // A new link opened on this same page (only the #t=... part changes) switches to that visit.
  useEffect(() => {
    const readLink = () => {
      const link = takeTokenFromLink();
      setToken(link.token);
      setBrokenLink(link.brokenLink);
      setProblem("");
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  const result = usePatientView(token ?? null);
  const loading = token === undefined || result === undefined;
  const unavailable = result === "unavailable";
  const view = result === "unavailable" ? null : result;

  // The first time the called screen is actually on screen, record seen_at
  // (shown, not necessarily read). A tab in the background waits until it is brought forward.
  useEffect(() => {
    if (!token || view?.status !== "called" || view.seen) return;
    let stopped = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    const recordIfVisible = async () => {
      clearTimeout(retry);
      if (stopped || document.visibilityState !== "visible") return;
      const result = await recordSeen(token);
      // Could not reach the database: try again shortly, for as long as the called screen is showing.
      if (result === "not_saved" && !stopped) retry = setTimeout(recordIfVisible, 10_000);
    };
    void recordIfVisible();
    document.addEventListener("visibilitychange", recordIfVisible);
    return () => {
      stopped = true;
      clearTimeout(retry);
      document.removeEventListener("visibilitychange", recordIfVisible);
    };
  }, [token, view?.status, view?.seen]);

  async function onOnMyWay() {
    if (!token || sending) return;
    setSending(true);
    const result = await confirmOnMyWayByToken(token);
    setSending(false);
    setProblem(
      result === "not_saved"
        ? "Your answer was not saved, so staff have not been told. Please try again, or come back to the desk."
        : "",
    );
  }

  return (
    <PatientShell>
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-xl font-bold">Virtual Waiting Room</h1>
      <EmergencyLine />

      {loading ? (
        <p>Loading your visit…</p>
      ) : unavailable ? (
        <section aria-labelledby="unavailable-heading" className="clean-card space-y-2">
          <h2 id="unavailable-heading" className="text-2xl font-bold">
            We cannot load your visit right now
          </h2>
          <p className="text-lg">
            Nothing you do on this page can be saved at the moment, so staff may not see it. Please
            contact the emergency department desk.
          </p>
        </section>
      ) : !view ? (
        <section aria-labelledby="none-heading" className="clean-card space-y-2">
          <h2 id="none-heading" className="text-2xl font-bold">
            {brokenLink ? "This link did not work" : "No visit found on this phone"}
          </h2>
          {brokenLink && (
            <p className="text-lg">The link may have been cut short or mistyped, so no visit was opened.</p>
          )}
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
          <PatientStatus view={view} onOnMyWay={onOnMyWay} sending={sending} />
          {problem && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {problem}
            </p>
          )}
          <StatusAnnouncer key={token} status={view.status} />
        </>
      )}
    </main>
    </PatientShell>
  );
}
