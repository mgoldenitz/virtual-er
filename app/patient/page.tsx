"use client";

// The patient screen on the patient's own phone: opens the visit from the link's token
// (or the one saved on this phone) and updates live.

import { useEffect, useRef, useState } from "react";
import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
import { chooseLanguage, useChosenLanguage } from "@/data/savedLanguage";
import { forgetSavedToken, takeTokenFromLink } from "@/data/savedToken";
import { useOnline } from "@/data/useOnline";
import { EmergencyLine } from "@/components/EmergencyLine";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { PatientShell } from "@/components/PatientShell";
import { OfflineBanner } from "@/components/patient/OfflineBanner";
import { PatientStatus } from "@/components/patient/PatientStatus";
import { SoundSwitch } from "@/components/patient/SoundSwitch";
import { StatusAnnouncer } from "@/components/patient/StatusAnnouncer";
import { StillHerePrompt } from "@/components/patient/StillHerePrompt";
import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
import { isDeadToken } from "@/lib/deadToken";
import { fill, textFor } from "@/lib/text";
import { languageInfo, patientLanguage } from "@/lib/text/languages";

export default function PatientPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [notSaved, setNotSaved] = useState(false);
  const [brokenLink, setBrokenLink] = useState(false);
  const [sending, setSending] = useState(false);
  const chosenLanguage = useChosenLanguage();
  const online = useOnline();
  // True when the sound box left the page with focus inside it; the status screen then moves focus.
  const lostFocus = useRef(false);

  // Reading the link and browser storage can only happen in the browser, after the first render.
  // A new link opened on this same page (only the #t=... part changes) switches to that visit.
  useEffect(() => {
    const readLink = () => {
      const link = takeTokenFromLink();
      // A desk QR link carries the visit's language: remember it, so it shows before the visit loads.
      if (link.language) chooseLanguage(link.language);
      setToken(link.token);
      setBrokenLink(link.brokenLink);
      setNotSaved(false);
    };
    readLink();
    window.addEventListener("hashchange", readLink);
    return () => window.removeEventListener("hashchange", readLink);
  }, []);

  const result = usePatientView(token ?? null);

  // The token opens no visit any more (for example staff issued a new link for a lost phone):
  // say the link did not work, and forget the token so this phone never tries it again.
  const deadToken = isDeadToken(token, result);
  useEffect(() => {
    if (deadToken) forgetSavedToken();
  }, [deadToken]);
  const linkFailed = brokenLink || deadToken;
  const loading = token === undefined || result === undefined;
  const unavailable = result === "unavailable";
  const view = result === "unavailable" ? null : result;
  // The phone's own choice first, so even "Loading…" and the 911 line are in that language.
  const language = patientLanguage(chosenLanguage, view?.language);
  const t = textFor(language);
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
    <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
      <h1 className="text-xl font-bold">{t.appName}</h1>
      <LanguageSwitch language={language} />
      <TextSizeSwitch language={language} />
      <EmergencyLine language={language} />
      <OfflineBanner language={language} />

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
            {linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
          </h2>
          {linkFailed && (
            <p className="text-lg">{p.brokenLinkText}</p>
          )}
          <p className="text-lg">{p.findVisitHelp}</p>
        </section>
      ) : (
        <>
          <p className="text-base">
            {t.visitCode}:{" "}
            <bdi>
              <strong className="font-mono tracking-widest">{view.code}</strong>
            </bdi>{" "}
            · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
          </p>
          {token && view.status === "waiting" && <StillHerePrompt view={view} token={token} language={language} />}
          {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
          <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
            <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
          </div>
          {(view.status === "waiting" || view.status === "called") && (
            <SoundSwitch
              status={view.status}
              language={language}
              onFocusLost={() => {
                lostFocus.current = true;
              }}
            />
          )}
          {notSaved && (
            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
              {p.notSaved}
            </p>
          )}
          <StatusAnnouncer key={token} status={view.status} language={language} />
        </>
      )}
    </main>
    </PatientShell>
  );
}
