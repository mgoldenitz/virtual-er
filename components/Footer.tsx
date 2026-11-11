// The disclaimer footer that SPEC.md requires on every page.
// English until the patient's chosen language is remembered on the phone (Phase 3 language switch).

import { textFor } from "@/lib/text";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-300 bg-slate-100 px-4 py-4 text-center text-sm text-slate-700">
      {textFor("en").footer}
    </footer>
  );
}
