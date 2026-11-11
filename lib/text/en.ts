// Every sentence a patient sees, in English. Other languages copy this shape (lib/text/index.ts).
// Wording approved by the owner on 2026-11-10 (handoffs/archive/2026-11-10-gemini-patient-wording-phase3-response.md).
// Sentences marked "SPEC" are fixed by SPEC.md: change them only if the owner changes SPEC.
// Words in {braces} are filled in by the app (for example {low}); translators keep them as they are.

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

    demoScreens: "Demo screens",
    staffScreen: "Staff screen",
    patientScreen: "Patient screen",
    dashboard: "Dashboard",
  },

  // Shown on the start page and the patient screen when a visit from home was never triaged.
  expiredText:
    "You started this visit over 6 hours ago. It was never checked in at triage. Staff no longer expect you to arrive.",

  patient: {
    loading: "Loading your visit…",
    unavailableHeading: "We cannot load your visit",
    unavailableText:
      "Your actions on this page are not saving. Staff may not see them. Please go to the emergency department desk.",
    noVisitHeading: "No visit found on this phone",
    brokenLinkHeading: "This link did not work",
    brokenLinkText: "The link might be wrong or cut short. No visit was opened.",
    findVisitHelp:
      "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again.",

    waitingHeading: "Status: Waiting",
    placeInLine: "Your place in line:",
    // SPEC
    placeCanChange: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
    // SPEC
    waitLabel: "Estimated time until you're called back:",
    waitRange: "{low} to {high} minutes",
    simulated: "This estimate is simulated for the demo.",

    calledHeading: "Please head back now",
    calledText: "Please go back to the emergency department desk.",
    onMyWay: "I'm on my way",
    sending: "Sending…",
    confirmed: "Thank you. Staff know you are on your way.",
    alertLimits: "Demo limits: alerts on this page only work while it is open and your phone is unlocked.",
    notSaved: "Your answer did not save. Staff do not know you tapped it. Please try again or go to the desk.",

    fromHomeHeading: "Status: Started from home, not yet triaged",
    fromHomeText: [
      // SPEC
      "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
      "This app does not register you or give permission to wait off-site.",
      "If you go to the emergency department, follow its normal steps. Show this visit code to staff. Only staff can approve off-site waiting.",
    ],
    reassessHeading: "Please go to the triage desk",
    reassessText: "A nurse needs to check you again. This happens before you rejoin the line.",
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
    called: "You have been called back. Please head back to the emergency department now.",
    onTheWay: "Thank you. Staff know you are on your way.",
    arrived: "Staff have marked you as back at the emergency department.",
    ended: "Your off-site wait has ended.",
    reassess: "Please go to the triage desk.",
    stillHere: "Please tap the button to confirm you are still here.",
    secondAlert: "Urgent: Please return to the emergency department right now.",
  },

  // Desk slip (printed for the patient).
  slip: {
    // SPEC
    typeLink: "Or type this link into your phone's browser:",
  },

  // Phase 3 features still being built. Written now so all text is translated in one batch.
  stillHere: {
    heading: "Are you still following your visit?",
    button: "I'm still here",
    thanks: "Thank you.",
    meaning: "This tells staff you are still waiting. It is not a check of your health.",
  },
  secondAlert: "Please return to the emergency department right now. Staff may try to reach you.",
  returnNow: {
    lead: "We have not heard from you.",
    // SPEC
    text: "Please return now. Staff will review your visit if you do not respond.",
  },
  sound: {
    notice:
      "This demo plays a sound and vibrates when you are called. This only works while this page is open and your phone is unlocked.",
    turnOn: "Turn on sound",
    on: "Sound is on",
  },
  pausedHeading: "Off-site waiting is paused",
  textSize: { label: "Text size", normal: "Normal", large: "Large", extraLarge: "Extra large" },
  language: {
    label: "Select language",
    draftNotice: "This translation is a draft. A fluent speaker has not checked it yet.",
  },
  survey: {
    // SPEC
    question: "How would you rate your waiting experience?",
    low: "0 = Very poor",
    high: "10 = Excellent",
    submit: "Submit",
    thanks: "Thank you for your feedback.",
    note: "Answering is optional. Your name is not stored.",
  },
  offline: "You are offline. Reconnect to the internet to see your status.",
};

/** The shape every language's text must have. */
export type PatientText = typeof en;
