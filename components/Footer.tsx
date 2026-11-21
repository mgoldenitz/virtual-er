// The disclaimer footer that SPEC.md requires on every page.
// Always English for now: it uses textFor("en") and does not read the language saved on the phone (data/savedLanguage.ts).

import { textFor } from "@/lib/text";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line bg-canvas px-4 py-4 text-center text-sm text-muted">
      {textFor("en").footer}
    </footer>
  );
}
