// The offline notice on the patient screen. It shows only while the phone has no internet connection,
// and it uses words plus a thick border, not colour alone (SPEC rule 9).

import { useOnline } from "@/data/useOnline";
import { textFor } from "@/lib/text";

export function OfflineBanner({ language }: { language: string }) {
  const online = useOnline();
  // The live region is always on the page, so screen readers (VoiceOver on iPhone) announce the text
  // when it appears. Only the styled box is added while offline.
  return (
    <div role="status">
      {!online && (
        <p className="rounded-lg border-4 border-black bg-amber-300 p-3 text-base font-bold text-black">
          {textFor(language).offline}
        </p>
      )}
    </div>
  );
}
