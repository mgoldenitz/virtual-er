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

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-14. Pasted by the owner (the owner's paste was titled "Response to Pause Switch", but it answers the questions in this file). Text as pasted:

1. Part a: navigator.onLine reliability on iPhone Safari and Android Chrome. File: data/useOnline.ts (lines 5-16) and app/patient/page.tsx. What goes wrong: navigator.onLine only checks whether the phone's Wi-Fi or cellular radio is associated with a local network interface, not whether traffic can reach the internet or Supabase. It falsely reports true ("online") in several common cases: Wi-Fi connected with no upstream internet; captive portals (very common in ER waiting areas, coffee shops, and parking garages); cellular dead zones / stalled packets; iPhone Safari background resume (Safari does not always dispatch "offline"/"online" when connectivity drops while Safari is suspended in the background). Demo decision: the demo should not add periodic internet ping probes; the patient page's existing fetch error state (result === "unavailable") already catches real Supabase unreachability. Only note the limitation in the demo documentation, and re-read navigator.onLine on visibilitychange. A way to see it happen: Wi-Fi router with its WAN cable unplugged or a captive portal: useOnline() stays true and the banner never appears (until the next get_patient_visit fetch fails). Smallest fix: document the limitation, and add document.addEventListener("visibilitychange", onChange) inside subscribe in data/useOnline.ts.

2. Part a: showing stale status at full prominence while offline. File: app/patient/page.tsx and components/patient/PatientStatus.tsx. What goes wrong: while offline, the status card below the banner still shows stale data ("Your place in line: 3", "Estimated wait time: 40 to 60 minutes") at full contrast. A patient who may already be called on the server still sees "Your place in line: 3". Wording vs. styling: keep the offline text unchanged in all five languages, and visually dim the stale status card (opacity-60) while offline rather than hiding it. Smallest fix: wrap the status card in className={online ? undefined : "opacity-60"} in app/patient/page.tsx.

3. Part a: always-present role="status" live region and simultaneous announcements. File: components/patient/OfflineBanner.tsx (lines 12-18) and components/patient/StatusAnnouncer.tsx. What goes wrong: keeping role="status" mounted is right for VoiceOver. But the page has other polite live regions (StatusAnnouncer, "I'm still here"). When a reconnect and a status update happen in the same tick, mobile screen readers can cut off the first polite announcement with the second, so a blind patient misses the offline warning or the recall notice. Smallest fix: keep the persistent div, make the "called" announcement in StatusAnnouncer.tsx aria-live="assertive", and debounce polite announcements by about 1.5 s after online transitions.

4. Part a: contrast, colour blindness, clash with the red 911 line. File: components/patient/OfflineBanner.tsx (line 14) and app/patient/page.tsx. Contrast: no WCAG 2.2 AA failure (black on amber-300 about 14.2:1; 4 px black border about 21:1; meaning carried by words plus border). Clash: the heavy black-bordered amber box sits directly under the red 911 line "with no margin on OfflineBanner's wrapper"; at 150% text on 390 px both wrap to 3-4 lines and compete. Smallest fix: add mt-3 to the wrapper (or place the banner inside the status card) and soften to bg-amber-100 border-2 border-black.

5. Part b: root font size 150%, WCAG 1.4.4 / 1.4.10, OS font scaling, unmount cleanup, initial flash. Files: components/patient/TextSizeSwitch.tsx (lines 6-25), data/savedTextSize.ts, app/patient/page.tsx. The control stops at 150% (browser zoom reaches 200%). With the phone's own text size at 130-150%, 150% multiplies it (about 195%). What breaks: the radio input (h-5 w-5) lacks shrink-0 and squishes into an oval when a label wraps; the visit code in font-mono tracking-widest can overflow; long Urdu, Arabic or French words can overflow without break-words. Unmount cleanup is safe only if TextSizeSwitch stays mounted across every patient screen state; inside a conditional branch the root size would snap back to 100%. Flash: the saved size is applied in useEffect after hydration, so "Extra large" shows at 100% first. Smallest fix: shrink-0 on the radio, break-words on cards; tracking-wider instead of tracking-widest; keep TextSizeSwitch outside conditional branches; a small synchronous script in app/layout.tsx that reads localStorage "vwr.textSize" before first paint.

6. Part c: silent failure when unlockSound() returns false. File: components/patient/SoundSwitch.tsx (lines 6-11). turnOn() returns early with no change and no screen-reader message; the patient taps again and again. Should the screen say so? Yes. Shortest text: "Sound could not start on this phone." Smallest fix: a failed state, set when !ok, and <p role="status"> with that text.

7. Part c: notice says every phone "vibrates". File: lib/text/*.ts (sound.notice). iPhone Safari has no navigator.vibrate. Suggested text (23 words): "This demo plays a sound (and vibrates if supported) when you are called. It works only while this page is open and unlocked."

8. Part c: iPhone Safari background AudioContext and the Silent switch. File: components/patient/alertSound.ts (lines 22-39) and SoundSwitch.tsx. After 1-2 minutes in another app, the AudioContext becomes "interrupted" or "suspended". On return, playAlert() calls resume() without a tap and without await, and starts the oscillator at once; iOS often refuses, so the first beep (and often every repeat until a new tap) is silent while the screen still says "Sound is on". With the Silent switch on, Web Audio is muted. Smallest fix: check ctx.state after resume() (or use onstatechange) and set soundOn back to false when iOS leaves it suspended or interrupted, so "Turn on sound" shows again; add "Take your phone off silent." to the notice.

9. Part c: unlabelled <section> and two "demo limits" lines. Files: SoundSwitch.tsx (line 29), PatientStatus.tsx (alertLimits). The section has no name; the called screen shows the "open and your phone is unlocked" sentence twice in a row. Smallest fix: remove alertLimits from the called view (the sound box already says it), and add aria-label={t.turnOn} to the section.

10. Part c: no "Turn off sound". A patient in a quiet place, or walking in after the call, cannot stop the 30-second beep without reloading. Smallest fix: a secondary "Turn off sound" button under "Sound is on"; it sets soundOn false and calls navigator.vibrate?.(0); the effect cleanup stops the interval and listener; focus goes back to "Turn on sound".

11. Part c: page discarded in the background. Acceptable for a demo (browsers need a fresh tap). When status is "called" and sound is off, show: "Sound turned off when this page reloaded. Tap to turn it back on."

12. Phone problems after "Recall patient". (a) Dies, charged, reopened: the token survives in localStorage, sound is off until a tap; a temporary in-app QR browser may lose the token. Fix: the paper slip is the backup; show "Sound is off: tap Turn on sound" on the called screen when sound is off. Hospital: SMS or voice call too. (b) Dies, cannot be charged: staff see "Review: unable to reach" and may close the visit; the patient comes to the desk with the code. Fix: keep the code prominent on the slip with a note to show it at the desk; keep unable_to_reach visits reopenable under Recently closed. Hospital: a second phone number at triage. (c) Lost or stolen: the token is a bearer secret; the holder can see the visit and tap "I'm on my way" or "I'm still here". Fix: keep the screen free of personal and health data, and revoke with "Issue a new link". Hospital: let staff switch the patient to on-site waiting.

13. Part d: is "Issue a new link" safe and enough? Demo must change now: (i) one tap, no confirmation, no undo can lock out the real patient: add a two-step confirmation inside the details. (ii) The old phone keeps the dead token and shows "No visit found on this phone": when get_patient_visit returns no row for a saved token, clear it and show "This link did not work". (iii) A unique-token collision is reported as "not_saved": retry up to 3 times with a new token, as start_home_visit does. (iv) Race with the old phone: the version check refuses safely, but staff need clear feedback ("Visit updated: tap again to issue a new link"); the slip opens at once on a monitor others may see; add a reminder: "Check the patient's details before issuing a new link, and close the slip once scanned." Hospital version must add: identity check (ID, health card, or name and date of birth against the EHR) before rotation; an audit log (who, when, why); a one-step switch to on-site waiting; a short-lived pairing code or a QR screen that hides itself after 30 seconds.

14. Anything else. Part b: TextSizeSwitch.tsx has no "use client" at line 1, and data/savedTextSize.ts does not listen to "storage" events (a second tab does not follow). Part c: a fast double-tap on "Turn on sound" plays two test beeps (no in-flight guard in turnOn). Part d: "Issue a new link" uses aria-disabled, not a guard, so a double-click sends two updates and the second shows "refused"; guard with if (saving) return.

### Claude's check (2026-11-14)

I compared each point with the code on `main` at `c3027b1`. "Code checked" means I read the named lines in this session. Nothing was run on a real phone.

Wrong (premise does not match the code):
- 14, "use client": wrong. `components/patient/TextSizeSwitch.tsx` line 1 is `"use client";`.
- 14, double-click on "Issue a new link": wrong. `act()` in `components/staff/VisitRow.tsx` line 49 starts with `if (saving) return;`.
- 3, assertive recall: already done. `components/patient/StatusAnnouncer.tsx` line 76 has an assertive region for the call-back, line 73 a polite one for the rest. The 1.5 s debounce is not needed for the recall; not accepted.
- 4, "no margin": wrong. The patient `main` has `space-y-5`, so there is already a gap between the 911 line and the banner. Contrast: Gemini agrees there is no failure. Softer colours: the owner's choice.
- 5, TextSizeSwitch inside a conditional branch: wrong. It is at `app/patient/page.tsx` line 92, outside every branch.
- 5, visit code overflow: already checked at 390 px with Extra large in all five languages (progress.md, 2026-11-14): no sideways scroll. Not with the phone's own text size turned up (not checked).

Right, small fixes (code checked):
- 1: add `visibilitychange` to `subscribe` in `data/useOnline.ts`. Note the captive-portal limit in the known issues.
- 5: `shrink-0` on the radio input (line 43). The flash at Normal size is real (the size is set in `useEffect`); a small script in the layout would stop it.
- 6: `turnOn()` returns with no change when `unlockSound()` gives false (lines 19-20). Add the text "Sound could not start on this phone." (new text, four draft translations).
- 7: the notice says "vibrates" for every phone (`lib/text/en.ts` line 151). Gemini's text drops "your phone" ("this page is open and unlocked" reads as if the page is unlocked). Better: "This demo plays a sound, and vibrates where the phone allows, when you are called. It works only while this page is open and your phone is unlocked." The SPEC sentence ("work only while the page is open and the phone is unlocked") is kept.
- 9: on the called screen, `alertLimits` (`PatientStatus.tsx` line 56) and the sound notice say almost the same thing. The sound box shows on the called screen too, so `alertLimits` can go from the called view and the SPEC rule is still met. Give the section an accessible name.
- 13 (i): no confirmation before "Issue a new link" (line 116). Add one.
- 13 (ii): confirmed. `data/patientVisit.ts` line 75 gives null for no row, and the page shows "No visit found on this phone" (line 108) with the dead token kept. Clear the token and show "This link did not work".
- 14, double-tap on "Turn on sound": plausible. `turnOn()` has no guard while `unlockSound()` waits. Add one.

Right, but the owner decides:
- 2: the stale status is a real problem. `opacity-60` lowers text contrast and can fail WCAG 1.4.3 for the slate text; not accepted as written. Options: no change (the banner already says "Reconnect to the internet to see your status"), or a dashed border on the status card with no change to the text colour.
- 8: plausible, not checked (needs the owner's real iPhone test, still open). Gemini's fix (show "Turn on sound" again when `resume()` fails) is good. "Take your phone off silent." is new text.
- 10: "Turn off sound": a new button and new text. Reasonable.
- 11 and 12 (a): Gemini's text "Sound turned off when this page reloaded" is false for a patient who never turned it on. Neutral text, if wanted: "Sound is off. Tap Turn on sound to hear the alert."
- 13 (iii): the token has 26 characters (`lib/codes.test.ts` line 33), so a collision is very unlikely. A retry, as in `data/startHomeVisit.ts`, is cheap. Low priority.
- 13 (iv): the "refused" case already shows "The list just changed. Check this patient again." (`VisitRow.tsx` line 24). A reminder line to close the slip is optional.
- 12 (b): "Reopen" under Recently closed already exists (progress.md, 2026-11-11). Nothing new to build.
- Hospital list in 13 and the "storage" event in 14: note only, no demo change.
