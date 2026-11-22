// Every sentence a patient sees, in English. Other languages copy this shape (lib/text/index.ts).
// Wording approved by the owner on 2026-11-10 (handoffs/archive/2026-11-10-gemini-patient-wording-phase3-response.md).
// Sentences marked "SPEC" are fixed by SPEC.md: change them only if the owner changes SPEC.
// Words in {braces} are filled in by the app (for example {low}); translators keep them as they are.
// The hour and minute words (waitRangeLong and the Duration words at the end) were drafted by
// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md); the owner approved the English on 2026-11-21.

import type { DurationWords } from "./durationWords";

export const en = {
  // SPEC rule 3: on every patient screen, in every state and every language.
  emergencyLine: "If your symptoms get worse, call 911 or come back to the emergency department now.",
  // SPEC: on every page.
  footer: "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only.",
  appName: "Virtual Waiting Room",
  visitCode: "Visit code",
  siteName: "Demo Site {site}",
  newTab: "(opens in a new tab)",

  start: {
    // SPEC
    emergencyCheck:
      "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now.",
    careHeading: "Learn about your care options",
    careIntro: "This demo cannot choose a service for you. Check the rules and hours on each site before you go.",
    health811Before: "Health811: Call",
    health811After: "to speak with a nurse for free.",
    virtualCare: "Virtual urgent care",
    // SPEC (the next five)
    urgentCare: "Urgent Care Centre at Queensway Health Centre in Etobicoke.",
    pharmacist:
      "A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so check that it is still running before you go.",
    hoursBefore: "For hours and addresses, see",
    hoursLink: "THP's emergency page",
    waitTimesLink: "See current wait times on THP's website",

    startHeading: "Start a visit",
    // Ends with SPEC's sentence about triage.
    startIntro:
      "Starting here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
    siteQuestion: "Which emergency department are you going to?",
    startButton: "Start a visit",
    starting: "Starting…",
    // SPEC
    paused: "Off-site waiting is paused right now. Please come to the emergency department and wait there.",
    busy: "The app is too busy right now. Please wait a few minutes and try again. You can also go straight to the emergency department.",
    notSaved: "Your visit did not save. Please try again. Or, go to the emergency department desk.",

    checkingSaved: "Checking this phone for a saved visit…",
    unavailableHeading: "We cannot open the saved visit on this phone",
    unavailableText:
      "Your saved visit will not load right now. You cannot start a new one here. If you need care, please go to the emergency department desk.",
    openHeading: "You have an open visit on this phone",
    openVisit: "Open your visit",
    closedHeading: "Your past visit on this phone",
    closedText:
      "Off-site waiting is over for this visit. You might still be waiting at the hospital. Open your visit to check.",
    expiredHeading: "Your visit request has expired",
    startNew: "Start a new demo visit",
    // In the start box, under the intro (2026-11-22).
    noPhone: "You need a smartphone with internet to wait off-site. If you do not have one, wait in the emergency department as usual.",

    // "How it works" (Gemini wording, owner 2026-11-22). Step 2 is patient.fromHomeText[0] (SPEC), so it is not here.
    howHeading: "How it works",
    howSteps: [
      "Tap \"Start a visit\" at home or while waiting at the hospital. Starting a visit does not hold a place in line.",
      "Staff decide if you can wait off-site. You must agree and be able to return within 20 minutes. If you did not start on your phone, staff give you a paper slip.",
      "Follow your place in line, status, and simulated wait range on your phone. Tap \"I'm still here\" every 30 minutes.",
      "When your status is \"Please head back now\", tap \"I'm on my way\". Come back within 20 minutes.",
      "Go to the emergency department desk when you return. Tell staff you are back.",
    ],
    // "Questions". placeChanged and worse are answered by SPEC sentences (patient.placeCanChange, emergencyLine);
    // paused.a gets start.paused (SPEC) in {message}.
    questionsHeading: "Questions",
    questions: {
      holdPlace: {
        q: "Does starting a visit at home hold my place?",
        // {triage} is filled with patient.fromHomeText[0] (SPEC), so that sentence is never copied.
        a: "Starting from home does not hold a place in line. {triage}",
      },
      placeChanged: { q: "Why did my place in line change?" },
      stillHere: {
        q: "What happens if I do not tap \"I'm still here\"?",
        a: "After 10 minutes, staff see a notice on your visit. Tapping this button only tells staff you are still waiting, not how you feel.",
      },
      noReply: {
        q: "What happens if I do not reply when asked to return?",
        a: "A second alert shows after 10 minutes. If you do not tap \"I'm on my way\" within 20 minutes, staff will review your visit.",
      },
      worse: { q: "What if my symptoms get worse?" },
      saves: {
        q: "What does the app save about me?",
        a: "The app saves no names, health card numbers, phone numbers, or symptoms. App records are deleted after 24 hours.",
      },
      reopen: {
        q: "How do I open my visit again?",
        a: "Open it the same way you first did, on the same phone, or scan your paper slip. A QR code or a message app can open its own browser, and a different phone or a private window will not have your visit.",
      },
      paused: { q: "What if staff pause off-site waiting?", a: "You will see this message: \"{message}\"" },
    },

    demoScreens: "Demo screens",
    staffScreen: "Staff screen",
    patientScreen: "Patient screen",
    dashboard: "Dashboard",
  },

  // Shown on the start page and the patient screen when a visit from home was never triaged.
  expiredText:
    "You started this visit over 6 hours ago. No nurse saw you for this visit. Staff no longer expect you to arrive.",

  patient: {
    loading: "Loading your visit…",
    unavailableHeading: "We cannot load your visit",
    unavailableText:
      "We cannot show your visit right now. If you need care, please go to the emergency department desk.",
    noVisitHeading: "No visit found on this phone",
    brokenLinkHeading: "This link did not work",
    brokenLinkText: "The link might be wrong or cut short. No visit was opened.",
    // Staff gave a new link or closed the visit, so this link no longer works.
    replacedLinkHeading: "This visit link does not work or is no longer active",
    replacedLinkText: "Please ask the emergency department desk for help.",
    findVisitHelp:
      "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again.",

    waitingHeading: "Status: Waiting",
    placeInLine: "Your place in line:",
    // SPEC
    placeCanChange: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
    // SPEC
    waitLabel: "Estimated time until you're called back:",
    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
    // from an hour, each end is built from the Duration words below.
    waitRangeLong: "{low} to {high}",
    simulated: "This estimate is simulated for the demo.",
    // "Before you leave", while the status is "Waiting" (Gemini wording, owner 2026-11-22).
    beforeHeading: "Before you leave",
    beforeItems: [
      "Keep this page open and your phone unlocked. Alerts cannot wake a locked phone.",
      "Keep your phone charged and your sound on.",
      "Stay within 20 minutes of the emergency department.",
      "Keep your paper slip if you got one, so you can scan the code again.",
    ],

    calledHeading: "Please head back now",
    calledText: "Please go back to the emergency department desk.",
    onMyWay: "I'm on my way",
    sending: "Sending…",
    confirmed: "Thank you. Staff know you are on your way.",
    notSaved: "Your answer did not save. Staff do not know you are on your way. Please try again or go to the desk.",

    fromHomeHeading: "Status: Started from home, not seen by a nurse yet",
    fromHomeText: [
      // SPEC
      "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
      "This app does not check you in at the hospital or let you wait away from the hospital.",
      "When you get to the emergency department, check in at the front desk and show this visit code. Only staff can let you wait away from the hospital.",
    ],
    reassessHeading: "Please go to the triage desk",
    reassessText: "A nurse needs to check you again before you go back in line.",
    arrivedHeading: "Status: Ready at the desk",
    arrivedText: "Staff know you are back. Please stay in the waiting area until you are called.",
    onsiteHeading: "Status: Waiting in the emergency department",
    onsiteText: "You are waiting inside the hospital. Staff will call you when they are ready.",
    endedHeading: "Your off-site wait has ended",
    endedText: "Please go to the emergency department desk.",
    unableText:
      "Staff could not reach you, so this visit has left the off-site line. If you still need care, please come to the emergency department desk.",
    removedText:
      "Staff have ended off-site waiting for this visit. If you still need care, please come to the emergency department desk.",
    expiredHeading: "This visit request has expired",
    expiredHelp: "If you still need care, please go to the emergency department desk.",
    expiredNewVisit: "Or start a new demo visit on the start page.",
  },

  // Heard by screen-reader users when the status changes (never the wait range or countdowns).
  announce: {
    called: "It is your turn. Please come back to the emergency department now.",
    onTheWay: "Thank you. Staff know you are on your way.",
    arrived: "Staff have marked you as back at the emergency department.",
    ended: "Your off-site wait has ended.",
    reassess: "Please go to the triage desk.",
    stillHere: "Please tap the button to confirm you are still here.",
    secondAlert: "Urgent: Please return to the emergency department right now.",
    waiting: "You are now in the off-site line. This page shows your place in line.",
    onsite: "Please wait inside the emergency department. Staff will call you when they are ready.",
    expired: "This visit request has expired. If you still need care, please go to the emergency department desk.",
  },

  // Desk slip (printed for the patient).
  slip: {
    // SPEC
    typeLink: "Or type this link into your phone's browser:",
  },

  // Text for the still-here prompt (components/patient/StillHerePrompt.tsx). Kept with the rest of the patient text so it is all translated in one batch.
  stillHere: {
    heading: "Are you still following your visit?",
    button: "I'm still here",
    thanks: "Thank you.",
    meaning: "This tells staff you are still waiting. It is not a check of your health.",
    /** The tap could not be saved. No desk or "come back" words: the patient is still waiting off-site. */
    notSaved: "Your tap did not save. Staff may not know you are still waiting. Please try again.",
  },
  secondAlert: "Please come back to the emergency department right now. Staff may phone you.",
  returnNow: {
    lead: "We have not heard from you.",
    // SPEC
    text: "Please return now. Staff will review your visit if you do not respond.",
  },
  sound: {
    notice:
      "This demo can play a sound when you are called. It also vibrates if your phone allows it. Alerts work only while this page is open and your phone is unlocked. Take your phone off silent so you can hear it.",
    turnOn: "Turn on sound",
    on: "Sound is on",
    failed: "Sound could not start on this phone. Watch this screen to see when you are called.",
    turnOff: "Turn off sound",
    offWhileCalled: "Sound is off. Tap \"Turn on sound\" for sound alerts.",
  },
  pausedHeading: "Off-site waiting is paused",
  textSize: { label: "Text size", normal: "Normal", large: "Large", extraLarge: "Extra large" },
  language: {
    label: "Select language",
    draftNotice: "This translation is a draft. A fluent speaker has not checked it yet.",
    // Shown in brackets after a draft language's name in the menu.
    draftTag: "draft",
    interpreter: "Need another language? Ask the emergency department desk for a free interpreter.",
  },
  survey: {
    // SPEC
    question: "How would you rate your waiting experience?",
    low: "0 = Very poor",
    high: "10 = Excellent",
    submit: "Submit",
    thanks: "Thank you for your feedback.",
    note: "Answering is optional. Your name is not stored.",
    notSaved: "Your answer did not save. Please try again.",
  },
  offline: "You are offline. Reconnect to the internet to see your status.",
};

/** The shape every language's text must have. */
export type PatientText = typeof en;

/** Hour and minute words for the wait range (lib/waitText.ts) and the staff screen-reader words. */
export const enDuration: DurationWords = {
  locale: "en",
  hour: { one: "{n} hour", other: "{n} hours" },
  minute: { one: "{n} minute", other: "{n} minutes" },
  join: "{h} {m}",
};
