"use client";

// The language menu on patient screens, with each language written in itself so a patient
// can find their own. Shows the draft notice for any language a fluent speaker has not
// approved yet (SPEC). The choice is remembered on this phone (data/savedLanguage.ts).

import { chooseLanguage } from "@/data/savedLanguage";
import { textFor } from "@/lib/text";
import { languageInfo, LANGUAGES, menuLabel } from "@/lib/text/languages";

export function LanguageSwitch({ language }: { language: string }) {
  const t = textFor(language);
  const current = languageInfo(language);
  return (
    <div className="space-y-2">
      <label className="flex flex-wrap items-center gap-3">
        <span className="font-semibold">{t.language.label}</span>
        <select
          value={current.code}
          onChange={(e) => chooseLanguage(e.target.value)}
          className="min-h-11 rounded-lg border-2 border-control bg-card px-3"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
              {menuLabel(l)}
            </option>
          ))}
        </select>
      </label>
      {!current.approved && (
        <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
          {t.language.draftNotice}
        </p>
      )}
    </div>
  );
}
