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
import { fill, textFor } from "@/lib/text";

export default function PatientPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [notSaved, setNotSaved] = useState(false);
  const [brokenLink, setBrokenLink] = useState(false);
  const [sending, setSending] = useState(false);

  // Reading the link and browser storage can only happen in the browser, after the first render.
  // A new link opened on this same page (only the #t=... part changes) switches to that visit.
  useEffect(() => {
    const readLink = () => {
      const link = takeTokenFromLink();
      setToken(link.token);
      setBrokenLink(link.brokenLink);
      setNotSaved(false);
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  const result = usePatientView(token ?? null);
  const loading = token === undefined || result === undefined;
  const unavailable = result === "unavailable";
  const view = result === "unavailable" ? null : result;
  const t = textFor(view?.language);
  const p = t.patient;

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
    // "Seen" can only be recorded while the visit is still "called". A very quick tap could
    // otherwise confirm first and leave the seen time empty, so make sure it is recorded first.
    if (view && !view.seen) await recordSeen(token);
    const result = await confirmOnMyWayByToken(token);
    setSending(false);
    setNotSaved(result === "not_saved");
  }

  return (
    <PatientShell>
    <main className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-xl font-bold">{t.appName}</h1>
      <EmergencyLine language={view?.language} />

      {loading ? (
        <p>{p.loading}</p>
      ) : unavailable ? (
        <section aria-labelledby="unavailable-heading" className="clean-card space-y-2">
          <h2 id="unavailable-heading" className="text-2xl font-bold">
            {p.unavailableHeading}
          </h2>
          <p className="text-lg">{p.unavailableText}</p>
        </section>
      ) : !view ? (
        <section aria-labelledby="none-heading" className="clean-card space-y-2">
          <h2 id="none-heading" className="text-2xl font-bold">
            {brokenLink ? p.brokenLinkHeading : p.noVisitHeading}
          </h2>
          {brokenLink && (
            <p className="text-lg">{p.brokenLinkText}</p>
          )}
          <p className="text-lg">{p.findVisitHelp}</p>
        </section>
      ) : (
        <>
          <p className="text-base">
            {t.visitCode}: <strong className="font-mono tracking-widest">{view.code}</strong> ·{" "}
            {fill(t.siteName, { site: view.site })}
          </p>
          <PatientStatus view={view} onOnMyWay={onOnMyWay} sending={sending} />
          {notSaved && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {p.notSaved}
            </p>
          )}
          <StatusAnnouncer key={token} status={view.status} language={view.language} />
        </>
      )}
    </main>
    </PatientShell>
  );
}
