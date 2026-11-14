# Gemini review: offline banner on the patient screen

Model: Gemini 3.1 Pro, High, in a new chat. (No 3.1 Pro credits: Gemini 3.6 Flash, High.)
Give it everything below the line "Paste from here". Bring back its whole answer.

Save point: `5b1a7be` on branch `phase3-patient-extras` (not pushed).

---

Paste from here

You are reviewing a small change in a concept prototype of a virtual ER waiting room. It is a Next.js 16 (App Router, React 19) app. Low-acuity patients wait off-site after triage and follow their place in line on their own phone. Synthetic data only. Accessibility target: WCAG 2.2 AA. Every alert must also show as words on screen, never sound or colour alone. Five languages: English, French, Urdu, Arabic and Mandarin (Urdu and Arabic are right to left).

Find problems. Do not confirm that it is fine. List each problem with the file, what goes wrong, a way to see it happen, and the smallest fix. If you find nothing for a question, say "nothing found" for that question.

## The change

When the patient's phone loses its internet connection, the patient screen shows a banner: "You are offline. Reconnect to the internet to see your status." (each language has its own text). When the connection comes back, the banner goes away. The patient screen also gets live updates from the database while online; that code did not change.

`data/useOnline.ts` (new):

```ts
// Tells whether this phone or laptop has an internet connection, and updates when that changes.

import { useSyncExternalStore } from "react";

function subscribe(onChange: () => void): () => void {
  window.addEventListener("online", onChange);
  window.addEventListener("offline", onChange);
  return () => {
    window.removeEventListener("online", onChange);
    window.removeEventListener("offline", onChange);
  };
}

function getSnapshot(): boolean {
  return navigator.onLine;
}

// While the page is built on the server there is no browser to ask, so assume online (no banner).
function getServerSnapshot(): boolean {
  return true;
}

/** True when the browser has a connection. Re-renders when the connection drops or comes back. */
export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

`components/patient/OfflineBanner.tsx` (new):

```tsx
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
```

`app/patient/page.tsx` (two lines added). The banner sits directly under the 911 line, inside `<main lang={language} dir="ltr or rtl">`:

```tsx
      <h1 className="text-xl font-bold">{t.appName}</h1>
      <LanguageSwitch language={language} />
      <EmergencyLine language={language} />
      <OfflineBanner language={language} />
```

The same page already has other live regions: a status announcer for changes in the visit (polite), an "I'm still here" prompt (polite), and a "not saved" message (`role="alert"`).

## Checks already done

- Type check, lint and 148 unit tests pass.
- Playwright at 390 x 844: the banner shows when the browser is set offline and goes when set online; no sideways scroll; in Arabic the page is right to left and the banner text is Arabic.

## Questions

1. Is `navigator.onLine` with the "online" and "offline" events reliable enough on iPhone Safari and Android Chrome for this use? Name the cases where it says "online" while there is no real connection (for example Wi-Fi with no internet, or a captive portal), and say whether the demo should do anything about them or only note it.
2. While offline, the rest of the screen still shows the last status it had (for example "You are number 3 in line"). Is that misleading? Should the banner say the status shown may be old, or should the status be greyed out? Keep the answer within the existing text where you can.
3. Screen readers: is an always-present `role="status"` div the right choice, given the other live regions on the page? Can two polite announcements at the same moment (offline banner and a status change) cancel each other?
4. Contrast and look: black text on Tailwind `amber-300` with a 4px black border. Any WCAG 2.2 AA problem, including for people with low vision or colour blindness? Does it clash with the red 911 line just above it?
5. Anything else that is wrong or missing.
