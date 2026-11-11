// The 911 safety line from SPEC rule 3, shown on every patient screen in every state and language.

import { textFor } from "@/lib/text";

export function EmergencyLine({ language }: { language?: string }) {
  return (
    <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-base font-semibold text-red-900">
      {textFor(language).emergencyLine}
    </p>
  );
}
