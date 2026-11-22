// The top band of a patient screen: the app name, the language menu and the text size choice.

import { textFor } from "@/lib/text";
import { LanguageSwitch } from "@/components/LanguageSwitch";
import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";

export function PatientHeader({ language }: { language: string }) {
  return (
    <header className="header-band space-y-4">
      <h1 className="text-3xl font-bold text-ink">{textFor(language).appName}</h1>
      <LanguageSwitch language={language} />
      <TextSizeSwitch language={language} />
    </header>
  );
}
