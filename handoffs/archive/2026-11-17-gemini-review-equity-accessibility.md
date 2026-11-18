# Gemini review: equity and accessibility of the patient screens (Phase 3)

Model: Gemini Hydrogen 4, High, in a new chat. Date: 2026-11-17. Branch `phase3-review-fixes`, commit `d761aaa`.

## Prompt (paste everything from here to the end of the file)

You review a concept prototype of a virtual emergency department waiting room. Low-acuity patients (Canadian Triage and Acuity Scale level 4 or 5) wait off-site after triage. They follow their place in line on their own phone and come back when staff recall them. The app uses synthetic data only and connects to no hospital system. It is a Next.js 16 App Router app with React 19, Tailwind CSS 4 and Supabase.

Your job is to find problems, not to confirm that the work is good. If a part has no problem, say "No problem found" for it in one line. For each problem, give the file and line, what goes wrong and for whom, how bad it is (high, medium or low), and the smallest fix.

The translations in French, Urdu, Arabic and Mandarin (Simplified Chinese) are drafts. A fluent human reviewer checks them later. Do not review the quality of the translations. Do review how the app tells a patient that a language is a draft, and what happens for a patient whose language is not one of the five.

### Hard rules from the spec (these always apply)

- Every patient screen, in every state and every language, shows: "If your symptoms get worse, call 911 or come back to the emergency department now."
- The app never makes clinical decisions. Staff choose the CTAS level. No symptom checker.
- Joining from home never holds a place in the doctor's line. A place in line starts at triage.
- The sound and vibration alerts work only while the page is open and the phone is unlocked, and the app must say so. It must not claim to wake a locked phone.
- "I'm still here" only tells staff that the patient still follows the visit. It is not a clinical reassessment.
- Accessibility target: WCAG 2.2 AA. Keyboard access, visible focus, labelled controls, touch targets of at least 24 by 24 CSS pixels, enough contrast, a layout that works at 200% text, screen-reader announcements for meaningful status changes (polite, or assertive for the call-back), and the wait range is not announced on every update.
- Store no real personal or health information.

### Patient screens

- `/` start page: emergency check, other care options (Health811, virtual urgent care, an urgent care centre, pharmacists), a link to the hospital's own wait times page, and "Start a visit" (choose a demo site and a language). While staff pause off-site waiting, "Start a visit" is replaced by a message to come to the emergency department.
- `/patient`: opens the visit saved on this phone (or from the link on a printed desk slip). Statuses: `pre_arrival` (started from home, not yet triaged), `waiting` (place in line, an estimated time range, "I'm still here" every 30 minutes), `called` (please head back now, with sound and vibration where the phone allows, and "I'm on my way"), `on_the_way`, and closed states. Language switch, text size control, offline banner, and the 911 line.
- Patients who do not have a phone, or do not want to use one, wait on-site as usual. Staff record "offered, declined".

### Questions

1. Who is left out or put at a disadvantage? Think of: no smartphone or a shared phone, little mobile data, no data plan in the waiting area, low literacy, low vision, blind screen-reader users, Deaf and hard-of-hearing users, cognitive or memory disabilities, older adults, patients whose language is not one of the five, and patients with a phone set to a language the app does not have. For each group, say what the app does now (from the code), and the smallest change that helps most.
2. Plain language. Read `lib/text/en.ts`. List each sentence that is hard to read at about a grade 6 level, or that a patient can read in two ways. Put safety sentences first (the 911 line, the call-back, "Please return now", the triage sentence). Give a simpler sentence for each. Keep every fixed sentence from the hard rules above as it is.
3. Draft language notice (`lib/text/languages.ts` and `components/LanguageSwitch.tsx`). Is it clear to a patient that a translation is a draft? Is it fair (for example, does a draft language make a patient trust the safety text less)? What does a patient see when the phone language is not one of the five?
4. Screen readers (`components/patient/StatusAnnouncer.tsx`, `components/patient/PatientStatus.tsx`, `components/patient/StillHerePrompt.tsx`). Are the right changes announced, at the right level (polite or assertive), and only once? Can a change be missed or announced twice? Is focus moved in a way that can confuse a screen-reader user?
5. Alerts (`components/patient/SoundSwitch.tsx`, `components/patient/alertSound.ts`, `components/patient/CallReminder.tsx`). A Deaf patient gets no sound. A patient with a locked phone gets nothing. Does the screen tell each patient clearly what to expect and what to do? Is any alert given only by sound, or only by colour?
6. Text size, right-to-left and layout (`components/patient/TextSizeSwitch.tsx`, `lib/textSize.ts`). Problems with 200% text, Urdu and Arabic right to left, colour-only meaning, touch targets, or the order a keyboard user moves through the screen.
7. Anything else in the files below that makes the app less fair or less usable for a patient.

### Checked (with results)

- axe-core 4.14.0 (WCAG 2.2 AA rules), 2026-11-17: no faults on the start page, `/patient` with no visit and with a broken link, `/login`, `pre_arrival`, `waiting`, `called` and `on_the_way`, at 320, 390 and 1280 px, in all five languages, at 100% and 200% text (30 runs for each screen). Nothing goes off the screen, and the 911 line shows on every patient screen.
- 60 test files and 335 unit tests pass. Lint has 0 errors. The build passes. The text tests check that every language has every sentence, that 911 and 811 stay wherever English has them, and that the 911 line, the footer and the fixed spec sentences are exact.

### Not checked

- A real screen reader (NVDA, JAWS, VoiceOver or TalkBack). Only axe rules and unit tests of the live region text.
- Sound and vibration on a real iPhone or Android phone.
- Windows high contrast (forced colours) mode and the browser zoom (only the text size setting was checked).
- A full keyboard-only pass of every screen.
- Testing with real patients, and the quality of the four translations (a fluent reviewer checks them later).

### Line counts of the files below

lib/text/en.ts 192, lib/text/languages.ts 53, lib/textSize.ts 45, app/patient/page.tsx 116, components/LanguageSwitch.tsx 37, components/EmergencyLine.tsx 11, components/start/StartPageBody.tsx 47, components/start/CareOptions.tsx 59, components/start/StartVisit.tsx 203, components/patient/VisitScreen.tsx 90, components/patient/PatientStatus.tsx 175, components/patient/StatusAndSound.tsx 48, components/patient/StatusAnnouncer.tsx 84, components/patient/StillHerePrompt.tsx 104, components/patient/SoundSwitch.tsx 194, components/patient/alertSound.ts 111, components/patient/CallReminder.tsx 46, components/patient/TextSizeSwitch.tsx 52, components/patient/OfflineBanner.tsx 22.

## Files

### lib/text/en.ts

```tsx
     1	// Every sentence a patient sees, in English. Other languages copy this shape (lib/text/index.ts).
     2	// Wording approved by the owner on 2026-11-10 (handoffs/archive/2026-11-10-gemini-patient-wording-phase3-response.md).
     3	// Sentences marked "SPEC" are fixed by SPEC.md: change them only if the owner changes SPEC.
     4	// Words in {braces} are filled in by the app (for example {low}); translators keep them as they are.
     5	// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
     6	// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
     7	
     8	import type { DurationWords } from "./durationWords";
     9	
    10	export const en = {
    11	  // SPEC rule 3: on every patient screen, in every state and every language.
    12	  emergencyLine: "If your symptoms get worse, call 911 or come back to the emergency department now.",
    13	  // SPEC: on every page.
    14	  footer: "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only.",
    15	  appName: "Virtual Waiting Room",
    16	  visitCode: "Visit code",
    17	  siteName: "Demo Site {site}",
    18	  newTab: "(opens in a new tab)",
    19	
    20	  start: {
    21	    // SPEC
    22	    emergencyCheck:
    23	      "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now.",
    24	    careHeading: "Learn about your care options",
    25	    careIntro: "This demo cannot choose a service for you. Check the rules and hours on each site before you go.",
    26	    health811Before: "Health811: Call",
    27	    health811After: "to speak with a nurse for free.",
    28	    virtualCare: "Virtual urgent care",
    29	    // SPEC (the next five)
    30	    urgentCare: "Urgent Care Centre at Queensway Health Centre in Etobicoke.",
    31	    pharmacist:
    32	      "A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so check that it is still running before you go.",
    33	    hoursBefore: "For hours and addresses, see",
    34	    hoursLink: "THP's emergency page",
    35	    waitTimesLink: "See current wait times on THP's website",
    36	
    37	    startHeading: "Start a visit",
    38	    // Ends with SPEC's sentence about triage.
    39	    startIntro:
    40	      "Starting here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
    41	    siteQuestion: "Which emergency department are you going to?",
    42	    startButton: "Start a visit",
    43	    starting: "Starting…",
    44	    // SPEC
    45	    paused: "Off-site waiting is paused right now. Please come to the emergency department and wait there.",
    46	    busy: "The app is too busy right now. Please wait a few minutes and try again. You can also go straight to the emergency department.",
    47	    notSaved: "Your visit did not save. Please try again. Or, go to the emergency department desk.",
    48	
    49	    checkingSaved: "Checking this phone for a saved visit…",
    50	    unavailableHeading: "We cannot open the saved visit on this phone",
    51	    unavailableText:
    52	      "Your saved visit will not load right now. You cannot start a new one here. If you need care, please go to the emergency department desk.",
    53	    openHeading: "You have an open visit on this phone",
    54	    openVisit: "Open your visit",
    55	    closedHeading: "Your past visit on this phone",
    56	    closedText:
    57	      "Off-site waiting is over for this visit. You might still be waiting at the hospital. Open your visit to check.",
    58	    expiredHeading: "Your visit request has expired",
    59	    startNew: "Start a new demo visit",
    60	
    61	    demoScreens: "Demo screens",
    62	    staffScreen: "Staff screen",
    63	    patientScreen: "Patient screen",
    64	    dashboard: "Dashboard",
    65	  },
    66	
    67	  // Shown on the start page and the patient screen when a visit from home was never triaged.
    68	  expiredText:
    69	    "You started this visit over 6 hours ago. It was never checked in at triage. Staff no longer expect you to arrive.",
    70	
    71	  patient: {
    72	    loading: "Loading your visit…",
    73	    unavailableHeading: "We cannot load your visit",
    74	    unavailableText:
    75	      "Your actions on this page are not saving. Staff may not see them. Please go to the emergency department desk.",
    76	    noVisitHeading: "No visit found on this phone",
    77	    brokenLinkHeading: "This link did not work",
    78	    brokenLinkText: "The link might be wrong or cut short. No visit was opened.",
    79	    findVisitHelp:
    80	      "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again.",
    81	
    82	    waitingHeading: "Status: Waiting",
    83	    placeInLine: "Your place in line:",
    84	    // SPEC
    85	    placeCanChange: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
    86	    // SPEC
    87	    waitLabel: "Estimated time until you're called back:",
    88	    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
    89	    // from an hour, each end is built from the Duration words below.
    90	    waitRangeLong: "{low} to {high}",
    91	    simulated: "This estimate is simulated for the demo.",
    92	
    93	    calledHeading: "Please head back now",
    94	    calledText: "Please go back to the emergency department desk.",
    95	    onMyWay: "I'm on my way",
    96	    sending: "Sending…",
    97	    confirmed: "Thank you. Staff know you are on your way.",
    98	    notSaved: "Your answer did not save. Staff do not know you tapped it. Please try again or go to the desk.",
    99	
   100	    fromHomeHeading: "Status: Started from home, not yet triaged",
   101	    fromHomeText: [
   102	      // SPEC
   103	      "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
   104	      "This app does not register you or give permission to wait off-site.",
   105	      "If you go to the emergency department, follow its normal steps. Show this visit code to staff. Only staff can approve off-site waiting.",
   106	    ],
   107	    reassessHeading: "Please go to the triage desk",
   108	    reassessText: "A nurse needs to check you again. This happens before you rejoin the line.",
   109	    arrivedHeading: "Status: Ready at the desk",
   110	    arrivedText: "Staff know you are back. Please stay in the waiting area until you are called.",
   111	    onsiteHeading: "Status: Waiting in the emergency department",
   112	    onsiteText: "You are waiting inside the hospital. Staff will call you when they are ready.",
   113	    endedHeading: "Your off-site wait has ended",
   114	    endedText: "Please go to the emergency department desk.",
   115	    unableText:
   116	      "Staff could not reach you, so this visit has left the off-site line. If you still need care, please come to the emergency department desk.",
   117	    removedText:
   118	      "Staff have ended off-site waiting for this visit. If you still need care, please come to the emergency department desk.",
   119	    expiredHeading: "This visit request has expired",
   120	    expiredHelp: "If you still need care, please go to the emergency department desk.",
   121	    expiredNewVisit: "Or start a new demo visit on the start page.",
   122	  },
   123	
   124	  // Heard by screen-reader users when the status changes (never the wait range or countdowns).
   125	  announce: {
   126	    called: "You have been called back. Please head back to the emergency department now.",
   127	    onTheWay: "Thank you. Staff know you are on your way.",
   128	    arrived: "Staff have marked you as back at the emergency department.",
   129	    ended: "Your off-site wait has ended.",
   130	    reassess: "Please go to the triage desk.",
   131	    stillHere: "Please tap the button to confirm you are still here.",
   132	    secondAlert: "Urgent: Please return to the emergency department right now.",
   133	    waiting: "You are now in the off-site line. This page shows your place in line.",
   134	    onsite: "Please wait inside the emergency department. Staff will call you when they are ready.",
   135	  },
   136	
   137	  // Desk slip (printed for the patient).
   138	  slip: {
   139	    // SPEC
   140	    typeLink: "Or type this link into your phone's browser:",
   141	  },
   142	
   143	  // Phase 3 features still being built. Written now so all text is translated in one batch.
   144	  stillHere: {
   145	    heading: "Are you still following your visit?",
   146	    button: "I'm still here",
   147	    thanks: "Thank you.",
   148	    meaning: "This tells staff you are still waiting. It is not a check of your health.",
   149	  },
   150	  secondAlert: "Please return to the emergency department right now. Staff may try to reach you.",
   151	  returnNow: {
   152	    lead: "We have not heard from you.",
   153	    // SPEC
   154	    text: "Please return now. Staff will review your visit if you do not respond.",
   155	  },
   156	  sound: {
   157	    notice:
   158	      "This demo can play a sound when you are called. It also vibrates if your phone allows it. Alerts work only while this page is open and your phone is unlocked. Take your phone off silent so you can hear it.",
   159	    turnOn: "Turn on sound",
   160	    on: "Sound is on",
   161	    failed: "Sound could not start on this phone. Watch this screen to see when you are called.",
   162	    turnOff: "Turn off sound",
   163	    offWhileCalled: "Sound is off. Tap \"Turn on sound\" for sound alerts.",
   164	  },
   165	  pausedHeading: "Off-site waiting is paused",
   166	  textSize: { label: "Text size", normal: "Normal", large: "Large", extraLarge: "Extra large" },
   167	  language: {
   168	    label: "Select language",
   169	    draftNotice: "This translation is a draft. A fluent speaker has not checked it yet.",
   170	  },
   171	  survey: {
   172	    // SPEC
   173	    question: "How would you rate your waiting experience?",
   174	    low: "0 = Very poor",
   175	    high: "10 = Excellent",
   176	    submit: "Submit",
   177	    thanks: "Thank you for your feedback.",
   178	    note: "Answering is optional. Your name is not stored.",
   179	  },
   180	  offline: "You are offline. Reconnect to the internet to see your status.",
   181	};
   182	
   183	/** The shape every language's text must have. */
   184	export type PatientText = typeof en;
   185	
   186	/** Hour and minute words for the wait range (lib/waitText.ts) and the staff screen-reader words. */
   187	export const enDuration: DurationWords = {
   188	  locale: "en",
   189	  hour: { one: "{n} hour", other: "{n} hours" },
   190	  minute: { one: "{n} minute", other: "{n} minutes" },
   191	  join: "{h} {m}",
   192	};
```

### lib/text/languages.ts

```tsx
     1	// The languages the app offers, and which one a patient's screen shows.
     2	// "approved" turns true only after a fluent speaker has checked that language (SPEC);
     3	// until then its screens show the draft notice.
     4	
     5	export type LanguageInfo = {
     6	  code: string;
     7	  /** The language's name written in that language, so a patient can find their own. */
     8	  name: string;
     9	  /** The English name, shown beside the own-script name (some phone screen readers cannot read the script). */
    10	  englishName: string;
    11	  dir: "ltr" | "rtl";
    12	  approved: boolean;
    13	};
    14	
    15	export const LANGUAGES: LanguageInfo[] = [
    16	  { code: "en", name: "English", englishName: "English", dir: "ltr", approved: true },
    17	  { code: "fr", name: "Français", englishName: "French", dir: "ltr", approved: false },
    18	  { code: "ur", name: "اردو", englishName: "Urdu", dir: "rtl", approved: false },
    19	  { code: "ar", name: "العربية", englishName: "Arabic", dir: "rtl", approved: false },
    20	  { code: "zh", name: "中文（简体）", englishName: "Mandarin", dir: "ltr", approved: false },
    21	];
    22	
    23	export const LANGUAGE_CODES = LANGUAGES.map((l) => l.code);
    24	
    25	/** The language's details; English for an unknown code. */
    26	export function languageInfo(code: string | null | undefined): LanguageInfo {
    27	  return LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
    28	}
    29	
    30	/** How a language is listed in a menu: its own name, then the English name, for example "اردو (Urdu)". */
    31	export function menuLabel(info: LanguageInfo): string {
    32	  return info.code === "en" ? info.name : `${info.name} (${info.englishName})`;
    33	}
    34	
    35	/**
    36	 * The language carried by a desk QR link (the "l=" part after #), or null. The desk sets it from
    37	 * the visit, so a patient who scans the slip sees their language even before the visit loads.
    38	 */
    39	export function linkLanguage(hash: string): string | null {
    40	  const match = hash.match(/[#&]l=([a-z]{2,3})(?:&|$)/);
    41	  return match && LANGUAGE_CODES.includes(match[1]) ? match[1] : null;
    42	}
    43	
    44	/**
    45	 * The language a patient's screen shows: the one chosen on this phone, else the visit's own
    46	 * language, else English. The phone's choice is known before the visit loads, so even the
    47	 * loading screen and the 911 line are in the patient's language.
    48	 */
    49	export function patientLanguage(chosenOnPhone: string | null, visitLanguage: string | null | undefined): string {
    50	  if (chosenOnPhone && LANGUAGE_CODES.includes(chosenOnPhone)) return chosenOnPhone;
    51	  if (visitLanguage && LANGUAGE_CODES.includes(visitLanguage)) return visitLanguage;
    52	  return "en";
    53	}
```

### lib/textSize.ts

```tsx
     1	// The three text sizes a patient can choose, and the root font size each one sets.
     2	
     3	export const TEXT_SIZES = ["normal", "large", "extraLarge"] as const;
     4	
     5	/** The browser storage key that remembers the chosen size on this phone. */
     6	export const TEXT_SIZE_KEY = "vwr.textSize";
     7	
     8	export type TextSize = (typeof TEXT_SIZES)[number];
     9	
    10	const ROOT_FONT_SIZES: Record<TextSize, string> = {
    11	  normal: "100%",
    12	  large: "125%",
    13	  extraLarge: "150%",
    14	};
    15	
    16	/** True only for the three sizes the patient can choose. */
    17	export function isTextSize(value: unknown): value is TextSize {
    18	  return typeof value === "string" && (TEXT_SIZES as readonly string[]).includes(value);
    19	}
    20	
    21	/** The font size of the whole page. Tailwind sizes are in rem, so all text and spacing grow together. */
    22	export function rootFontSize(size: TextSize): string {
    23	  return ROOT_FONT_SIZES[size];
    24	}
    25	
    26	/**
    27	 * A short plain-JavaScript script for the page's <head>. It sets the page font size before the first
    28	 * paint on patient screens, so a patient who chose a larger size does not see the page at Normal
    29	 * size first. It does nothing outside /patient, and does nothing if browser storage is blocked.
    30	 * The key and the sizes are written in as JSON, so they are defined only in this file.
    31	 */
    32	export function textSizeScript(): string {
    33	  return `(function () {
    34	  if (!location.pathname.startsWith("/patient")) return;
    35	  try {
    36	    var saved = localStorage.getItem(${JSON.stringify(TEXT_SIZE_KEY)});
    37	    var sizes = ${JSON.stringify(ROOT_FONT_SIZES)};
    38	    if (saved && Object.prototype.hasOwnProperty.call(sizes, saved)) {
    39	      document.documentElement.style.fontSize = sizes[saved];
    40	    }
    41	  } catch {
    42	    // Storage blocked: the page stays at Normal size.
    43	  }
    44	})();`;
    45	}
```

### app/patient/page.tsx

```tsx
     1	"use client";
     2	
     3	// The patient screen on the patient's own phone: opens the visit from the link's token
     4	// (or the one saved on this phone) and updates live.
     5	
     6	import { useEffect, useState } from "react";
     7	import { confirmOnMyWayByToken, recordSeen, usePatientView } from "@/data/patientVisit";
     8	import { chooseLanguage, useChosenLanguage } from "@/data/savedLanguage";
     9	import { forgetSavedToken, takeTokenFromLink } from "@/data/savedToken";
    10	import { useOnline } from "@/data/useOnline";
    11	import { EmergencyLine } from "@/components/EmergencyLine";
    12	import { LanguageSwitch } from "@/components/LanguageSwitch";
    13	import { PatientShell } from "@/components/PatientShell";
    14	import { OfflineBanner } from "@/components/patient/OfflineBanner";
    15	import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
    16	import { VisitScreen } from "@/components/patient/VisitScreen";
    17	import { isDeadToken } from "@/lib/deadToken";
    18	import { textFor } from "@/lib/text";
    19	import { languageInfo, patientLanguage } from "@/lib/text/languages";
    20	
    21	export default function PatientPage() {
    22	  const [token, setToken] = useState<string | null | undefined>(undefined);
    23	  const [notSaved, setNotSaved] = useState(false);
    24	  const [brokenLink, setBrokenLink] = useState(false);
    25	  const [sending, setSending] = useState(false);
    26	  const chosenLanguage = useChosenLanguage();
    27	  const online = useOnline();
    28	
    29	  // Reading the link and browser storage can only happen in the browser, after the first render.
    30	  // A new link opened on this same page (only the #t=... part changes) switches to that visit.
    31	  useEffect(() => {
    32	    const readLink = () => {
    33	      const link = takeTokenFromLink();
    34	      // A desk QR link carries the visit's language: remember it, so it shows before the visit loads.
    35	      if (link.language) chooseLanguage(link.language);
    36	      setToken(link.token);
    37	      setBrokenLink(link.brokenLink);
    38	      setNotSaved(false);
    39	    };
    40	    readLink();
    41	    window.addEventListener("hashchange", readLink);
    42	    return () => window.removeEventListener("hashchange", readLink);
    43	  }, []);
    44	
    45	  const result = usePatientView(token ?? null);
    46	
    47	  // The token opens no visit any more (for example staff issued a new link for a lost phone):
    48	  // say the link did not work, and forget the token so this phone never tries it again.
    49	  const deadToken = isDeadToken(token, result);
    50	  useEffect(() => {
    51	    if (deadToken) forgetSavedToken();
    52	  }, [deadToken]);
    53	  const linkFailed = brokenLink || deadToken;
    54	  const loading = token === undefined || result === undefined;
    55	  const view = result === "unavailable" ? null : result;
    56	  // The phone's own choice first, so even "Loading…" and the 911 line are in that language.
    57	  const language = patientLanguage(chosenLanguage, view?.language);
    58	  const t = textFor(language);
    59	
    60	  // The first time the called screen is actually on screen, record seen_at
    61	  // (shown, not necessarily read). A tab in the background waits until it is brought forward.
    62	  useEffect(() => {
    63	    if (!token || view?.status !== "called" || view.seen) return;
    64	    let stopped = false;
    65	    let retry: ReturnType<typeof setTimeout> | undefined;
    66	    const recordIfVisible = async () => {
    67	      clearTimeout(retry);
    68	      if (stopped || document.visibilityState !== "visible") return;
    69	      const result = await recordSeen(token);
    70	      // Could not reach the database: try again shortly, for as long as the called screen is showing.
    71	      if (result === "not_saved" && !stopped) retry = setTimeout(recordIfVisible, 10_000);
    72	    };
    73	    void recordIfVisible();
    74	    document.addEventListener("visibilitychange", recordIfVisible);
    75	    return () => {
    76	      stopped = true;
    77	      clearTimeout(retry);
    78	      document.removeEventListener("visibilitychange", recordIfVisible);
    79	    };
    80	  }, [token, view?.status, view?.seen]);
    81	
    82	  async function onOnMyWay() {
    83	    if (!token || sending) return;
    84	    setSending(true);
    85	    // "Seen" can only be recorded while the visit is still "called". A very quick tap could
    86	    // otherwise confirm first and leave the seen time empty, so make sure it is recorded first.
    87	    if (view && !view.seen) await recordSeen(token);
    88	    const result = await confirmOnMyWayByToken(token);
    89	    setSending(false);
    90	    setNotSaved(result === "not_saved");
    91	  }
    92	
    93	  return (
    94	    <PatientShell>
    95	    <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-5 px-4 py-6">
    96	      <h1 className="text-xl font-bold">{t.appName}</h1>
    97	      <LanguageSwitch language={language} />
    98	      <TextSizeSwitch language={language} />
    99	      <EmergencyLine language={language} />
   100	      <OfflineBanner language={language} />
   101	
   102	      <VisitScreen
   103	        loading={loading}
   104	        result={result}
   105	        linkFailed={linkFailed}
   106	        token={token ?? null}
   107	        language={language}
   108	        onOnMyWay={onOnMyWay}
   109	        sending={sending}
   110	        online={online}
   111	        notSaved={notSaved}
   112	      />
   113	    </main>
   114	    </PatientShell>
   115	  );
   116	}
```

### components/LanguageSwitch.tsx

```tsx
     1	"use client";
     2	
     3	// The language menu on patient screens, with each language written in itself so a patient
     4	// can find their own. Shows the draft notice for any language a fluent speaker has not
     5	// approved yet (SPEC). The choice is remembered on this phone (data/savedLanguage.ts).
     6	
     7	import { chooseLanguage } from "@/data/savedLanguage";
     8	import { textFor } from "@/lib/text";
     9	import { languageInfo, LANGUAGES, menuLabel } from "@/lib/text/languages";
    10	
    11	export function LanguageSwitch({ language }: { language: string }) {
    12	  const t = textFor(language);
    13	  const current = languageInfo(language);
    14	  return (
    15	    <div className="space-y-2">
    16	      <label className="flex flex-wrap items-center gap-3">
    17	        <span className="font-semibold">{t.language.label}</span>
    18	        <select
    19	          value={current.code}
    20	          onChange={(e) => chooseLanguage(e.target.value)}
    21	          className="min-h-11 max-w-full rounded-lg border-2 border-control bg-card px-3"
    22	        >
    23	          {LANGUAGES.map((l) => (
    24	            <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
    25	              {menuLabel(l)}
    26	            </option>
    27	          ))}
    28	        </select>
    29	      </label>
    30	      {!current.approved && (
    31	        <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
    32	          {t.language.draftNotice}
    33	        </p>
    34	      )}
    35	    </div>
    36	  );
    37	}
```

### components/EmergencyLine.tsx

```tsx
     1	// The 911 safety line from SPEC rule 3, shown on every patient screen in every state and language.
     2	
     3	import { textFor } from "@/lib/text";
     4	
     5	export function EmergencyLine({ language }: { language?: string }) {
     6	  return (
     7	    <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-base font-semibold text-red-900">
     8	      {textFor(language).emergencyLine}
     9	    </p>
    10	  );
    11	}
```

### components/start/StartPageBody.tsx

```tsx
     1	"use client";
     2	
     3	// Everything on the start page, in the language chosen on this phone (English until one is
     4	// chosen): the language menu, the emergency check first, other care options, THP's
     5	// wait-time link, then "Start a visit". Urdu and Arabic are laid out right to left.
     6	
     7	import Link from "next/link";
     8	import { useChosenLanguage } from "@/data/savedLanguage";
     9	import { textFor } from "@/lib/text";
    10	import { languageInfo } from "@/lib/text/languages";
    11	import { EmergencyLine } from "@/components/EmergencyLine";
    12	import { LanguageSwitch } from "@/components/LanguageSwitch";
    13	import { CareOptions } from "@/components/start/CareOptions";
    14	import { StartVisit } from "@/components/start/StartVisit";
    15	
    16	const linkStyle =
    17	  "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";
    18	
    19	export function StartPageBody() {
    20	  const language = useChosenLanguage() ?? "en";
    21	  const t = textFor(language);
    22	  return (
    23	    <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
    24	      <h1 className="text-2xl font-bold">{t.appName}</h1>
    25	      <LanguageSwitch language={language} />
    26	      <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
    27	        {t.start.emergencyCheck}
    28	      </p>
    29	      <div className="clean-card">
    30	        <CareOptions language={language} />
    31	      </div>
    32	      <StartVisit language={language} />
    33	      <EmergencyLine language={language} />
    34	      <nav aria-label={t.start.demoScreens} className="flex flex-wrap gap-3 border-t border-slate-300 pt-4">
    35	        <Link href="/staff" className={linkStyle}>
    36	          {t.start.staffScreen}
    37	        </Link>
    38	        <Link href="/patient" className={linkStyle}>
    39	          {t.start.patientScreen}
    40	        </Link>
    41	        <Link href="/dashboard" className={linkStyle}>
    42	          {t.start.dashboard}
    43	        </Link>
    44	      </nav>
    45	    </main>
    46	  );
    47	}
```

### components/start/CareOptions.tsx

```tsx
     1	// The start page's "other options before travelling" and the link to THP's own wait times.
     2	// Only names and links: nothing is copied from THP's site (SPEC rule 8), and hours change,
     3	// so patients are sent to THP's page for them.
     4	
     5	import { textFor } from "@/lib/text";
     6	
     7	const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";
     8	
     9	const linkStyle = "font-semibold text-brand underline underline-offset-2";
    10	
    11	function External({ href, children, newTab }: { href: string; children: string; newTab: string }) {
    12	  return (
    13	    <a href={href} target="_blank" rel="noopener noreferrer" className={linkStyle}>
    14	      {children}
    15	      <span className="sr-only"> {newTab}</span>
    16	    </a>
    17	  );
    18	}
    19	
    20	export function CareOptions({ language }: { language?: string }) {
    21	  const t = textFor(language);
    22	  const s = t.start;
    23	  return (
    24	    <section aria-labelledby="options-heading" className="space-y-3">
    25	      <h2 id="options-heading" className="text-xl font-bold">
    26	        {s.careHeading}
    27	      </h2>
    28	      <p>{s.careIntro}</p>
    29	      <ul className="list-disc space-y-2 ps-6 text-base">
    30	        <li>
    31	          {s.health811Before}{" "}
    32	          <a href="tel:811" className={linkStyle}>
    33	            811
    34	          </a>{" "}
    35	          {s.health811After}
    36	        </li>
    37	        <li>
    38	          <External href="https://www.regional-virtual-urgent-care.ca/" newTab={t.newTab}>
    39	            {s.virtualCare}
    40	          </External>
    41	        </li>
    42	        <li>{s.urgentCare}</li>
    43	        <li>{s.pharmacist}</li>
    44	      </ul>
    45	      <p>
    46	        {s.hoursBefore}{" "}
    47	        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
    48	          {s.hoursLink}
    49	        </External>
    50	        .
    51	      </p>
    52	      <p>
    53	        <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
    54	          {s.waitTimesLink}
    55	        </External>
    56	      </p>
    57	    </section>
    58	  );
    59	}
```

### components/start/StartVisit.tsx

```tsx
     1	"use client";
     2	
     3	// The start page's "Start a visit": choose a demo site; the visit takes the language chosen on
     4	// this phone (the menu at the top of the page). The server starts the visit and this phone remembers it, so the patient never types a code. If this phone already
     5	// has a visit, it shows that one first (open, ended or expired), and never offers a new one
     6	// while the saved visit cannot be read. While staff have paused off-site waiting at a site,
     7	// "Start a visit" for that site is replaced by the SPEC's paused message.
     8	
     9	import Link from "next/link";
    10	import { useRouter } from "next/navigation";
    11	import { useState, useSyncExternalStore } from "react";
    12	import { startVisitFromHome, usePatientView, type StartResult } from "@/data/patientVisit";
    13	import { loadSavedToken } from "@/data/savedToken";
    14	import { useSitePauses } from "@/data/sitePauses";
    15	import { startPageState } from "@/lib/startPage";
    16	import { fill, textFor } from "@/lib/text";
    17	import type { Site } from "@/lib/visit";
    18	import { Button } from "@/components/Button";
    19	
    20	const noSubscribe = () => () => {};
    21	
    22	const openLinkStyle =
    23	  "inline-block min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
    24	const boxStyle = "clean-card space-y-3";
    25	
    26	export function StartVisit({ language }: { language: string }) {
    27	  const router = useRouter();
    28	  const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
    29	  const saved = usePatientView(savedToken);
    30	  const [site, setSite] = useState<Site>("A");
    31	  const [problem, setProblem] = useState<Exclude<StartResult, "saved"> | null>(null);
    32	  const [starting, setStarting] = useState(false);
    33	  const [wantsNew, setWantsNew] = useState(false);
    34	  const { pauses } = useSitePauses();
    35	  const sitePaused = pauses?.[site] === true;
    36	  // Screen readers hear the paused message once when the chosen site becomes paused (live, or
    37	  // by choosing a paused site). The region below stays in place, so the words are read.
    38	  const [announced, setAnnounced] = useState("");
    39	  const [wasPaused, setWasPaused] = useState<boolean | null>(null);
    40	  if (pauses && sitePaused !== wasPaused) {
    41	    setWasPaused(sitePaused);
    42	    setAnnounced(wasPaused === false && sitePaused ? `${fill(textFor(language).siteName, { site })}: ${textFor(language).start.paused}` : "");
    43	  }
    44	  const state = startPageState(saved);
    45	  const t = textFor(language);
    46	  const s = t.start;
    47	
    48	  // What the patient is told when a visit could not be started.
    49	  const problemText = { paused: s.paused, busy: s.busy, not_saved: s.notSaved };
    50	  // What the start page says about a visit already saved on this phone, before any new one.
    51	  const savedNote = {
    52	    closed: { heading: s.closedHeading, text: s.closedText },
    53	    expired: { heading: s.expiredHeading, text: t.expiredText },
    54	  };
    55	
    56	  if (state === "loading") {
    57	    return <p>{s.checkingSaved}</p>;
    58	  }
    59	
    60	  if (state === "unavailable") {
    61	    return (
    62	      <section aria-labelledby="start-heading" className={boxStyle}>
    63	        <h2 id="start-heading" className="text-xl font-bold">
    64	          {s.unavailableHeading}
    65	        </h2>
    66	        <p>{s.unavailableText}</p>
    67	      </section>
    68	    );
    69	  }
    70	
    71	  if (saved && typeof saved === "object" && state === "open") {
    72	    return (
    73	      <section aria-labelledby="start-heading" className={boxStyle}>
    74	        <h2 id="start-heading" className="text-xl font-bold">
    75	          {s.openHeading}
    76	        </h2>
    77	        <p>
    78	          {t.visitCode}{" "}
    79	          <bdi>
    80	            <strong className="font-mono tracking-widest">{saved.code}</strong>
    81	          </bdi>{" "}
    82	          · <bdi>{fill(t.siteName, { site: saved.site })}</bdi>
    83	        </p>
    84	        <Link href="/patient" className={openLinkStyle}>
    85	          {s.openVisit}
    86	        </Link>
    87	      </section>
    88	    );
    89	  }
    90	
    91	  // An ended or expired visit is shown first; starting another demo visit is a separate choice.
    92	  const savedBox =
    93	    saved && typeof saved === "object" && (state === "closed" || state === "expired") ? (
    94	      <section aria-labelledby="saved-heading" className={boxStyle}>
    95	        <h2 id="saved-heading" className="text-xl font-bold">
    96	          {savedNote[state].heading}
    97	        </h2>
    98	        <p>
    99	          {t.visitCode}{" "}
   100	          <bdi>
   101	            <strong className="font-mono tracking-widest">{saved.code}</strong>
   102	          </bdi>{" "}
   103	          · <bdi>{fill(t.siteName, { site: saved.site })}</bdi>
   104	        </p>
   105	        <p>{savedNote[state].text}</p>
   106	        <Link href="/patient" className={openLinkStyle}>
   107	          {s.openVisit}
   108	        </Link>
   109	      </section>
   110	    ) : null;
   111	
   112	  if (savedBox && !wantsNew) {
   113	    return (
   114	      <div className="space-y-4">
   115	        {savedBox}
   116	        <Button variant="secondary" onClick={() => setWantsNew(true)}>
   117	          {s.startNew}
   118	        </Button>
   119	      </div>
   120	    );
   121	  }
   122	
   123	  const announcer = (
   124	    <p role="status" className="sr-only">
   125	      {announced}
   126	    </p>
   127	  );
   128	
   129	  // Both sites paused: no start box at all, only the message (the start route refuses anyway).
   130	  // The announcer comes first in both this and the start box, so it is the same element in both.
   131	  if (pauses?.A && pauses?.B) {
   132	    return (
   133	      <>
   134	        {announcer}
   135	        <section aria-labelledby="start-heading" className={boxStyle} data-testid="start-paused">
   136	          <h2 id="start-heading" className="text-xl font-bold">
   137	            {t.pausedHeading}
   138	          </h2>
   139	          <p>{s.paused}</p>
   140	        </section>
   141	      </>
   142	    );
   143	  }
   144	
   145	  const start = async () => {
   146	    if (starting) return; // a second tap while the first is on its way must not start two visits
   147	    setStarting(true);
   148	    setProblem(null);
   149	    const result = await startVisitFromHome(site, language);
   150	    if (result === "saved") {
   151	      router.push("/patient");
   152	      return; // stays "Starting…" until the patient screen opens
   153	    }
   154	    setStarting(false);
   155	    setProblem(result);
   156	  };
   157	
   158	  return (
   159	    <>
   160	      {announcer}
   161	      <section aria-labelledby="start-heading" className="clean-card space-y-4">
   162	        <h2 id="start-heading" className="text-xl font-bold">
   163	          {s.startHeading}
   164	        </h2>
   165	        <p>{s.startIntro}</p>
   166	        <fieldset>
   167	          <legend className="font-semibold">{s.siteQuestion}</legend>
   168	          <div className="mt-2 flex flex-wrap gap-3">
   169	            {(["A", "B"] as const).map((option) => (
   170	              <label
   171	                key={option}
   172	                className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-control px-4"
   173	              >
   174	                <input
   175	                  type="radio"
   176	                  name="site"
   177	                  className="size-5"
   178	                  checked={site === option}
   179	                  onChange={() => setSite(option)}
   180	                />
   181	                {fill(t.siteName, { site: option })}
   182	              </label>
   183	            ))}
   184	          </div>
   185	        </fieldset>
   186	        {sitePaused ? (
   187	          <p className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900" data-testid="site-paused">
   188	            {s.paused}
   189	          </p>
   190	        ) : (
   191	          <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
   192	            {starting ? s.starting : s.startButton}
   193	          </Button>
   194	        )}
   195	        {problem && (
   196	          <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
   197	            {problemText[problem]}
   198	          </p>
   199	        )}
   200	      </section>
   201	    </>
   202	  );
   203	}
```

### components/patient/VisitScreen.tsx

```tsx
     1	"use client";
     2	
     3	// The part of the patient page below the 911 line: "Loading…", the "could not load" box, the
     4	// no-visit or broken-link box, or the visit itself (code, status, sound box and announcer).
     5	// This part stays on the page when the screen changes, so it is the one that moves focus to the
     6	// new heading when the old screen left with focus inside it.
     7	
     8	import { useRef } from "react";
     9	import type { PatientView } from "@/lib/patientView";
    10	import { fill, textFor } from "@/lib/text";
    11	import { FocusBox } from "./FocusBox";
    12	import { StatusAndSound } from "./StatusAndSound";
    13	import { StatusAnnouncer } from "./StatusAnnouncer";
    14	import { useRescueFocus } from "./useFocusRescue";
    15	
    16	type Props = {
    17	  /** True until the link is read and the first answer for the visit comes in. */
    18	  loading: boolean;
    19	  /** The visit, null if the token opens no visit, or "unavailable" if it could not be read. */
    20	  result: PatientView | null | "unavailable" | undefined;
    21	  /** True when the link was broken or no longer opens a visit (for example after a new link). */
    22	  linkFailed: boolean;
    23	  token: string | null;
    24	  language: string;
    25	  onOnMyWay: () => void;
    26	  sending: boolean;
    27	  online: boolean;
    28	  /** True when "I'm on my way" could not be saved. */
    29	  notSaved: boolean;
    30	};
    31	
    32	type Screen = "loading" | "unavailable" | "none" | "visit";
    33	
    34	export function VisitScreen({ loading, result, linkFailed, token, language, onOnMyWay, sending, online, notSaved }: Props) {
    35	  const t = textFor(language);
    36	  const p = t.patient;
    37	  const view = result === "unavailable" ? null : result;
    38	  // True when the old screen left with focus inside it; then focus goes to the new heading.
    39	  const lostFocus = useRef(false);
    40	  const markLost = useRescueFocus("status-heading", lostFocus);
    41	
    42	  // Which of the 4 screens shows. "Loading…" comes first: while loading, result can be undefined.
    43	  const screen: Screen = loading ? "loading" : result === "unavailable" ? "unavailable" : !view ? "none" : "visit";
    44	
    45	  // A new screen gets a new box (the key), so the old box leaves and reports if it held focus.
    46	  return (
    47	    <FocusBox key={screen} onFocusLost={markLost} className="space-y-5">
    48	      {screen === "loading" && (
    49	        <p id="status-heading" tabIndex={-1}>
    50	          {p.loading}
    51	        </p>
    52	      )}
    53	      {screen === "unavailable" && (
    54	        <section aria-labelledby="status-heading" className="clean-card space-y-2">
    55	          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
    56	            {p.unavailableHeading}
    57	          </h2>
    58	          <p className="text-lg">{p.unavailableText}</p>
    59	        </section>
    60	      )}
    61	      {screen === "none" && (
    62	        <section aria-labelledby="status-heading" className="clean-card space-y-2">
    63	          <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
    64	            {linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
    65	          </h2>
    66	          {linkFailed && <p className="text-lg">{p.brokenLinkText}</p>}
    67	          <p className="text-lg">{p.findVisitHelp}</p>
    68	        </section>
    69	      )}
    70	      {screen === "visit" && view && (
    71	        <>
    72	          <p className="text-base">
    73	            {t.visitCode}:{" "}
    74	            <bdi>
    75	              <strong className="font-mono tracking-widest">{view.code}</strong>
    76	            </bdi>{" "}
    77	            · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
    78	          </p>
    79	          <StatusAndSound view={view} token={token} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
    80	          {notSaved && (
    81	            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
    82	              {p.notSaved}
    83	            </p>
    84	          )}
    85	          <StatusAnnouncer key={token} status={view.status} language={language} />
    86	        </>
    87	      )}
    88	    </FocusBox>
    89	  );
    90	}
```

### components/patient/PatientStatus.tsx

```tsx
     1	"use client";
     2	
     3	// The main part of the patient screen, which changes with the visit's status:
     4	// Waiting, Please head back now, Ready at the desk, and the states before and after those.
     5	
     6	import Link from "next/link";
     7	import { useRef, type RefObject } from "react";
     8	import type { PatientView } from "@/lib/patientView";
     9	import { textFor, type PatientText } from "@/lib/text";
    10	import { formatWaitRange } from "@/lib/waitText";
    11	import { Button } from "@/components/Button";
    12	import { CallReminder } from "./CallReminder";
    13	import { FocusBox } from "./FocusBox";
    14	import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
    15	
    16	type Props = {
    17	  view: PatientView;
    18	  language: string;
    19	  onOnMyWay: () => void;
    20	  sending: boolean;
    21	  /** Set to true by a part below (the sound box) that left the page with focus inside it. */
    22	  lostFocus?: RefObject<boolean>;
    23	};
    24	
    25	/** "I'm on my way". When it leaves the page with focus on it, it tells the status screen. */
    26	function OnMyWayButton({ onOnMyWay, sending, label, onFocusLost }: {
    27	  onOnMyWay: () => void;
    28	  sending: boolean;
    29	  label: string;
    30	  onFocusLost: () => void;
    31	}) {
    32	  const area = useRef<HTMLDivElement>(null);
    33	  useReportFocusOnLeave(area, onFocusLost);
    34	  return (
    35	    <div ref={area}>
    36	      <Button onClick={onOnMyWay} aria-disabled={sending} className="w-full text-lg">
    37	        {label}
    38	      </Button>
    39	    </div>
    40	  );
    41	}
    42	
    43	function Waiting({ view, language, t }: { view: PatientView; language: string; t: PatientText }) {
    44	  const p = t.patient;
    45	  return (
    46	    <section aria-labelledby="status-heading" className="clean-card space-y-3">
    47	      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
    48	        {p.waitingHeading}
    49	      </h2>
    50	      <p className="text-lg">
    51	        {p.placeInLine} <strong className="text-3xl">{view.placeInLine}</strong>
    52	      </p>
    53	      <p className="text-base">{p.placeCanChange}</p>
    54	      <p className="text-lg">
    55	        {p.waitLabel}{" "}
    56	        <strong>{view.waitLow !== null && view.waitHigh !== null && formatWaitRange(view.waitLow, view.waitHigh, language)}</strong>
    57	      </p>
    58	      <p className="text-sm text-slate-700">{p.simulated}</p>
    59	    </section>
    60	  );
    61	}
    62	
    63	function Called({ view, onOnMyWay, sending, t, onFocusLost }: Props & { t: PatientText; onFocusLost: () => void }) {
    64	  const p = t.patient;
    65	  const confirmed = view.status === "on_the_way";
    66	  return (
    67	    <section
    68	      aria-labelledby="status-heading"
    69	      className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
    70	    >
    71	      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold text-green-950">
    72	        {p.calledHeading}
    73	      </h2>
    74	      <p className="text-lg">{p.calledText}</p>
    75	      {!confirmed && <CallReminder view={view} t={t} />}
    76	      {confirmed ? (
    77	        <p className="text-lg font-semibold" data-testid="confirmed">
    78	          {p.confirmed}
    79	        </p>
    80	      ) : (
    81	        <OnMyWayButton
    82	          onOnMyWay={onOnMyWay}
    83	          sending={sending}
    84	          label={sending ? p.sending : p.onMyWay}
    85	          onFocusLost={onFocusLost}
    86	        />
    87	      )}
    88	    </section>
    89	  );
    90	}
    91	
    92	/** Heading and paragraphs for every status that has no place-in-line or call-back screen. */
    93	function otherStatus(status: PatientView["status"], t: PatientText): { heading: string; text: string[] } {
    94	  const p = t.patient;
    95	  switch (status) {
    96	    case "pre_arrival":
    97	      return { heading: p.fromHomeHeading, text: p.fromHomeText };
    98	    case "needs_reassessment":
    99	      return { heading: p.reassessHeading, text: [p.reassessText] };
   100	    case "arrived":
   101	      return { heading: p.arrivedHeading, text: [p.arrivedText] };
   102	    case "declined":
   103	    case "not_eligible":
   104	      return { heading: p.onsiteHeading, text: [p.onsiteText] };
   105	    case "unable_to_reach":
   106	      return { heading: p.endedHeading, text: [p.unableText] };
   107	    case "removed":
   108	      return { heading: p.endedHeading, text: [p.removedText] };
   109	    default:
   110	      return { heading: p.endedHeading, text: [p.endedText] };
   111	  }
   112	}
   113	
   114	function OtherStatus({ view, t }: { view: PatientView; t: PatientText }) {
   115	  const { heading, text } = otherStatus(view.status, t);
   116	  return (
   117	    <section aria-labelledby="status-heading" className="clean-card space-y-3">
   118	      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
   119	        {heading}
   120	      </h2>
   121	      {text.map((paragraph) => (
   122	        <p key={paragraph} className="text-lg">
   123	          {paragraph}
   124	        </p>
   125	      ))}
   126	    </section>
   127	  );
   128	}
   129	
   130	// A visit started from home that was never triaged within 6 hours: staff no longer expect it.
   131	function Expired({ t }: { t: PatientText }) {
   132	  const p = t.patient;
   133	  return (
   134	    <section aria-labelledby="status-heading" className="clean-card space-y-3">
   135	      <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
   136	        {p.expiredHeading}
   137	      </h2>
   138	      <p className="text-lg">{t.expiredText}</p>
   139	      <p className="text-lg">{p.expiredHelp}</p>
   140	      <p className="text-lg">
   141	        <Link href="/" className="font-semibold text-brand underline underline-offset-2">
   142	          {p.expiredNewVisit}
   143	        </Link>
   144	      </p>
   145	    </section>
   146	  );
   147	}
   148	
   149	export function PatientStatus({ view, language, onOnMyWay, sending, lostFocus }: Props) {
   150	  const t = textFor(language);
   151	  // The page's flag when it gives one (the sound box sets it too), otherwise this screen's own.
   152	  const ownFlag = useRef(false);
   153	  // A focused part that left with this change (for example "I'm on my way"): focus goes to the heading.
   154	  const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
   155	  const kind = viewKind(view);
   156	  // A new screen gets a new box (the key), so the old box leaves and tells this screen if it held focus.
   157	  return (
   158	    <FocusBox key={kind} onFocusLost={markLost}>
   159	      {kind === "expired" && <Expired t={t} />}
   160	      {kind === "waiting" && <Waiting view={view} language={language} t={t} />}
   161	      {kind === "called" && (
   162	        <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} onFocusLost={markLost} />
   163	      )}
   164	      {kind === "other" && <OtherStatus view={view} t={t} />}
   165	    </FocusBox>
   166	  );
   167	}
   168	
   169	/** Which screen the view shows. Called and on the way share one screen. */
   170	function viewKind(view: PatientView): "expired" | "waiting" | "called" | "other" {
   171	  if (view.expired) return "expired";
   172	  if (view.status === "waiting") return "waiting";
   173	  if (view.status === "called" || view.status === "on_the_way") return "called";
   174	  return "other";
   175	}
```

### components/patient/StatusAndSound.tsx

```tsx
     1	"use client";
     2	
     3	// The "I'm still here" prompt, the status screen and the sound box of the patient page, with the one
     4	// flag they share: when the prompt or the sound box leaves the page with focus inside it, the status
     5	// screen moves focus to its heading.
     6	// The page and the click test both use this part, so the test checks the real wiring.
     7	
     8	import { useRef } from "react";
     9	import type { PatientView } from "@/lib/patientView";
    10	import { PatientStatus } from "./PatientStatus";
    11	import { SoundSwitch } from "./SoundSwitch";
    12	import { StillHerePrompt } from "./StillHerePrompt";
    13	
    14	type Props = {
    15	  view: PatientView;
    16	  /** The visit's token, for the "I'm still here" tap (null: no prompt). */
    17	  token: string | null;
    18	  language: string;
    19	  onOnMyWay: () => void;
    20	  sending: boolean;
    21	  /** False when the phone is offline: a dashed frame then shows the status may be old. */
    22	  online: boolean;
    23	};
    24	
    25	export function StatusAndSound({ view, token, language, onOnMyWay, sending, online }: Props) {
    26	  // True when the prompt or the sound box left the page with focus inside it; the status screen then moves focus.
    27	  const lostFocus = useRef(false);
    28	  return (
    29	    <>
    30	      {token && view.status === "waiting" && (
    31	        <StillHerePrompt view={view} token={token} language={language} lostFocus={lostFocus} />
    32	      )}
    33	      {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
    34	      <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
    35	        <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
    36	      </div>
    37	      {(view.status === "waiting" || view.status === "called") && (
    38	        <SoundSwitch
    39	          status={view.status}
    40	          language={language}
    41	          onFocusLost={() => {
    42	            lostFocus.current = true;
    43	          }}
    44	        />
    45	      )}
    46	    </>
    47	  );
    48	}
```

### components/patient/StatusAnnouncer.tsx

```tsx
     1	"use client";
     2	
     3	// Tells screen readers about status changes only (never the wait range or countdowns):
     4	// an assertive message for the call-back, a polite one for everything else.
     5	
     6	import { useEffect, useRef, useState } from "react";
     7	import { textFor } from "@/lib/text";
     8	import type { VisitStatus } from "@/lib/visit";
     9	
    10	/** What is announced for each status change, in the visit's language. */
    11	function messageFor(status: VisitStatus, language: string): string {
    12	  const a = textFor(language).announce;
    13	  const messages: Partial<Record<VisitStatus, string>> = {
    14	    waiting: a.waiting,
    15	    declined: a.onsite,
    16	    not_eligible: a.onsite,
    17	    called: a.called,
    18	    on_the_way: a.onTheWay,
    19	    arrived: a.arrived,
    20	    removed: a.ended,
    21	    unable_to_reach: a.ended,
    22	    needs_reassessment: a.reassess,
    23	  };
    24	  return messages[status] ?? "";
    25	}
    26	
    27	/** One status change waiting to be announced. `round` makes every change new, even a repeat. */
    28	type Pending = { round: number; status: VisitStatus };
    29	
    30	export function StatusAnnouncer({ status, language }: { status: VisitStatus; language: string }) {
    31	  const [previous, setPrevious] = useState<VisitStatus | null>(null);
    32	  // A call-back already on screen when the page opens is announced; other opening statuses are not.
    33	  const [pending, setPending] = useState<Pending | null>(null);
    34	  const [polite, setPolite] = useState("");
    35	  const [urgent, setUrgent] = useState("");
    36	  const current = useRef(status);
    37	  useEffect(() => {
    38	    current.current = status;
    39	  }, [status]);
    40	
    41	  // On every status change, empty both regions at once. The new text is put in a moment later,
    42	  // so a screen reader hears it even when it is the same words as last time
    43	  // (for example called, arrived, then Undo back to called).
    44	  if (status !== previous) {
    45	    setPrevious(status);
    46	    setPolite("");
    47	    setUrgent("");
    48	    if (previous !== null || status === "called") {
    49	      setPending((p) => ({ round: (p?.round ?? 0) + 1, status }));
    50	    }
    51	  }
    52	
    53	  // Put the text in only while the page is on screen; a background tab waits until it is brought
    54	  // forward, then announces the status if it has not changed in the meantime.
    55	  useEffect(() => {
    56	    if (!pending) return;
    57	    const text = messageFor(pending.status, language);
    58	    if (!text) return;
    59	    let done = false;
    60	    const announce = () => {
    61	      if (done || document.visibilityState !== "visible" || current.current !== pending.status) return;
    62	      done = true;
    63	      if (pending.status === "called") setUrgent(text);
    64	      else setPolite(text);
    65	    };
    66	    const timer = window.setTimeout(announce, 300);
    67	    document.addEventListener("visibilitychange", announce);
    68	    return () => {
    69	      window.clearTimeout(timer);
    70	      document.removeEventListener("visibilitychange", announce);
    71	    };
    72	  }, [pending, language]);
    73	
    74	  return (
    75	    <>
    76	      <p aria-live="polite" className="sr-only">
    77	        {polite}
    78	      </p>
    79	      <p aria-live="assertive" className="sr-only">
    80	        {urgent}
    81	      </p>
    82	    </>
    83	  );
    84	}
```

### components/patient/StillHerePrompt.tsx

```tsx
     1	"use client";
     2	
     3	// The "I'm still here" prompt on the patient screen: shows 30 minutes after triage or after the
     4	// last tap, while waiting off-site (lib/stillHere.ts). The tap only tells staff the patient is
     5	// still following the visit; the screen says it is not a health check.
     6	
     7	import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
     8	import { recordStillHere } from "@/data/patientVisit";
     9	import type { PatientView } from "@/lib/patientView";
    10	import { stillHereState } from "@/lib/stillHere";
    11	import { textFor } from "@/lib/text";
    12	import { Button } from "@/components/Button";
    13	import { useNow } from "@/components/useNow";
    14	import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
    15	
    16	/** How long the thank-you stays after a tap. */
    17	const THANKS_MS = 5 * 60_000;
    18	
    19	type Props = {
    20	  view: PatientView;
    21	  token: string;
    22	  language: string;
    23	  /** The flag shared with the status screen, which stays on the page when this prompt leaves on a recall. */
    24	  lostFocus?: RefObject<boolean>;
    25	};
    26	
    27	export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
    28	  const now = useNow();
    29	  const [sending, setSending] = useState(false);
    30	  const [notSaved, setNotSaved] = useState(false);
    31	  const [announcement, setAnnouncement] = useState("");
    32	  const t = textFor(language);
    33	  const state = now ? stillHereState(view, now) : "not_due";
    34	  const showing = state !== "not_due";
    35	  // If the prompt leaves with focus inside it (after the tap), focus goes to the status heading.
    36	  // With the shared flag, the status screen also does this when the whole prompt leaves on a recall.
    37	  const ownFlag = useRef(false);
    38	  const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
    39	
    40	  // Tell screen readers once each time the prompt appears (politely; it is not urgent).
    41	  useEffect(() => {
    42	    if (!showing) return;
    43	    const timer = window.setTimeout(() => setAnnouncement(t.announce.stillHere), 300);
    44	    return () => {
    45	      window.clearTimeout(timer);
    46	      setAnnouncement("");
    47	    };
    48	  }, [showing, t.announce.stillHere]);
    49	
    50	  const tapped = view.lastStillHereAt ? new Date(view.lastStillHereAt).getTime() : null;
    51	  const thanking = !showing && now !== null && tapped !== null && now.getTime() - tapped < THANKS_MS;
    52	
    53	  async function onTap() {
    54	    if (sending) return;
    55	    setSending(true);
    56	    const result = await recordStillHere(token);
    57	    setSending(false);
    58	    setNotSaved(result === "not_saved");
    59	  }
    60	
    61	  return (
    62	    <>
    63	      <p aria-live="polite" className="sr-only">
    64	        {announcement}
    65	      </p>
    66	      {showing && (
    67	        <PromptCard onFocusLost={markLost}>
    68	          <h2 id="still-here-heading" className="text-xl font-bold">
    69	            {t.stillHere.heading}
    70	          </h2>
    71	          <p>{t.stillHere.meaning}</p>
    72	          <Button onClick={onTap} aria-disabled={sending} className="w-full text-lg">
    73	            {sending ? t.patient.sending : t.stillHere.button}
    74	          </Button>
    75	          {notSaved && (
    76	            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
    77	              {t.patient.notSaved}
    78	            </p>
    79	          )}
    80	        </PromptCard>
    81	      )}
    82	      {/* Always on the page, so screen readers hear the thank-you when its text comes in. */}
    83	      <p role="status" className={thanking ? "clean-card font-semibold" : undefined} data-testid="still-here-thanks">
    84	        {thanking ? `${t.stillHere.thanks} ${t.stillHere.meaning}` : ""}
    85	      </p>
    86	    </>
    87	  );
    88	}
    89	
    90	/** The prompt's box. It tells the prompt when it leaves the page with focus inside it. */
    91	function PromptCard({ onFocusLost, children }: { onFocusLost: () => void; children: ReactNode }) {
    92	  const box = useRef<HTMLElement>(null);
    93	  useReportFocusOnLeave(box, onFocusLost);
    94	  return (
    95	    <section
    96	      ref={box}
    97	      aria-labelledby="still-here-heading"
    98	      className="space-y-3 rounded-xl border-4 border-brand bg-card p-4"
    99	      data-testid="still-here"
   100	    >
   101	      {children}
   102	    </section>
   103	  );
   104	}
```

### components/patient/SoundSwitch.tsx

```tsx
     1	"use client";
     2	
     3	// The "Turn on sound" box on the patient screen. Sound and vibration play only while the visit is
     4	// called, the sound is turned on by a tap, and the page is open with the phone unlocked.
     5	
     6	import { useEffect, useRef, useState } from "react";
     7	import { Button } from "@/components/Button";
     8	import { ALERT_REPEAT_MS, STATUS_CLEAR_MS, type SoundState, shouldAlert, soundNote } from "@/lib/calledAlert";
     9	import { textFor } from "@/lib/text";
    10	import type { VisitStatus } from "@/lib/visit";
    11	import { playAlert, stopVibration, unlockSound } from "./alertSound";
    12	import { useReportFocusOnLeave } from "./useFocusRescue";
    13	import { focusIsOnNobody } from "./noFocus";
    14	
    15	/** Waits this many milliseconds (none when the number is 0 or less). */
    16	function waitMs(ms: number): Promise<void> {
    17	  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
    18	}
    19	
    20	/**
    21	 * True when moving focus takes it from nobody: focus is inside the sound box, or on the page body
    22	 * (after a phone tap, or because the focused "Sound is on" words just went away). False when the
    23	 * patient is on another button, such as "I'm still here", so a background beep failure leaves it there.
    24	 */
    25	function focusNearBox(box: HTMLElement | null): boolean {
    26	  if (focusIsOnNobody()) return true;
    27	  return box?.contains(document.activeElement) === true;
    28	}
    29	
    30	/**
    31	 * Asked when a repeat beep fails with no tap (the sound goes off while called), just before the
    32	 * "Sound is on" words go away. True: focus may move to "Turn on sound". False: focus stays where it is.
    33	 * On a phone, focus is on the page body after the patient taps plain text elsewhere on the page.
    34	 */
    35	function mayTakeFocusInBackground(box: HTMLElement | null): boolean {
    36	  // With no tap, focus on the page body means the patient is somewhere else on the page.
    37	  if (focusIsOnNobody()) return false;
    38	  return box?.contains(document.activeElement) === true;
    39	}
    40	
    41	type Props = {
    42	  status: VisitStatus;
    43	  language: string;
    44	  /** Called when the box leaves the page while focus is inside it, so the page can move focus. */
    45	  onFocusLost?: () => void;
    46	};
    47	
    48	export function SoundSwitch({ status, language, onFocusLost }: Props) {
    49	  const t = textFor(language).sound;
    50	  const [state, setState] = useState<SoundState>("off");
    51	  const soundOn = state === "on";
    52	  const onWords = useRef<HTMLParagraphElement>(null);
    53	  const turnOnButton = useRef<HTMLButtonElement>(null);
    54	  const box = useRef<HTMLDivElement>(null);
    55	  // Goes up by 1 on each "Turn on sound" and "Turn off sound" tap. A slow result that belongs to an
    56	  // earlier tap (a test beep, an unlock or a repeat beep) sees a different number and changes nothing.
    57	  const attempt = useRef(0);
    58	  // True while a tap on "Turn on sound" is still being handled. Stops a double tap from running twice.
    59	  const busy = useRef(false);
    60	  // The attempt number of a beep that still waits for the player (null when none), so the next beep of
    61	  // the same attempt does not start on top of it. A beep of an older attempt does not block a new one.
    62	  const beeping = useRef<number | null>(null);
    63	  // True when the last state shown was "on", so focus can move when the sound goes off.
    64	  const wasOn = useRef(false);
    65	  // Set by a repeat beep that failed in the background: may the box take focus? null after a tap.
    66	  const backgroundFocus = useRef<boolean | null>(null);
    67	  useReportFocusOnLeave(box, onFocusLost);
    68	
    69	  async function turnOn() {
    70	    if (busy.current) return;
    71	    busy.current = true;
    72	    // A tap gives its own answer for focus, so an old answer from a failed repeat beep must not stay.
    73	    backgroundFocus.current = null;
    74	    // Clear an old failed line first, so screen readers read it again if this try fails too.
    75	    const clearedAt = state === "failed" ? Date.now() : null;
    76	    setState("off");
    77	    const mine = ++attempt.current;
    78	    // Shows the failed line. After a cleared failed line, it first waits until the line has been
    79	    // empty for STATUS_CLEAR_MS. The wait comes after unlockSound(), which must run inside the tap.
    80	    const showFailed = async () => {
    81	      if (clearedAt !== null) await waitMs(STATUS_CLEAR_MS - (Date.now() - clearedAt));
    82	      if (mine === attempt.current) setState("failed");
    83	    };
    84	    try {
    85	      const ok = await unlockSound();
    86	      if (mine !== attempt.current) return;
    87	      if (!ok) {
    88	        await showFailed();
    89	        return;
    90	      }
    91	      setState("on");
    92	      // When the visit is already called, the effect below plays the alert, so no test beep is needed.
    93	      // If the test beep cannot play, say so now, not only when the patient is called.
    94	      // `beeping` is set before React runs the effect, so a status change to called does not beep twice.
    95	      if (status !== "called") {
    96	        beeping.current = mine;
    97	        const played = await playAlert(() => mine === attempt.current);
    98	        if (beeping.current === mine) beeping.current = null;
    99	        if (mine === attempt.current && !played) await showFailed();
   100	      }
   101	    } finally {
   102	      // After "Turn off sound" the next tap belongs to a new attempt, which turnOff() already freed.
   103	      if (mine === attempt.current) busy.current = false;
   104	    }
   105	  }
   106	
   107	  function turnOff() {
   108	    attempt.current += 1;
   109	    busy.current = false;
   110	    // A tap gives its own answer for focus, so an old answer from a failed repeat beep must not stay.
   111	    backgroundFocus.current = null;
   112	    setState("off");
   113	    stopVibration();
   114	  }
   115	
   116	  // Focus follows the change, so it never drops to the top of the page when a button goes away.
   117	  // On: move to the words "Sound is on" (read out when focused). From on to off, or to failed (a
   118	  // fast failure can skip "on" on screen): move to "Turn on sound", unless focus is somewhere else.
   119	  useEffect(() => {
   120	    if (state === "on") onWords.current?.focus();
   121	    else if ((wasOn.current || state === "failed") && (backgroundFocus.current ?? focusNearBox(box.current))) {
   122	      turnOnButton.current?.focus();
   123	    }
   124	    wasOn.current = state === "on";
   125	    backgroundFocus.current = null;
   126	  }, [state]);
   127	
   128	  // Play now if the rule allows it, then again every ALERT_REPEAT_MS, and when the page comes back on screen.
   129	  // If the phone will not play the beep, the box goes back to "off" so the page can say so.
   130	  useEffect(() => {
   131	    const tick = () => {
   132	      const mine = attempt.current;
   133	      if (beeping.current === mine || !shouldAlert(status, soundOn, document.visibilityState === "visible")) return;
   134	      beeping.current = mine;
   135	      // Still wanted: no tap since, and the page is still on screen. A beep stopped because the phone
   136	      // was locked is not a failure; the next visibilitychange tries again.
   137	      const wanted = () => mine === attempt.current && document.visibilityState === "visible";
   138	      void playAlert(wanted).then((ok) => {
   139	        if (beeping.current === mine) beeping.current = null;
   140	        if (!ok && wanted()) {
   141	          backgroundFocus.current = mayTakeFocusInBackground(box.current);
   142	          setState("off");
   143	        }
   144	      });
   145	    };
   146	    tick();
   147	    const timer = window.setInterval(tick, ALERT_REPEAT_MS);
   148	    document.addEventListener("visibilitychange", tick);
   149	    return () => {
   150	      window.clearInterval(timer);
   151	      document.removeEventListener("visibilitychange", tick);
   152	    };
   153	  }, [status, soundOn]);
   154	
   155	  // When the box leaves the page ("I'm on my way"), a beep that still waits must not play, and a
   156	  // vibration must stop.
   157	  useEffect(() => {
   158	    return () => {
   159	      attempt.current += 1;
   160	      stopVibration();
   161	    };
   162	  }, []);
   163	
   164	  const note = soundNote(status, state);
   165	
   166	  return (
   167	    <div ref={box} className="clean-card space-y-2">
   168	      <p className="text-base">{t.notice}</p>
   169	      {soundOn ? (
   170	        <>
   171	          <p ref={onWords} tabIndex={-1} className="font-semibold" data-testid="sound-on">
   172	            {t.on}
   173	          </p>
   174	          <Button variant="secondary" onClick={turnOff} className="w-full">
   175	            {t.turnOff}
   176	          </Button>
   177	        </>
   178	      ) : (
   179	        <Button ref={turnOnButton} variant="secondary" onClick={turnOn} className="w-full">
   180	          {t.turnOn}
   181	        </Button>
   182	      )}
   183	      {/* Always on the page, so screen readers read a line when it appears. "Sound is on" stays out (see above). */}
   184	      <div role="status">
   185	        {note === "failed" && <p data-testid="sound-failed">{t.failed}</p>}
   186	        {note === "offWhileCalled" && (
   187	          <p data-testid="sound-off-called" className="font-semibold">
   188	            {t.offWhileCalled}
   189	          </p>
   190	        )}
   191	      </div>
   192	    </div>
   193	  );
   194	}
```

### components/patient/alertSound.ts

```tsx
     1	// Plays the demo beep and vibration on the patient screen. iPhone Safari has no vibration for web pages, so only the beep plays there.
     2	
     3	import { BEEP_HZ, BEEP_SECONDS, BEEP_VOLUME } from "@/lib/calledAlert";
     4	
     5	/** The one shared sound player. It is made by unlockSound() after a tap, then reused. */
     6	let context: AudioContext | null = null;
     7	
     8	/** The longest time unlockSound() and playAlert() wait for the player to start, in milliseconds. */
     9	const RESUME_WAIT_MS = 1000;
    10	
    11	/** The browser's audio player class (Safari older versions use the webkit name). */
    12	function audioContextClass(): typeof AudioContext | undefined {
    13	  const webkitWindow = window as Window & { webkitAudioContext?: typeof AudioContext };
    14	  return window.AudioContext ?? webkitWindow.webkitAudioContext;
    15	}
    16	
    17	/** True when the player is running and can make sound. */
    18	function isRunning(ctx: AudioContext): boolean {
    19	  return ctx.state === "running";
    20	}
    21	
    22	/** Waits this many milliseconds, then finishes. */
    23	function waitAtMost(ms: number): Promise<void> {
    24	  return new Promise((resolve) => setTimeout(resolve, ms));
    25	}
    26	
    27	/**
    28	 * Call this inside a button's click. Browsers allow sound only after a tap.
    29	 * Gives true only when the sound player really started, false when the browser has no Web Audio or refused.
    30	 */
    31	export async function unlockSound(): Promise<boolean> {
    32	  try {
    33	    // A phone can close the player (for example when headphones change); then make a new one.
    34	    if (!context || context.state === "closed") {
    35	      const AudioClass = audioContextClass();
    36	      if (!AudioClass) return false;
    37	      context = new AudioClass();
    38	    }
    39	    // resume() is called during the tap (the browser allows sound then); the wait comes after.
    40	    // A player that never answers gives false after RESUME_WAIT_MS, so the box can say so.
    41	    const ctx = context;
    42	    await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]);
    43	    return isRunning(ctx);
    44	  } catch {
    45	    return false;
    46	  }
    47	}
    48	
    49	/**
    50	 * Plays one short beep (BEEP_HZ, BEEP_SECONDS long, at BEEP_VOLUME; see lib/calledAlert.ts) and a vibration where the phone allows it.
    51	 * Gives true when the beep played. Gives false when it did not play (no player, the player would not start,
    52	 * or `stillWanted` says no after the wait: the patient tapped "Turn off sound" or left the screen).
    53	 */
    54	export async function playAlert(stillWanted: () => boolean = () => true): Promise<boolean> {
    55	  try {
    56	    // Vibrate first, so the phone still vibrates when the beep cannot play.
    57	    vibrate();
    58	    if (!context) return false;
    59	    const ctx = context;
    60	    // iPhone can pause the player while the page is hidden; start it again before each beep.
    61	    if (!isRunning(ctx)) {
    62	      await Promise.race([ctx.resume(), waitAtMost(RESUME_WAIT_MS)]);
    63	      if (!isRunning(ctx) || !stillWanted()) return false;
    64	    }
    65	    const oscillator = ctx.createOscillator();
    66	    const gain = ctx.createGain();
    67	    const now = ctx.currentTime;
    68	    oscillator.type = "sine";
    69	    oscillator.frequency.value = BEEP_HZ;
    70	    // Start at BEEP_VOLUME and fade to almost silence at the end, so the beep does not click.
    71	    gain.gain.setValueAtTime(BEEP_VOLUME, now);
    72	    gain.gain.exponentialRampToValueAtTime(0.0001, now + BEEP_SECONDS);
    73	    oscillator.connect(gain);
    74	    gain.connect(ctx.destination);
    75	    oscillator.start(now);
    76	    oscillator.stop(now + BEEP_SECONDS);
    77	    return true;
    78	  } catch {
    79	    // Ignore sound and vibration errors. The on-screen words remain the real alert.
    80	    return false;
    81	  }
    82	}
    83	
    84	/**
    85	 * True after the phone started a vibration for vibrate(), until stopVibration() stops it. Before a tap
    86	 * the browser blocks every vibrate call with a console error, so stopVibration() calls only when needed.
    87	 */
    88	let vibrationStarted = false;
    89	
    90	/** One vibration pattern (200 ms on, 100 ms off, 200 ms on) where the phone allows it. */
    91	function vibrate(): void {
    92	  try {
    93	    if (typeof navigator.vibrate === "function") {
    94	      // The browser gives back false when it blocks the call; then no vibration started.
    95	      if (navigator.vibrate([200, 100, 200])) vibrationStarted = true;
    96	    }
    97	  } catch {
    98	    // Ignore: the on-screen words remain the real alert.
    99	  }
   100	}
   101	
   102	/** Stops a vibration that is running. Does nothing when no vibration started, or the phone has none. */
   103	export function stopVibration(): void {
   104	  if (!vibrationStarted) return;
   105	  vibrationStarted = false;
   106	  try {
   107	    navigator.vibrate?.(0);
   108	  } catch {
   109	    // Ignore: the on-screen words remain the real alert.
   110	  }
   111	}
```

### components/patient/CallReminder.tsx

```tsx
     1	"use client";
     2	
     3	// The extra message on the called screen when the patient has not tapped "I'm on my way":
     4	// a second alert 10 minutes after the call-back, then "Please return now" at 20 minutes
     5	// (lib/followUp.ts). Screen readers hear each one once, urgently.
     6	
     7	import { useEffect, useState } from "react";
     8	import { patientCallStep } from "@/lib/followUp";
     9	import type { PatientView } from "@/lib/patientView";
    10	import type { PatientText } from "@/lib/text";
    11	import { useNow } from "@/components/useNow";
    12	
    13	export function CallReminder({ view, t }: { view: PatientView; t: PatientText }) {
    14	  const now = useNow();
    15	  const step = now ? patientCallStep(view.status, view.calledAt, now) : "first";
    16	  const words =
    17	    step === "return_now" ? `${t.returnNow.lead} ${t.returnNow.text}` : step === "second_alert" ? t.secondAlert : "";
    18	  const spoken = step === "return_now" ? words : step === "second_alert" ? t.announce.secondAlert : "";
    19	  const [announcement, setAnnouncement] = useState("");
    20	
    21	  // Announce once each time the step changes (empty first, so a repeat is still heard).
    22	  useEffect(() => {
    23	    if (!spoken) return;
    24	    const timer = window.setTimeout(() => setAnnouncement(spoken), 300);
    25	    return () => {
    26	      window.clearTimeout(timer);
    27	      setAnnouncement("");
    28	    };
    29	  }, [spoken]);
    30	
    31	  return (
    32	    <>
    33	      <p aria-live="assertive" className="sr-only">
    34	        {announcement}
    35	      </p>
    36	      {words && (
    37	        <p
    38	          className="rounded-lg border-4 border-red-800 bg-white p-3 text-lg font-bold text-red-900"
    39	          data-testid={`call-reminder-${step}`}
    40	        >
    41	          {words}
    42	        </p>
    43	      )}
    44	    </>
    45	  );
    46	}
```

### components/patient/TextSizeSwitch.tsx

```tsx
     1	"use client";
     2	
     3	// The text size choice on patient screens (Normal, Large, Extra large). The choice is remembered
     4	// on this phone (data/savedTextSize.ts) and sets the font size of the whole page.
     5	
     6	import { useEffect } from "react";
     7	import { chooseTextSize, useChosenTextSize } from "@/data/savedTextSize";
     8	import { textFor } from "@/lib/text";
     9	import { rootFontSize, TEXT_SIZES, type TextSize } from "@/lib/textSize";
    10	
    11	export function TextSizeSwitch({ language }: { language: string }) {
    12	  const t = textFor(language).textSize;
    13	  const size = useChosenTextSize();
    14	  const words: Record<TextSize, string> = { normal: t.normal, large: t.large, extraLarge: t.extraLarge };
    15	
    16	  // Grow the whole page. Put it back when this screen closes, so staff screens in the same tab are not affected.
    17	  useEffect(() => {
    18	    document.documentElement.style.fontSize = rootFontSize(size);
    19	    return () => {
    20	      document.documentElement.style.fontSize = "";
    21	    };
    22	  }, [size]);
    23	
    24	  return (
    25	    <fieldset className="space-y-2">
    26	      <legend className="font-semibold">{t.label}</legend>
    27	      <div className="flex flex-wrap gap-2">
    28	        {TEXT_SIZES.map((option) => {
    29	          const checked = option === size;
    30	          return (
    31	            <label
    32	              key={option}
    33	              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border-control bg-card px-3 ${
    34	                checked ? "border-4 font-bold" : "border-2"
    35	              }`}
    36	            >
    37	              <input
    38	                type="radio"
    39	                name="text-size"
    40	                value={option}
    41	                checked={checked}
    42	                onChange={() => chooseTextSize(option)}
    43	                className="h-5 w-5 shrink-0"
    44	              />
    45	              <span>{words[option]}</span>
    46	            </label>
    47	          );
    48	        })}
    49	      </div>
    50	    </fieldset>
    51	  );
    52	}
```

### components/patient/OfflineBanner.tsx

```tsx
     1	"use client";
     2	
     3	// The offline notice on the patient screen. It shows only while the phone has no internet connection,
     4	// and it uses words plus a thick border, not colour alone (SPEC rule 9).
     5	
     6	import { useOnline } from "@/data/useOnline";
     7	import { textFor } from "@/lib/text";
     8	
     9	export function OfflineBanner({ language }: { language: string }) {
    10	  const online = useOnline();
    11	  // The live region is always on the page, so screen readers (VoiceOver on iPhone) announce the text
    12	  // when it appears. Only the styled box is added while offline.
    13	  return (
    14	    <div role="status">
    15	      {!online && (
    16	        <p className="rounded-lg border-4 border-black bg-amber-300 p-3 text-base font-bold text-black">
    17	          {textFor(language).offline}
    18	        </p>
    19	      )}
    20	    </div>
    21	  );
    22	}
```

## Response

Gemini Hydrogen 4, High, 2026-11-17. Pasted by the owner. Blank lines are shortened; the text is not changed.

### 1. Who is left out or put at a disadvantage?

1. No smartphone or a shared phone
   - File and line: `app/patient/page.tsx` lines 31-43; `components/start/StartVisit.tsx` lines 71-89.
   - What goes wrong and for whom: Patients without a phone can wait on-site (`declined` in `PatientStatus.tsx` line 102), which works. However, for families or caregivers sharing one phone (e.g., a parent and child, or an older adult using a relative's phone), the browser stores only a single visit token in `localStorage`. Scanning a second patient's QR link in the same tab overwrites the first person's saved visit (`takeTokenFromLink` on `app/patient/page.tsx` line 33), and `/` blocks starting a second visit while one is open (`StartVisit.tsx` lines 71-89).
   - Severity: Medium.
   - Smallest fix: When an open visit is already saved on `/` (`StartVisit.tsx` lines 71-89), add a secondary link/button to start or open another visit in a new tab instead of hiding the start form completely.
2. Little mobile data
   - File and line: `app/patient/page.tsx` line 45; `components/start/StartVisit.tsx` line 34; `components/start/CareOptions.tsx` lines 38-56.
   - What goes wrong and for whom: Patients on prepaid or tiny mobile data plans keep `usePatientView` and `useSitePauses` polling in the background even when the browser tab is hidden, and `CareOptions.tsx` links directly to external hospital websites (`thp.ca`, `regional-virtual-urgent-care.ca`) with no warning that opening them loads heavy external pages.
   - Severity: Low.
   - Smallest fix: Pause or slow background polling when `document.visibilityState === "hidden"` and add `"(external site)"` to `t.newTab` in `lib/text/en.ts` line 18.
3. No data plan in the waiting area (offline or captive-portal Wi-Fi)
   - File and line: `components/patient/OfflineBanner.tsx` lines 9-21; `components/patient/StatusAndSound.tsx` lines 34-36; `components/patient/PatientStatus.tsx` lines 43-60.
   - What goes wrong and for whom: Patients without cellular data who connect to hospital guest Wi-Fi behind a captive-portal login screen stay `navigator.onLine === true`, so `OfflineBanner` never appears until the database request fails into `result === "unavailable"` (`VisitScreen.tsx` line 53). When `OfflineBanner` does show (`!online`), the stale queue position (`"Your place in line: ..."`) remains at 100% visual contrast directly below it (`StatusAndSound.tsx` line 34), which can mislead a patient into thinking they still have a long wait after they have already been recalled.
   - Severity: High.
   - Smallest fix: Add `opacity-60` to the `PatientStatus` wrapper in `StatusAndSound.tsx` line 34 whenever `!online` so the stale status looks visibly paused while keeping the visit code readable.
4. Low literacy
   - File and line: `lib/text/en.ts` lines 25, 34-35, 69, 80, 91, 93, 98, 100, 104-105, 110, 112, 116, 145, 150, 180; `components/patient/PatientStatus.tsx` lines 43-128.
   - What goes wrong and for whom: Patients with lower reading literacy face hospital jargon (`triaged`, `off-site`, `THP`, `QR code`, `simulated`), idiomatic phrases (`head back`, `following your visit`), and dense unnumbered paragraphs on `pre_arrival` (`en.ts` lines 101-106) without step numbers or visual status icons.
   - Severity: Medium.
   - Smallest fix: Rewrite the non-SPEC strings in `lib/text/en.ts` to Grade 6 plain language (listed in Question 2) and render `fromHomeText` (`PatientStatus.tsx` lines 121-125) as a numbered list (`<ol>`).
5. Low vision
   - File and line: `lib/textSize.ts` lines 10-14 and 34; `components/patient/TextSizeSwitch.tsx` lines 17-22; `components/start/StartPageBody.tsx` lines 23-33; `components/start/CareOptions.tsx` lines 38-40 and 52-56.
   - What goes wrong and for whom: Low-vision patients are capped at 150% text (`extraLarge: "150%"` in `lib/textSize.ts` line 13) instead of the spec's 200% target, and have no text-size control at all on the `/` start page (`StartPageBody.tsx`), which actively resets `document.documentElement.style.fontSize` back to 100% (`lib/textSize.ts` line 34; `TextSizeSwitch.tsx` line 20). In addition, standalone links in `CareOptions.tsx` lines 38 and 53 are single-line inline `<a>` elements under 24 CSS pixels tall at normal size.
   - Severity: High.
   - Smallest fix: Change `extraLarge` in `lib/textSize.ts` line 13 to `"200%"`, remove the `/patient`-only path guard on line 34, and render `<TextSizeSwitch language="{language}"/>` in `StartPageBody.tsx`.
6. Blind screen-reader users
   - File and line: `components/patient/StatusAnnouncer.tsx` lines 11-25, 44-51, and 55-72; `components/patient/VisitScreen.tsx` lines 48-52; `components/LanguageSwitch.tsx` lines 30-34; `components/patient/SoundSwitch.tsx` lines 119-126 and 184-191.
   - What goes wrong and for whom: Blind screen-reader users receive no announcement when a visit expires (`view.expired` flips to `true` while `view.status` stays `"waiting"`), hear `StatusAnnouncer` collide with `#status-heading` focus rescue 300 ms later, hear old status announcements replay if they switch languages (`[pending, language]` on `StatusAnnouncer.tsx` line 72), hear no spoken notice when `draftNotice` appears in `LanguageSwitch.tsx` line 31, and have `SoundSwitch`'s `role="status"` text cut off when focus jumps to `"Turn on sound"`.
   - Severity: High.
   - Smallest fix: Announce `expired` in `StatusAnnouncer.tsx`, clear `pending` after announcing so language changes do not replay old alerts, and add `role="status"` to `draftNotice` in `LanguageSwitch.tsx` line 31.
7. Deaf and hard-of-hearing users
   - File and line: `components/patient/SoundSwitch.tsx` lines 166-192; `components/patient/alertSound.ts` lines 1 and 91-100; `lib/text/en.ts` lines 157-164.
   - What goes wrong and for whom: iPhone Safari does not support `navigator.vibrate`, so Deaf or hard-of-hearing iPhone users who tap `"Turn on sound"` see `"Sound is on"` with no warning that their phone will not vibrate (`alertSound.ts` lines 1 and 93). If they put the phone in a pocket or face-down expecting vibration, they will miss the recall. There is also no `document.title` alert change when `status === "called"` for users watching a browser tab.
   - Severity: High.
   - Smallest fix: Check `typeof navigator.vibrate === "function"` in `SoundSwitch.tsx` and show `"This phone cannot vibrate. Keep this screen where you can see it."` when `soundOn` is true on devices without vibration.
8. Cognitive or memory disabilities
   - File and line: `app/patient/page.tsx` lines 49-53; `components/patient/VisitScreen.tsx` lines 61-69; `lib/text/en.ts` lines 77-80 and 100-106.
   - What goes wrong and for whom: When staff issue a new link or close a visit link (`deadToken === true`), `app/patient/page.tsx` line 53 merges `deadToken` with `brokenLink` (`linkFailed = brokenLink || deadToken`), showing `"This link did not work - The link might be wrong or cut short."` A patient with memory difficulties who opens their saved bookmark sees an error blaming a mistyped link instead of explaining that the visit link ended and to check with the desk.
   - Severity: Medium.
   - Smallest fix: Give `deadToken` its own heading and message in `VisitScreen.tsx` lines 63-67 (`"This visit link is no longer active. Please ask the emergency department desk."`) instead of reusing `brokenLinkHeading`.
9. Older adults
   - File and line: `components/start/StartPageBody.tsx` lines 19-46; `components/patient/SoundSwitch.tsx` lines 131-145; `lib/text/en.ts` lines 34-35 and 79-80.
   - What goes wrong and for whom: Older adults face default 100% text on `/` with no `TextSizeSwitch`, unexplained terms (`QR code`, `THP`), small standalone links in `CareOptions.tsx`, and silent audio deactivation on iPhones if they lock the screen or switch apps and return (`SoundSwitch.tsx` lines 138-143 resets `state` to `"off"` with generic `offWhileCalled` text that does not explain locking the phone turned sound off).
   - Severity: Medium.
   - Smallest fix: Add `TextSizeSwitch` to `StartPageBody.tsx`, explain `"QR code"` in `en.ts` line 80 (`"square code (QR code) on your paper slip"`), and distinguish lock/background audio reset from never turning sound on.
10. Patients whose language is not one of the five
    - File and line: `lib/text/languages.ts` lines 15-28 and 49-53; `components/LanguageSwitch.tsx` lines 11-36.
    - What goes wrong and for whom: Patients who read Spanish, Punjabi, Tagalog, Tamil, Portuguese, Vietnamese, Korean, or any language outside `en`/`fr`/`ur`/`ar`/`zh` see English with no message explaining that only five languages are available in the app and no mention of free hospital interpreter services at the desk or via Health811.
    - Severity: High.
    - Smallest fix: Add a permanent helper line below `<select>` in `LanguageSwitch.tsx` (and in `lib/text/en.ts`): `"Need another language? Ask the emergency department desk for a free interpreter, or wait inside."`
11. Patients with a phone set to a language the app does not have (or a supported non-English language)
    - File and line: `lib/text/languages.ts` lines 49-53; `components/start/StartPageBody.tsx` line 20; `app/patient/page.tsx` line 57.
    - What goes wrong and for whom: The app never reads `navigator.languages` or `navigator.language`. A patient whose phone OS is set to an unsupported language (e.g., Punjabi `pa` or Spanish `es`) lands on an English screen with no indication that their phone language is unsupported, and even a patient whose phone OS is set to French, Urdu, Arabic, or Mandarin starts in English on `/` until they spot the English `"Select language"` menu (`StartPageBody.tsx` line 20).
    - Severity: Medium.
    - Smallest fix: When `useChosenLanguage()` is `null` (no manual choice saved yet), match `navigator.languages` against `LANGUAGE_CODES` to pre-select a supported language, and if none matches, show an interpreter/unsupported-language notice under `LanguageSwitch`.

### 2. Plain language (`lib/text/en.ts`)

All SPEC fixed sentences from the hard rules (`emergencyLine`, `footer`, `start.emergencyCheck`, `start.urgentCare`, `start.pharmacist`, `start.startIntro`'s triage sentence, `start.paused`, `patient.placeCanChange`, `patient.waitLabel`, `patient.fromHomeText[0]`, `returnNow.text`, `survey.question`) are kept unchanged.

Safety sentences first:

1. `patient.calledHeading` (line 93). Current: "Please head back now". Why: "head back" is an English idiom that is harder for low-literacy and non-native readers than "come back" (used in `emergencyLine` on line 12). Simpler: "Please come back now".
2. `announce.called` (line 126). Current: "You have been called back. Please head back to the emergency department now." Why: "called back" can be misread as a phone call rather than being called to the desk, and "head back" is idiomatic. Simpler: "It is your turn. Please come back to the emergency department now."
3. `secondAlert` (line 150). Current: "Please return to the emergency department right now. Staff may try to reach you." Why: "try to reach you" is vague; a patient may not know whether staff will call their phone or look for them in the lobby. Simpler: "Please come back to the emergency department right now. Staff may call your phone."
4. `patient.fromHomeHeading` (line 100). Current: "Status: Started from home, not yet triaged". Why: "triaged" is medical jargon above a Grade 6 reading level. Simpler: "Status: Started from home, not seen by a nurse yet".
5. `patient.fromHomeText[1]` and `[2]` (lines 104-105). Current: "This app does not register you or give permission to wait off-site." / "If you go to the emergency department, follow its normal steps. Show this visit code to staff. Only staff can approve off-site waiting." Why: "register you" can be read as registering for an app account rather than hospital check-in; "off-site" is jargon; "follow its normal steps" is vague. Simpler: "This app does not check you in at the hospital or let you wait away from the hospital." / "When you get to the emergency department, check in at the front desk and show this visit code. Only staff can let you wait away from the hospital."
6. `patient.reassessHeading` and `reassessText` (lines 107-108). Current: "Please go to the triage desk" / "A nurse needs to check you again. This happens before you rejoin the line." Why: "triage desk" and "rejoin" are harder than everyday words, and "This happens before..." is wordy. Simpler: "Please go to the nurse check-in desk" / "A nurse needs to check you again before you go back in line."
7. `patient.notSaved` (line 98). Current: "Your answer did not save. Staff do not know you tapped it. Please try again or go to the desk." Why: "tapped it" has an unclear pronoun. Simpler: "Your answer did not save. Staff do not know you are on your way. Please try again or go to the desk."

Other patient sentences:

8. `start.careIntro` (line 25). Current: "This demo cannot choose a service for you. Check the rules and hours on each site before you go." Why: "each site" can be read as each hospital location or each linked website. Simpler: "... on each website before you go."
9. `start.hoursLink` and `start.waitTimesLink` (lines 34-35). Current: "THP's emergency page" / "See current wait times on THP's website". Why: "THP" is an unexplained abbreviation. Simpler: "Trillium Health Partners' emergency page" / "See current wait times on Trillium Health Partners' website".
10. `start.unavailableText` (line 52). Current: "Your saved visit will not load right now. You cannot start a new one here. If you need care, please go to the emergency department desk." Why: "here" can mean on this phone or at this hospital. Simpler: "... You cannot start a new visit on this phone. ..."
11. `start.closedText` (line 57). Current: "Off-site waiting is over for this visit. You might still be waiting at the hospital. Open your visit to check." Why: sounds contradictory to a patient at home. Simpler: "Waiting away from the hospital is over for this visit. Your visit might still be open inside the hospital. Open your visit to check."
12. `expiredText` (line 69). Current: "You started this visit over 6 hours ago. It was never checked in at triage. Staff no longer expect you to arrive." Why: passive voice and "triage". Simpler: "You started this visit over 6 hours ago. A nurse never checked you in. Staff no longer expect you to arrive."
13. `patient.findVisitHelp` (line 80). Current: "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again." Why: "QR code" is jargon, and "your slip" assumes a printed slip. Simpler: "Scan the square code (QR code) on your paper slip, or type the link printed under it. If you have no slip or it still fails, ask the desk to show the code again."
14. `patient.simulated` (line 91). Current: "This estimate is simulated for the demo." Why: "simulated" is above Grade 6. Simpler: "This wait time is a fake example for the demo."
15. `patient.arrivedHeading` (line 109). Current: "Status: Ready at the desk". Why: can be read two ways. Simpler: "Status: Checked in at the desk".
16. `patient.onsiteText` and `announce.onsite` (lines 112 and 134). Current: "... Staff will call you when they are ready." Why: "call you" can mean a phone call. Simpler: "... Staff will call your name when it is your turn."
17. `patient.unableText` and `patient.removedText` (lines 116 and 118). Current: "Staff could not reach you, so this visit has left the off-site line. ..." / "Staff have ended off-site waiting for this visit. ..." Why: personifies "this visit" and uses "off-site". Simpler: "Staff could not reach you, so you are no longer in line. ..." / "Staff ended your wait away from the hospital. ..."
18. `stillHere.heading` (line 145). Current: "Are you still following your visit?" Why: abstract. Simpler: "Are you still waiting for your turn?"
19. `language.draftNotice` (line 169). Current: "This translation is a draft. A fluent speaker has not checked it yet." Why: "draft" and "fluent speaker" are harder. Simpler: "This translation is not checked yet. It may have mistakes."
20. `offline` (line 180). Current: "You are offline. Reconnect to the internet to see your status." Why: "Reconnect" is above Grade 6. Simpler: "You have no internet. Connect to the internet to see your place in line."

### 3. Draft language notice

1. Draft notice appears silently without a screen-reader live region. `components/LanguageSwitch.tsx` lines 30-34. When a screen-reader user selects French, Urdu, Arabic, or Mandarin, the `draft-notice` `<p>` mounts with no `role="status"` or `aria-live="polite"`. Severity: Medium. Fix: wrap the conditional `<p>` in a persistent `<div role="status">`.
2. Fairness and trust: the draft warning is shown only in the unverified translation itself, with no English reference or human-help fallback. `components/LanguageSwitch.tsx` lines 30-34; `lib/text/en.ts` line 169. It undermines trust in the 911 line and recall instructions, and offers no way to compare the English wording or ask for an interpreter. The `<option>` labels (`menuLabel`, `lib/text/languages.ts` lines 31-33) do not note "(draft)" before selection. Severity: High. Fix: append a short English fallback and interpreter cue ("Unchecked draft translation - ask the desk for an interpreter if anything is unclear.") and show draft status in `menuLabel`.
3. Phone language not one of the five is silently ignored. `lib/text/languages.ts` lines 26-28 and 49-53; `components/start/StartPageBody.tsx` line 20; `app/patient/page.tsx` line 57. Severity: High. Fix: check `navigator.languages` when `chosenOnPhone` is `null`; if outside `LANGUAGE_CODES`, show a notice that only five languages are available and to ask the desk for a free interpreter.

### 4. Screen readers

1. `view.expired` changing to `true` is never announced. `StatusAnnouncer.tsx` lines 30 and 44-51; `VisitScreen.tsx` line 85. Severity: High. Fix: pass `expired` (or an effective status) into `StatusAnnouncer` and add an `expired` announcement string.
2. Switching languages re-announces the previous status change. `StatusAnnouncer.tsx` lines 55-72: `pending` is never cleared and `language` is in the effect dependencies. Severity: Medium. Fix: `setPending(null)` after announcing, or do not re-trigger on language once done for that round.
3. `#status-heading` focus rescue collides with the 300 ms live-region update. `PatientStatus.tsx` line 154; `VisitScreen.tsx` line 40; `StatusAnnouncer.tsx` line 66. Severity: Medium. Fix: suppress the announcement when `document.activeElement?.id === "status-heading"`.
4. Focusing `<p id="status-heading" tabIndex={-1}>` during `loading` gives a double focus jump on same-tab link changes. `VisitScreen.tsx` lines 48-52. Severity: Low. Fix: remove the id from the loading `<p>` and keep `lostFocus` pending until a real heading mounts.
5. Status changes inside `OtherStatus` do not rescue focus, and `StillHerePrompt` runs `useRescueFocus` on every clock tick. `PatientStatus.tsx` lines 158 and 170-175; `StillHerePrompt.tsx` lines 28 and 37-38. Severity: Low. Fix: key `FocusBox` by `${view.expired}-${view.status}` and pass an `onFocusLost` callback to `StillHerePrompt`.

### 5. Alerts

1. Deaf and hard-of-hearing iPhone users see "Sound is on" with no warning that iOS cannot vibrate. `SoundSwitch.tsx` lines 169-177; `alertSound.ts` lines 1 and 91-100. `sound.notice` says "It also vibrates if your phone allows it". Severity: High. Fix: when `typeof navigator.vibrate !== "function"`, show "Vibration is not available on this phone. Keep this screen in sight." under "Sound is on".
2. Locked or backgrounded iPhones suspend `AudioContext` while `waiting`, leaving a false "Sound is on" state. `SoundSwitch.tsx` lines 131-153; `alertSound.ts` lines 54-65. When `called` later arrives, `ctx.resume()` fails without a gesture, so the first beep fails and sound flips off. Severity: High. Fix: listen to `onstatechange` and `visibilitychange`; if the context becomes `interrupted` or `suspended` while hidden, reset to `off` and tell the patient to tap "Turn on sound" again.
3. `SoundSwitch` focus jump cuts off its own `role="status"` text (`failed` and `offWhileCalled`). `SoundSwitch.tsx` lines 119-126 and 184-191. Severity: Medium. Fix: give the status `div` an id and link `aria-describedby` from the button to it when `note` is not null.
4. Colour-only meaning: no problem found.

### 6. Text size, right-to-left and layout

1. Text size control caps at 150%, and is missing from `/`. `lib/textSize.ts` lines 10-14 and 34; `TextSizeSwitch.tsx` lines 17-22; `StartPageBody.tsx` lines 23-33. Severity: High. Fix: `extraLarge: "200%"`, remove the `/patient` path guard, render `TextSizeSwitch` on `/`.
2. `dir` and `lang` are on `<main>`, not `<html>`, leaving the footer, `<title>` and browser chrome LTR and English for Urdu and Arabic. `app/patient/page.tsx` line 95; `StartPageBody.tsx` line 23. Severity: Medium. Fix: set `document.documentElement.dir` and `.lang` in an effect when the language changes.
3. Unisolated `formatWaitRange` digits inside RTL paragraphs. `PatientStatus.tsx` lines 54-57. Severity: Low. Fix: wrap it in `<bdi>`.
4. Standalone links in `CareOptions.tsx` (lines 9, 38-40, 52-56) are under 24 by 24 CSS pixels. Severity: Medium. Fix: add `inline-block py-1` to `linkStyle`.
5. Keyboard focus order puts the settings above the visit content on `/patient`. `app/patient/page.tsx` lines 96-102; `StatusAndSound.tsx` lines 30-36. Severity: Low. Fix: put the status above the switches, or move `TextSizeSwitch` below the status card.

### 7. Anything else

1. Replaced visit links (`deadToken`) show the "broken link" message. `app/patient/page.tsx` lines 49-53; `VisitScreen.tsx` lines 61-69. Severity: Medium. Fix: pass `deadToken` on its own and show "This visit link is no longer active. Please check with the emergency department desk."
2. `onOnMyWay` lacks `try / finally` around `setSending(false)`. `app/patient/page.tsx` lines 82-91. If `recordSeen(token)` throws, the button stays on "Sending...". Severity: Medium. Fix: `try { ... } finally { setSending(false); }`.
3. `StartVisit.tsx` does not announce a pause that is already on at first load. Lines 39-43 and 131-143 (`wasPaused === false && sitePaused`). Severity: Low. Fix: announce when `wasPaused !== true && sitePaused`, or when both sites are paused.
4. Empty `<p role="status">` in `StillHerePrompt.tsx` line 83 adds blank space under `space-y-5`. Severity: Low. Fix: `className={thanking ? "clean-card font-semibold" : "sr-only"}`.
5. Demo links (`Staff screen`, `Patient screen`, `Dashboard`) sit right under the 911 line on `/`. `StartPageBody.tsx` lines 33-44. Severity: Low. Fix: a visible "Demo navigation (testing only)" label, or move them into the footer.

## Claude's check

Claude, 2026-11-17. Each point was read against the code on `phase3-review-fixes` at `ce585ee`. "Real" means the code does what Gemini says. "Not real" means the code already does something else. "Product decision" means the owner chooses.

### Gemini made these errors

- 1.5 and 6.1 say the 150% cap breaks "the spec's 200% target". SPEC.md line 43 asks that the layout works when the user enlarges text to 200% "in the browser or phone settings". It does not ask for a 200% choice in the app. The WCAG check on 2026-11-17 used 200% root text and found no fault on `/` and `/patient`. The 150% top size is a decision (docs/decisions.md line 12). A 200% choice is a product decision, not a fault.
- 1.3 says the old status stays at full contrast when offline. `components/patient/StatusAndSound.tsx` line 34 already puts a dashed frame around the status when `online` is false, and the banner is above it. The captive portal case is accepted (docs/known-issues.md line 12). Not real.
- 2.1 and 2.15 rewrite "Please head back now" and "Ready at the desk". SPEC.md line 60 fixes these status words. They stay. Gemini's list of fixed sentences missed this line.
- 7.2 says `onOnMyWay` can stay on "Sending..." if `recordSeen` throws. `recordSeen` and `confirmOnMyWayByToken` both go through `patientStep` in `data/patientVisit.ts` (line 141), which catches every error and gives back `not_saved`. Neither call can throw. Not real. A `try / finally` would be only a guard.

### Real, code fixes (no wording choice)

- 4.1: `StatusAnnouncer` gets `view.status` only (`VisitScreen.tsx` line 85). When `expired` becomes true at 6 hours, the status stays `waiting`, so nothing is announced. Real, Medium.
- 4.2: `pending` is never cleared and `language` is in the effect deps (`StatusAnnouncer.tsx` line 72). A language change runs the effect again and says the last status again, in the new language. Real, Low. It can be helpful (the patient hears the status in the new language), but an old call-back message said again is wrong if the status is still `called` only by chance.
- 3.1: the draft notice (`LanguageSwitch.tsx` line 30) has no live region. Real, Medium. Fix: an always-present `role="status"` wrapper (known-issues line 27).
- 6.2: `lang` and `dir` are on `<main>` only. `<html lang="en">` is fixed in `app/layout.tsx` line 22, so the footer and the page title stay English and left-to-right. Real, Low.
- 6.4: `CareOptions.tsx` line 9 links are inline with no padding. Inline links in a sentence are an exception in WCAG 2.5.8, but the stand-alone links are not. Real, Medium. Fix: `inline-block py-1` (to measure in the browser).
- 7.4: the empty `role="status"` in `StillHerePrompt.tsx` line 83 adds a gap. Real, Low.
- 4.3, 4.4, 4.5, 5.3, 7.3: plausible. Not checked yet. Each gets a test that must fail first before any fix.

### Real, product or wording decisions (owner)

- 1.7 and 5.1: iPhone Safari has no `navigator.vibrate`. The `sound.notice` text says "It also vibrates if your phone allows it", which is true but easy to miss. A notice that shows only on phones with no vibration is a new text in 5 languages.
- 1.8 and 7.1: a replaced or closed link (`deadToken`) shows "This link did not work" (`app/patient/page.tsx` line 53). The text blames the link, not the change by staff. A new message is new text in 5 languages.
- 1.10 and 3.3: no line tells a patient with another language to ask for an interpreter. New text.
- 1.5, 1.9, 6.1: a 200% choice and a text size switch on `/`. The head script works only on `/patient` (`lib/textSize.ts` line 34), so a switch on `/` needs that guard changed too.
- 2 (plain language): 18 of the 20 rewrites are allowed (2.1 and 2.15 are fixed by SPEC). Each changed English line makes the 4 draft translations out of date, and the fluent reviewer step has not started yet.
- 3.2: "(draft)" in the menu label. New text.
- 1.11 and 3.3: start in the phone's language from `navigator.languages`. A new rule in `lib/`.

### Out of scope for the demo (I suggest no change)

- 1.1: one saved visit per phone. A second visit on a shared phone is a new feature.
- 1.2: slower polling in a hidden tab. Useful for data, but it changes the realtime rule and needs its own test plan.
- 5.2: iPhone stops sound after a lock. The notice already says alerts work only while the page is open and the phone is unlocked (SPEC.md line 64). When the beep fails, the box says so (`offWhileCalled`).
- 6.3, 6.5, 7.5: Low. Note them only.

## Outcome

Claude, 2026-11-18. The owner's plan (C:\Users\mgold\.claude\plans\quizzical-booping-nautilus.md) is done on `phase3-review-fixes`, each step as a test commit, then a fix commit:

- Step 1, new and changed safety lines in 5 languages: `ce022bd`, `e5779a0`.
- Step 2, text size choice on `/`: `5327def`, `18d985d`.
- Step 3 (4.1, 4.2), the announcer says an expired visit, and says each change once: `12c9b62`, `f87772d`.
- Step 4 (3.1, 3.2, 1.10), draft tags, a status region for the draft notice, the interpreter line: `5a9895e`, `7dcffaf`.
- Step 5 (6.2), `lang` and `dir` on `<html>`: `c07cf36`, `a826021`.
- Step 6 (1.8, 7.1), the replaced-link message: `91f8263`, `b545f9b`.
- Step 7 (6.4, 7.4), tap size of the care links, the empty thank-you box: `cd39438`, `da5a6ba`.

The points not in the plan are in docs/known-issues.md. The diff review of these fixes is a new handoff.
