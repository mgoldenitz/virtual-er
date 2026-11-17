"use client";

// The patient screen on the patient's own phone: opens the visit from the link's token
// (or the one saved on this phone) and updates live.

import { useEffect, useState } from "react";
import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
import { chooseLanguage, useChosenLanguage } from "@/data/savedLanguage";
import { forgetSavedToken, takeTokenFromLink } from "@/data/savedToken";
import { useOnline } from "@/data/useOnline";
import { EmergencyLine } from "@/components/EmergencyLine";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { PatientShell } from "@/components/PatientShell";
import { OfflineBanner } from "@/components/patient/OfflineBanner";
import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
import { VisitScreen } from "@/components/patient/VisitScreen";
import { isDeadToken } from "@/lib/deadToken";
import { textFor } from "@/lib/text";
import { languageInfo, patientLanguage } from "@/lib/text/languages";

export default function PatientPage() {
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [notSaved, setNotSaved] = useState(false);
  const [brokenLink, setBrokenLink] = useState(false);
  const [sending, setSending] = useState(false);
  const chosenLanguage = useChosenLanguage();
  const online = useOnline();

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
  const view = result === "unavailable" ? null : result;
  // The phone's own choice first, so even "Loading…" and the 911 line are in that language.
  const language = patientLanguage(chosenLanguage, view?.language);
  const t = textFor(language);

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

      <VisitScreen
        loading={loading}
        result={result}
        linkFailed={linkFailed}
        token={token ?? null}
        language={language}
        onOnMyWay={onOnMyWay}
        sending={sending}
        online={online}
        notSaved={notSaved}
      />
    </main>
    </PatientShell>
  );
}
