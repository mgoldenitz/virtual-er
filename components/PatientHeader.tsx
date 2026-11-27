// The top band of a patient screen: the app name, the language menu and the text size choice.

import { textFor } from "@/lib/text";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";

export function PatientHeader({ language }: { language: string }) {
  return (
    <header className="header-band space-y-4">
      <h1 className="flex items-center gap-2 text-3xl font-bold text-ink">
        {/* The logo is only a picture: the h1 text already says the app name. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="" width={32} height={32} />
        {textFor(language).appName}
      </h1>
      <LanguageSwitch language={language} />
      <TextSizeSwitch language={language} />
    </header>
  );
}
