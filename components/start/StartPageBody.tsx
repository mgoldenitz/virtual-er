"use client";

// Everything on the start page, in the language chosen on this phone (English until one is
// chosen): the language menu, the emergency check first, other care options, THP's
// wait-time link, then "Start a visit", "How it works" and "Questions". Urdu and Arabic are laid out right to left.

import Link from "next/link";
import { useChosenLanguage } from "@/data/savedLanguage";
import { textFor } from "@/lib/text";
import { languageInfo } from "@/lib/text/languages";
import { EmergencyLine } from "@/components/EmergencyLine";
import { PatientHeader } from "@/components/PatientHeader";
import { SafetyCard } from "@/components/SafetyCard";
import { CareOptions } from "@/components/start/CareOptions";
import { HowItWorks } from "@/components/start/HowItWorks";
import { StartQuestions } from "@/components/start/StartQuestions";
import { StartVisit } from "@/components/start/StartVisit";
import { useDocumentLanguage } from "@/components/useDocumentLanguage";

const linkStyle =
  "inline-block min-h-11 rounded-lg border-2 border-control bg-card px-4 py-2 font-semibold text-ink hover:bg-line active:bg-line focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function StartPageBody() {
  const language = useChosenLanguage() ?? "en";
  const t = textFor(language);
  useDocumentLanguage(language);
  return (
    <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
      <PatientHeader language={language} />
      <SafetyCard strong>{t.start.emergencyCheck}</SafetyCard>
      <div className="clean-card">
        <CareOptions language={language} />
      </div>
      <StartVisit language={language} />
      <HowItWorks language={language} />
      <StartQuestions language={language} />
      <EmergencyLine language={language} />
      <nav aria-label={t.start.demoScreens} className="flex flex-wrap gap-3 border-t border-line pt-4">
        <Link href="/staff" className={linkStyle}>
          {t.start.staffScreen}
        </Link>
        <Link href="/patient" className={linkStyle}>
          {t.start.patientScreen}
        </Link>
        <Link href="/dashboard" className={linkStyle}>
          {t.start.dashboard}
        </Link>
      </nav>
    </main>
  );
}
