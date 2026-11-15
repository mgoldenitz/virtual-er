# Gemini review: patient screen extras (offline banner, text size, sound and vibration) and "Issue a new link"

Status: ready to send. One combined review for item A (owner, 2026-11-14), parts a, b and c, plus part d (staff "Issue a new link", added 2026-11-14).

Model: Gemini Hydrogen 4, High, in a new chat. (No Hydrogen 4 credits: Gemini 3.6 Flash, High.)
Give it everything below the line "Paste from here". Bring back its whole answer.

Save points on branch `phase3-patient-extras` (not pushed): offline banner `5b1a7be`, `e6114d7`; text size `e68729c`; sound rule `2e56ebb`; sound box `69c7621`; new link rule `02b662c`, staff button `0a8d459`.

---

Paste from here

You are reviewing four small changes in a concept prototype of a virtual ER waiting room. It is a Next.js 16 (App Router, React 19) app. Low-acuity patients wait off-site after triage and follow their place in line on their own phone. When staff recall them, the screen changes to "Please head back now" with an "I'm on my way" button. Synthetic data only. Accessibility target: WCAG 2.2 AA. Every alert must also show as words on screen, never sound or colour alone. Five languages: English, French, Urdu, Arabic and Mandarin (Urdu and Arabic are right to left).

Find problems. Do not confirm that it is fine. List each problem with the file, what goes wrong, a way to see it happen, and the smallest fix. If you find nothing for a question, say "nothing found" for that question.

## Part a: offline banner

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
"use client";

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

The same page already has other live regions: a status announcer for changes in the visit (polite), an "I'm still here" prompt (polite), and a "not saved" message (`role="alert"`).

## Part b: text size control

Three radio buttons under the language menu: Normal, Large, Extra large. The choice sets the root font size of the page (100%, 125%, 150%). All Tailwind sizes are in rem, so text and spacing grow together. The choice is saved in localStorage on this phone (key `vwr.textSize`), nothing else.

`lib/textSize.ts` (new):

```ts
export const TEXT_SIZES = ["normal", "large", "extraLarge"] as const;
export type TextSize = (typeof TEXT_SIZES)[number];
const ROOT_FONT_SIZES: Record<TextSize, string> = { normal: "100%", large: "125%", extraLarge: "150%" };
export function isTextSize(value: unknown): value is TextSize {
  return typeof value === "string" && (TEXT_SIZES as readonly string[]).includes(value);
}
export function rootFontSize(size: TextSize): string {
  return ROOT_FONT_SIZES[size];
}
```

`data/savedTextSize.ts` (new) reads and writes localStorage inside try/catch (storage blocked gives "normal"), keeps the value in a module variable, and exposes `useChosenTextSize()` through `useSyncExternalStore` (server snapshot "normal") and `chooseTextSize(size)`.

`components/patient/TextSizeSwitch.tsx` (new):

```tsx
export function TextSizeSwitch({ language }: { language: string }) {
  const t = textFor(language).textSize;
  const size = useChosenTextSize();
  const words: Record<TextSize, string> = { normal: t.normal, large: t.large, extraLarge: t.extraLarge };

  // Grow the whole page. Put it back when this screen closes, so staff screens in the same tab are not affected.
  useEffect(() => {
    document.documentElement.style.fontSize = rootFontSize(size);
    return () => {
      document.documentElement.style.fontSize = "";
    };
  }, [size]);

  return (
    <fieldset className="space-y-2">
      <legend className="font-semibold">{t.label}</legend>
      <div className="flex flex-wrap gap-2">
        {TEXT_SIZES.map((option) => {
          const checked = option === size;
          return (
            <label key={option}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-control bg-card px-3 ${checked ? "border-4 font-bold" : "border-2"}`}>
              <input type="radio" name="text-size" value={option} checked={checked}
                onChange={() => chooseTextSize(option)} className="h-5 w-5" />
              <span>{words[option]}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
```

## Part c: sound and vibration on the called screen

The SPEC says: "While called but unconfirmed, the screen alerts with sound and vibration where the phone allows. These are on-screen demo alerts: they work only while the page is open and the phone is unlocked, and the demo must say so. Do not claim the app can wake a locked phone."

A box under the status shows while the status is "waiting" or "called". It has the notice "This demo plays a sound and vibrates when you are called. This only works while this page is open and your phone is unlocked." and a "Turn on sound" button. Phones allow web sound only after a tap, so the patient taps it, ideally while still waiting. The tap unlocks Web Audio and plays one test beep; the button is replaced by the words "Sound is on", which get focus. While the status is "called", sound is on and the page is visible: one beep (880 Hz, 0.4 s) and one vibration (`navigator.vibrate([200,100,200])`, Android only; iPhone Safari has no web vibration) at once, again every 30 seconds, and again when the page becomes visible. It stops at "I'm on my way" (status "on_the_way", the box goes away). The choice is not saved, because a reload needs a new tap anyway. There is no "Turn off sound" button. The called screen also keeps its own line "Demo limits: alerts on this page only work while it is open and your phone is unlocked."

`lib/calledAlert.ts` (new):

```ts
export const ALERT_REPEAT_MS = 30_000;
export function shouldAlert(status: VisitStatus, soundOn: boolean, visible: boolean): boolean {
  return status === "called" && soundOn && visible;
}
```

`components/patient/alertSound.ts` (new):

```ts
let context: AudioContext | null = null;

function audioContextClass(): typeof AudioContext | undefined {
  const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
  return window.AudioContext ?? webkitWindow.webkitAudioContext;
}

/** Call inside a button's click. True only when the sound player really started. */
export async function unlockSound(): Promise<boolean> {
  try {
    if (!context) {
      const AudioClass = audioContextClass();
      if (!AudioClass) return false;
      context = new AudioClass();
    }
    await context.resume();
    return context.state === "running";
  } catch {
    return false;
  }
}

export function playAlert(): void {
  try {
    if (context) {
      const ctx = context;
      // iPhone can pause the player while the page is hidden; start it again before each beep.
      if (ctx.state !== "running") void ctx.resume().catch(() => undefined);
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;
      oscillator.type = "sine";
      oscillator.frequency.value = 880;
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start(now);
      oscillator.stop(now + 0.4);
    }
    if (typeof navigator.vibrate === "function") navigator.vibrate([200, 100, 200]);
  } catch {
    // Ignore sound and vibration errors. The on-screen words remain the real alert.
  }
}
```

`components/patient/SoundSwitch.tsx` (new):

```tsx
export function SoundSwitch({ status, language }: { status: VisitStatus; language: string }) {
  const t = textFor(language).sound;
  const [soundOn, setSoundOn] = useState(false);
  const onWords = useRef<HTMLParagraphElement>(null);

  async function turnOn() {
    const ok = await unlockSound();
    if (!ok) return;
    setSoundOn(true);
    if (status !== "called") playAlert(); // test beep; when called, the effect below plays
  }

  useEffect(() => {
    if (soundOn) onWords.current?.focus();
  }, [soundOn]);

  useEffect(() => {
    const tick = () => {
      if (shouldAlert(status, soundOn, document.visibilityState === "visible")) playAlert();
    };
    tick();
    const timer = window.setInterval(tick, ALERT_REPEAT_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [status, soundOn]);

  return (
    <section className="clean-card space-y-2">
      <p className="text-base">{t.notice}</p>
      {soundOn ? (
        <p ref={onWords} tabIndex={-1} className="font-semibold">{t.on}</p>
      ) : (
        <Button variant="secondary" onClick={turnOn} className="w-full">{t.turnOn}</Button>
      )}
    </section>
  );
}
```

`app/patient/page.tsx`: the box sits directly under the status card, in the same place for "waiting" and "called", so React keeps its state (sound stays on) when the status changes:

```tsx
<PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} />
{(view.status === "waiting" || view.status === "called") && <SoundSwitch status={view.status} language={language} />}
```

## Part d: staff "Issue a new link" for a lost or stolen phone

The visit link (`/patient#t=<access_token>`, 26 Crockford base-32 characters from 16 random bytes) is a bearer token, saved on the phone in localStorage. Whoever holds the phone holds the visit. The patient comes to the desk; staff open "Lost or stolen phone" in the patient's row and tap "Issue a new link". The visit gets a new access token, the slip opens with the new QR code, and the row says "New link issued for ECFZAK. The old link no longer works." The visit code stays the same. No database change: the staff update policy already covers `access_token`, the patient functions look the visit up `where access_token = p_token`, no trigger touches `access_token`, and the column is `unique`. Patients have no realtime channel on visit rows (only a `change_signal` table), so the old phone reads again with its old token and gets no row. Owner decisions: allowed only while waiting, called or on the way; no confirm step (opening the `<details>` is the first step, like "Remove from list"); no undo.

`lib/visitActions.ts` (the status check was written by the owner):

```ts
export function issueNewLink(visit: Visit, token: string): Visit | null {
  if (!["waiting", "called", "on_the_way"].includes(visit.status)) return null;
  return { ...visit, access_token: token };
}
```

`data/staffActions.ts` (`changeVisit` applies the rule to the cached visit and updates only the changed fields `where id = ? and version = ?`; 0 rows back means someone changed the visit first, so it returns "refused"; a database error, including a unique violation, returns "not_saved"):

```ts
export async function issueNewVisitLink(id: string, onSaved: (visit: Visit) => void): Promise<ChangeResult> {
  const result = await changeVisit(id, (v) => issueNewLink(v, makeAccessToken()));
  const updated = cachedVisit(id);
  if (result === "saved" && updated) onSaved(updated);
  return result;
}
```

`components/staff/VisitRow.tsx` (`act` shows "Saving…", then an error in red, or `okNote`, in one `role="status"` line):

```tsx
const showNewLink = (updated: Visit) => {
  onShowSlip(updated);
  setOkNote(`New link issued for ${visit.code}. The old link no longer works.`);
};
...
<details className="mt-3">
  <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">Lost or stolen phone</summary>
  <div className="mt-2 space-y-2">
    <p>The old link and the old slip stop working. Give the patient the new QR code.</p>
    <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => issueNewVisitLink(visit.id, showNewLink))}>
      Issue a new link<span className="sr-only"> {visit.code}</span>
    </Button>
  </div>
</details>
```

## Checks already done

- Type check, lint, build and 171 unit tests pass.
- Part a, Playwright at 390 x 844: the banner shows when the browser is set offline and goes when set online; no sideways scroll; in Arabic the page is right to left and the banner text is Arabic.
- Part b, Playwright at 390 x 844 with Extra large (root 150%) in all five languages: no sideways scroll; Urdu and Arabic right to left; the three radio labels wrap to two lines in Urdu; the choice stays after a reload. Not checked: the phone's own text size setting turned up as well.
- Part c, Playwright at 390 x 844 (beeps and vibrations counted by wrapping `createOscillator` and `navigator.vibrate`): the tap on the waiting screen gave 1 test beep and 1 vibration, focus moved to "Sound is on", no sideways scroll; after the staff recall, 1 alert at once and 1 more 30 seconds later; after "I'm on my way", no more alerts and the box was gone. Not yet checked: a real iPhone and a real Android phone; the box in Arabic.
- Part d, Playwright (old phone) with the owner on /staff: the old phone showed "Please head back now"; after the tap it changed by itself to "No visit found on this phone" and stayed so after a reload (390 px); the staff row showed "New link issued for ECFZAK..."; the slip opened with a new QR code; the new link in a private window showed ECFZAK. The reviewer worker found no blockers.

## Questions

1. Part a: is `navigator.onLine` with the "online" and "offline" events reliable enough on iPhone Safari and Android Chrome for this use? Name the cases where it says "online" while there is no real connection (for example Wi-Fi with no internet, or a captive portal), and say whether the demo should do anything about them or only note it.
2. Part a: while offline, the rest of the screen still shows the last status it had (for example "You are number 3 in line"). Is that misleading? Should the banner say the status shown may be old, or should the status be greyed out? Keep the answer within the existing text where you can.
3. Part a: screen readers: is an always-present `role="status"` div the right choice, given the other live regions on the page? Can two polite announcements at the same moment (offline banner and a status change) cancel each other?
4. Part a: contrast and look: black text on Tailwind `amber-300` with a 4px black border. Any WCAG 2.2 AA problem, including for people with low vision or colour blindness? Does it clash with the red 911 line just above it?
5. Part b: does a root font size of up to 150% meet WCAG 1.4.4 (resize text) and 1.4.10 (reflow) on a 390 px phone, also with the phone's own text size setting turned up? What can break: long Urdu or Arabic words, the three radio labels, the visit code in `font-mono tracking-widest`? Is clearing the root font size on unmount safe, and can the page flash at Normal size before the saved choice loads?
6. Part c: if the sound cannot start (`unlockSound` gives false, for example on a phone with no Web Audio or when the browser refuses), nothing on screen changes and the button stays. Should the screen say so in words? Suggest the shortest text.
7. Part c: the notice says the demo "vibrates" on every phone, but iPhone Safari cannot vibrate a web page. Suggest wording that stays true (for example "vibrates where the phone allows") without making the notice longer to read.
8. Part c: on iPhone Safari, does an AudioContext unlocked by a tap still play after the patient leaves for another app and comes back 1 to 2 minutes later? Does the `resume()` without a tap in `playAlert` work there, or does the first beep after return stay silent? What about the iPhone silent switch?
9. Part c: the box is a `<section>` with no heading or accessible name, and the called screen now shows two similar "demo limits" lines (one in the status card, one in the box). Is that a problem for screen readers or for reading? Should one line go?
10. Part c: there is no "Turn off sound". Does a patient need it (for example in a quiet place)? If yes, where does it go, and what happens to the alert loop?
11. Part c: if the phone discards the page while it is in the background (common on low-memory phones), the page loads again on return and the sound is off until a new tap. The patient sees the called screen but hears nothing. Is that acceptable for a demo, and should the screen ask for a tap?
12. Phone problems after "Recall patient". The visit link is saved on the phone (localStorage), and the patient screen has no name, phone number or CTAS level. Staff get flags at 10 and 20 minutes ("Phone the patient now", "Phone the patient again", calls are simulated) and "Review: unable to reach" at 30 minutes with no answered call; a nurse confirms it. For each case, name what goes wrong and the smallest fix: (a) the phone dies, the patient charges it and opens the page again (same visit, current status, sound off until a new tap); (b) the phone dies and cannot be charged (the app cannot tell this from a patient who ignores the call; the patient can walk to the desk with the visit code or the slip); (c) the phone is lost or stolen (whoever has it can see the visit code, site, place in line and status, and can tap "I'm on my way" or "I'm still here", which gives staff false information). Part d now adds "Issue a new link"; question 13 covers it.
13. Part d: is "Issue a new link" safe and enough? Consider: the desk cannot check that the person asking is the patient (the demo stores no name; the patient has the visit code and, maybe, the slip); one tap with no confirm and no undo; a race with the old phone tapping "I'm on my way" at the same moment (the version check); a unique-token collision shown as "the database could not be reached"; the old phone keeps the dead token in localStorage; the slip's QR code is shown on a staff screen others may see. Say what a hospital version must add, and what the demo must change now.
14. Anything else that is wrong or missing in parts a, b, c or d.
