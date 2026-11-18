"use client";

// The language menu on patient screens, with each language written in itself so a patient
// can find their own. Each draft language has a tag in the menu, in its own words, and the
// draft notice shows for any language a fluent speaker has not approved yet (SPEC). The
// interpreter line is always shown. The choice is remembered on this phone (data/savedLanguage.ts).

import { chooseLanguage } from "@/data/savedLanguage";
import { textFor } from "@/lib/text";
import { languageInfo, LANGUAGES, menuLabel, type LanguageInfo } from "@/lib/text/languages";

/** The menu words for one language: its label, then "(draft)" in that language if it is not approved. */
function optionLabel(info: LanguageInfo): string {
  if (info.approved) return menuLabel(info);
  return `${menuLabel(info)} (${textFor(info.code).language.draftTag})`;
}

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
          className="min-h-11 max-w-full rounded-lg border-2 border-control bg-card px-3"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
              {optionLabel(l)}
            </option>
          ))}
        </select>
      </label>
      {/* Always on the page, so a screen reader hears the notice when it appears after a language change. */}
      <div role="status">
        {!current.approved && (
          <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
            {t.language.draftNotice}
          </p>
        )}
      </div>
      <p className="text-base">{t.language.interpreter}</p>
    </div>
  );
}
