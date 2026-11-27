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
      <LanguageSwitch
        language={language}
        beside={
          // A native disclosure: Enter or Space opens the three text sizes, with no script.
          <details className="shrink-0">
            <summary
              aria-label={textFor(language).textSize.label}
              className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-lg border-2 border-control bg-card px-2 font-bold [&::-webkit-details-marker]:hidden"
            >
              Aa
            </summary>
            <div className="absolute end-0 z-10 mt-2 w-max max-w-full rounded-lg border-2 border-control bg-card p-3 shadow-lg">
              <TextSizeSwitch language={language} />
            </div>
          </details>
        }
      />
    </header>
  );
}
