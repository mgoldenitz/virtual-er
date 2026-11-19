// The patient's language menu for staff (check-in, and a switch to off-site waiting).
// Languages not yet checked by a fluent reader say so.

import { LANGUAGES, menuLabel } from "@/lib/text/languages";

type Props = { value: string; onChange: (code: string) => void; disabled?: boolean };

export function LanguageSelect({ value, onChange, disabled }: Props) {
  return (
    <label className="block">
      <span className="font-semibold">Language</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 block min-h-11 max-w-full rounded-lg border-2 border-control px-3"
      >
        {LANGUAGES.map((l) => (
          <option key={l.code} value={l.code}>
            {l.approved ? menuLabel(l) : `${menuLabel(l)}, draft until checked`}
          </option>
        ))}
      </select>
    </label>
  );
}
