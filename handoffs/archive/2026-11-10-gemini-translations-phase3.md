# Handoff: draft translations of the patient text (Phase 3)

For: Gemini 3.1 Pro, High (Gemini 3.6 Flash, High, only if there are no 3.1 Pro credits). Use a new chat.
Date: 2026-11-10. No keys, tokens, passwords or patient data are in this file.

## What the app is

A concept prototype of a virtual emergency department waiting room in Mississauga, Ontario, Canada. After a nurse triages a low-acuity patient, the patient can wait off-site, follow their place in line on their own phone, and come back when called. Demo data only; no clinical decisions. These translations are drafts: a fluent human speaker will check each language before it is used, safety messages first.

## Your task

Translate every English sentence in the file below into four languages:

- `fr`: Canadian French (as used in Ontario and Quebec health services)
- `ur`: Urdu (Urdu script)
- `ar`: Modern Standard Arabic
- `zh`: Mandarin, written in Simplified Chinese

## Rules

1. Plain, calm, everyday language at about a grade 6 to 8 reading level. Polite but not stiff. No idioms.
2. Keep the meaning exactly. Do not add reassurance, advice or medical claims, and do not soften or strengthen warnings.
3. Safety sentences matter most. Translate them carefully and literally: `emergencyLine`, `start.emergencyCheck`, `start.paused`, `patient.calledHeading`, `patient.calledText`, `announce.called`, `secondAlert`, `announce.secondAlert`, `returnNow.text`, `patient.fromHomeText` (first sentence), `start.startIntro`, `patient.placeCanChange`, `stillHere.meaning`.
4. Keep words in braces exactly as they are, untranslated, for example `{site}`, `{low}`, `{high}`. The app fills them in. You may move them within the sentence if the grammar needs it.
5. Keep these unchanged: the numbers 911 and 811, "Health811", "THP", "Shoppers Drug Mart", "Queensway Health Centre", "Trillium Health Partners", "Etobicoke", "Mississauga", "QR". Write "Demo Site" in each language, but keep the site letter `{site}`.
6. "Concept prototype" and "demo" mean this is not a real hospital service; keep that clear.
7. "I'm still here" only tells staff the patient is still following the visit. It is not a health check; never translate it as one.
8. Keep the same keys and the same nesting. `fromHomeText` is a list of three sentences; keep three.
9. `patient.waitLabel` ends with a colon because a number range follows it; `patient.placeInLine` is followed by a number. Keep that order natural for each language.

## What to send back

1. For each language, the complete object in the same shape as `en` below, as TypeScript, starting `export const fr = {` (and `ur`, `ar`, `zh`). Only the strings change. Leave out the comments.
2. For each language, a back-translation into English of the safety sentences in rule 3 (one line each, with its key), so the owner can check the meaning before the fluent reviewer does.
3. Any English sentence that was hard to translate or ambiguous, with the reason.

If the answer is too long for one reply, send one language per reply, in the order fr, ur, ar, zh.

## The English text (lib/text/en.ts)

```ts

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
    languageLabel: "Language",
    languageNote: "French, Urdu, Arabic and Mandarin are coming soon.",
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

```

## Claude's check (2026-11-11)

Gemini's answer (pasted by the owner into `TRANSLATIONS.md`) is copied below this check, with the editor's clutter removed (`&#x20;` spaces and blank lines); `TRANSLATIONS.md` was then deleted under the one-file rule. Urdu, Arabic and Mandarin came twice; the copies were identical apart from one extra backslash, so the first copy of each was used.

The translations are now `lib/text/fr.ts`, `ur.ts`, `ar.ts` and `zh.ts`, marked DRAFT. Checks:
- The type check passes: every language has exactly the same sentences as `lib/text/en.ts`, none missing or extra.
- `lib/text/translations.test.ts` (new) passes for all four: no empty sentence, the same `{fill-in}` words, 911 and 811 kept wherever English has them, three paragraphs for a visit from home.
- Fixed: French changed "Health811" to "ConnexionSanté" (the older Health Connect Ontario name; also against rule 5). Restored to "Health811". The fluent French reviewer may prefer the official French name of the service.

For the fluent reviewers (not changed by Claude):
- All four kept "Demo Site {site}" in English instead of translating it. Accepted for now: it matches the staff screen and the site choice.
- Arabic `start.paused` adds "temporarily" ("temporarily paused").
- Mandarin `patient.fromHomeText` and `placeCanChange` say the most urgent patients "see a doctor first" rather than "are seen first".
- "Triage": Urdu transliterates it, Arabic uses الفرز, Mandarin uses 分诊处 with "(triage)" in English.
- Every safety sentence (see the back-translations below) keeps its meaning; check these first.

## Response (Gemini 3.1 Pro, cleaned copy of TRANSLATIONS.md)

\## French
export const fr = {
  emergencyLine: "Si vos symptômes s'aggravent, appelez le 911 ou revenez immédiatement aux urgences.",
  footer: "Prototype conceptuel. Non affilié à ou approuvé par Trillium Health Partners. Données de démonstration uniquement.",
  appName: "Salle d'attente virtuelle",
  visitCode: "Code de visite",
  siteName: "Demo Site {site}",
  newTab: "(s'ouvre dans un nouvel onglet)",
  start: {
    emergencyCheck:
      "Douleur thoracique, difficulté à respirer, signes d'un accident vasculaire cérébral, saignement abondant ou autre urgence ? Appelez le 911 maintenant.",
    careHeading: "Renseignez-vous sur vos options de soins",
    careIntro: "Cette démonstration ne peut pas choisir un service pour vous. Vérifiez les règles et les heures d'ouverture sur chaque site avant de vous y rendre.",
    health811Before: "ConnexionSanté : Appelez le",
    health811After: "pour parler gratuitement à une infirmière.",
    virtualCare: "Soins d'urgence virtuels",
    urgentCare: "Centre de soins d'urgence au Queensway Health Centre à Etobicoke.",
    pharmacist:
      "Un pharmacien peut vous évaluer dans trois succursales Shoppers Drug Mart à Mississauga. Il s'agit d'un projet pilote, alors vérifiez s'il est toujours en cours avant de vous y rendre.",
    hoursBefore: "Pour connaître les heures d'ouverture et les adresses, consultez la",
    hoursLink: "page des urgences de THP",
    waitTimesLink: "Voir les temps d'attente actuels sur le site Web de THP",
    startHeading: "Commencer une visite",
    startIntro:
      "Commencer ici ne vous réserve pas de place dans la file d'attente. Votre place dans la file commence lorsqu'une infirmière vous voit au triage. Les patients les plus urgents sont toujours vus en premier.",
    siteQuestion: "À quel service des urgences allez-vous ?",
    languageLabel: "Langue",
    languageNote: "Le français, l'ourdou, l'arabe et le mandarin seront bientôt disponibles.",
    startButton: "Commencer une visite",
    starting: "Démarrage en cours…",
    paused: "L'attente hors site est suspendue pour le moment. Veuillez vous présenter aux urgences et y attendre.",
    busy: "L'application est trop occupée pour le moment. Veuillez patienter quelques minutes et réessayer. Vous pouvez également vous rendre directement aux urgences.",
    notSaved: "Votre visite n'a pas été enregistrée. Veuillez réessayer. Ou, allez au bureau du service des urgences.",
    checkingSaved: "Recherche d'une visite enregistrée sur ce téléphone…",
    unavailableHeading: "Nous ne pouvons pas ouvrir la visite enregistrée sur ce téléphone",
    unavailableText:
      "Votre visite enregistrée ne se chargera pas pour le moment. Vous ne pouvez pas en commencer une nouvelle ici. Si vous avez besoin de soins, veuillez vous rendre au bureau du service des urgences.",
    openHeading: "Vous avez une visite ouverte sur ce téléphone",
    openVisit: "Ouvrir votre visite",
    closedHeading: "Votre ancienne visite sur ce téléphone",
    closedText:
      "L'attente hors site est terminée pour cette visite. Il se peut que vous soyez encore en train d'attendre à l'hôpital. Ouvrez votre visite pour vérifier.",
    expiredHeading: "Votre demande de visite a expiré",
    startNew: "Commencer une nouvelle visite de démonstration",
    demoScreens: "Écrans de démonstration",
    staffScreen: "Écran du personnel",
    patientScreen: "Écran du patient",
    dashboard: "Tableau de bord",
  },
  expiredText:
    "Vous avez commencé cette visite il y a plus de 6 heures. Elle n'a jamais été enregistrée au triage. Le personnel ne s'attend plus à ce que vous arriviez.",
  patient: {
    loading: "Chargement de votre visite…",
    unavailableHeading: "Nous ne pouvons pas charger votre visite",
    unavailableText:
      "Vos actions sur cette page ne sont pas enregistrées. Il se peut que le personnel ne les voie pas. Veuillez vous rendre au bureau du service des urgences.",
    noVisitHeading: "Aucune visite trouvée sur ce téléphone",
    brokenLinkHeading: "Ce lien n'a pas fonctionné",
    brokenLinkText: "Le lien pourrait être erroné ou coupé court. Aucune visite n'a été ouverte.",
    findVisitHelp:
      "Scannez le code QR sur votre billet. Vous pouvez également taper le lien imprimé en dessous. Si cela échoue toujours, demandez au bureau de vous montrer à nouveau le code QR.",
    waitingHeading: "Statut : En attente",
    placeInLine: "Votre place dans la file d'attente :",
    placeCanChange: "Votre place peut changer si des patients plus urgents arrivent. Les patients les plus urgents sont toujours vus en premier.",
    waitLabel: "Temps estimé avant d'être rappelé :",
    waitRange: "{low} à {high} minutes",
    simulated: "Cette estimation est simulée pour la démonstration.",
    calledHeading: "Veuillez revenir maintenant",
    calledText: "Veuillez retourner au bureau du service des urgences.",
    onMyWay: "Je suis en route",
    sending: "Envoi en cours…",
    confirmed: "Merci. Le personnel sait que vous êtes en route.",
    alertLimits: "Limites de la démonstration : les alertes sur cette page ne fonctionnent que lorsqu'elle est ouverte et que votre téléphone est déverrouillé.",
    notSaved: "Votre réponse n'a pas été enregistrée. Le personnel ne sait pas que vous avez appuyé dessus. Veuillez réessayer ou vous rendre au bureau.",
    fromHomeHeading: "Statut : Commencée depuis la maison, pas encore triée",
    fromHomeText: \[
      "Votre place dans la file commence lorsqu'une infirmière vous voit au triage. Les patients les plus urgents sont toujours vus en premier.",
      "Cette application ne vous inscrit pas ni ne vous donne la permission d'attendre hors site.",
      "Si vous vous rendez au service des urgences, suivez ses étapes normales. Montrez ce code de visite au personnel. Seul le personnel peut approuver l'attente hors site.",
    ],
    reassessHeading: "Veuillez vous rendre au bureau de triage",
    reassessText: "Une infirmière doit vous examiner à nouveau. Cela se produit avant que vous ne rejoigniez la file d'attente.",
    arrivedHeading: "Statut : Prêt au bureau",
    arrivedText: "Le personnel sait que vous êtes de retour. Veuillez rester dans la salle d'attente jusqu'à ce que l'on vous appelle.",
    onsiteHeading: "Statut : En attente au service des urgences",
    onsiteText: "Vous attendez à l'intérieur de l'hôpital. Le personnel vous appellera lorsqu'il sera prêt.",
    endedHeading: "Votre attente hors site est terminée",
    endedText: "Veuillez vous rendre au bureau du service des urgences.",
    unableText:
      "Le personnel n'a pas pu vous joindre, cette visite a donc quitté la file d'attente hors site. Si vous avez toujours besoin de soins, veuillez vous présenter au bureau du service des urgences.",
    removedText:
      "Le personnel a mis fin à l'attente hors site pour cette visite. Si vous avez toujours besoin de soins, veuillez vous présenter au bureau du service des urgences.",
    expiredHeading: "Cette demande de visite a expiré",
    expiredHelp: "Si vous avez toujours besoin de soins, veuillez vous rendre au bureau du service des urgences.",
    expiredNewVisit: "Ou commencez une nouvelle visite de démonstration sur la page d'accueil.",
  },
  announce: {
    called: "Vous avez été rappelé. Veuillez retourner au service des urgences maintenant.",
    onTheWay: "Merci. Le personnel sait que vous êtes en route.",
    arrived: "Le personnel vous a marqué comme étant de retour au service des urgences.",
    ended: "Votre attente hors site est terminée.",
    reassess: "Veuillez vous rendre au bureau de triage.",
    stillHere: "Veuillez appuyer sur le bouton pour confirmer que vous êtes toujours ici.",
    secondAlert: "Urgent : Veuillez retourner au service des urgences immédiatement.",
  },
  slip: {
    typeLink: "Ou tapez ce lien dans le navigateur de votre téléphone :",
  },
  stillHere: {
    heading: "Suivez-vous toujours votre visite ?",
    button: "Je suis toujours ici",
    thanks: "Merci.",
    meaning: "Cela indique au personnel que vous attendez toujours. Ce n'est pas un bilan de votre santé.",
  },
  secondAlert: "Veuillez retourner au service des urgences immédiatement. Le personnel peut essayer de vous joindre.",
  returnNow: {
    lead: "Nous n'avons pas eu de vos nouvelles.",
    text: "Veuillez revenir maintenant. Le personnel examinera votre visite si vous ne répondez pas.",
  },
  sound: {
    notice:
      "Cette démonstration émet un son et vibre lorsque vous êtes appelé. Cela ne fonctionne que lorsque cette page est ouverte et que votre téléphone est déverrouillé.",
    turnOn: "Activer le son",
    on: "Le son est activé",
  },
  pausedHeading: "L'attente hors site est suspendue",
  textSize: { label: "Taille du texte", normal: "Normale", large: "Grande", extraLarge: "Très grande" },
  language: {
    label: "Choisir la langue",
    draftNotice: "Cette traduction est un brouillon. Un locuteur courant ne l'a pas encore vérifiée.",
  },
  survey: {
    question: "Comment évalueriez-vous votre expérience d'attente ?",
    low: "0 = Très mauvaise",
    high: "10 = Excellente",
    submit: "Soumettre",
    thanks: "Merci pour vos commentaires.",
    note: "La réponse est facultative. Votre nom n'est pas enregistré.",
  },
  offline: "Vous êtes hors ligne. Reconnectez-vous à Internet pour voir votre statut.",
};
Back-Translations (French)
emergencyLine: If your symptoms get worse, call 911 or come back to the emergency department immediately.
start.emergencyCheck: Chest pain, trouble breathing, signs of a stroke, heavy bleeding or other emergency? Call 911 now.
start.paused: Off-site waiting is paused for the moment. Please present yourself to the emergency department and wait there.
patient.calledHeading: Please come back now
patient.calledText: Please return to the emergency department desk.
announce.called: You have been called back. Please return to the emergency department now.
secondAlert: Please return to the emergency department immediately. Staff may try to reach you.
announce.secondAlert: Urgent: Please return to the emergency department immediately.
returnNow.text: Please come back now. Staff will review your visit if you do not answer.
patient.fromHomeText (first sentence): Your place in the line starts when a nurse sees you at triage. The most urgent patients are always seen first.
start.startIntro: Starting here does not reserve a place for you in the line. Your place in the line starts when a nurse sees you at triage. The most urgent patients are always seen first.
patient.placeCanChange: Your place can change if more urgent patients arrive. The most urgent patients are always seen first.
stillHere.meaning: This tells staff that you are still waiting. It is not a check of your health.
Translation Notes (French)
start.health811Before/start.health811After: Translated around the phone number as "Health Connect: Call 811 to speak to a nurse for free", using the standard Ontario French branding for Health811 (ConnexionSanté).
\## Urdu
export const ur = {
  emergencyLine: "اگر آپ کی علامات خراب ہوتی ہیں، تو ابھی 911 پر کال کریں یا ایمرجنسی ڈیپارٹمنٹ واپس آ جائیں۔",
  footer: "تصوراتی نمونہ (Concept prototype)۔ Trillium Health Partners سے منسلک یا ان سے منظور شدہ نہیں ہے۔ صرف ڈیمو ڈیٹا ہے۔",
  appName: "ورچوئل ویٹنگ روم",
  visitCode: "وزٹ کوڈ",
  siteName: "Demo Site {site}",
  newTab: "(نئے ٹیب میں کھلتا ہے)",
  start: {
    emergencyCheck:
      "سینے میں درد، سانس لینے میں تکلیف، فالج کی علامات، بہت زیادہ خون بہنا یا کوئی اور ایمرجنسی ہے؟ ابھی 911 پر کال کریں۔",
    careHeading: "اپنی دیکھ بھال کے اختیارات کے بارے میں جانیں",
    careIntro: "یہ ڈیمو آپ کے لیے سروس کا انتخاب نہیں کر سکتا۔ جانے سے پہلے ہر سائٹ پر اصول اور اوقات چیک کریں۔",
    health811Before: "Health811: نرس سے مفت بات کرنے کے لیے",
    health811After: "پر کال کریں۔",
    virtualCare: "ورچوئل ارجنٹ کیئر",
    urgentCare: "Etobicoke میں Queensway Health Centre میں ارجنٹ کیئر سینٹر۔",
    pharmacist:
      "Mississauga میں تین Shoppers Drug Mart اسٹورز پر فارماسسٹ آپ کا معائنہ کر سکتا ہے۔ یہ ایک پائلٹ پروگرام ہے، لہذا جانے سے پہلے چیک کر لیں کہ کیا یہ اب بھی چل رہا ہے۔",
    hoursBefore: "اوقات اور پتوں کے لیے، دیکھیں",
    hoursLink: "THP کا ایمرجنسی پیج",
    waitTimesLink: "THP کی ویب سائٹ پر موجودہ انتظار کے اوقات دیکھیں",
    startHeading: "وزٹ شروع کریں",
    startIntro:
      "یہاں سے شروع کرنے سے لائن میں آپ کی جگہ نہیں بنتی۔ لائن میں آپ کی جگہ اس وقت شروع ہوتی ہے جب کوئی نرس آپ کو ٹرائیج (triage) میں دیکھتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
    siteQuestion: "آپ کون سے ایمرجنسی ڈیپارٹمنٹ میں جا رہے ہیں؟",
    languageLabel: "زبان",
    languageNote: "فرانسیسی، اردو، عربی اور مینڈارن جلد آ رہی ہیں۔",
    startButton: "وزٹ شروع کریں",
    starting: "شروع ہو رہا ہے...",
    paused: "آف سائٹ (Off-site) انتظار اس وقت روکا ہوا ہے۔ براہ کرم ایمرجنسی ڈیپارٹمنٹ آئیں اور وہاں انتظار کریں۔",
    busy: "ایپ اس وقت بہت مصروف ہے۔ براہ کرم چند منٹ انتظار کریں اور دوبارہ کوشش کریں۔ آپ سیدھے ایمرجنسی ڈیپارٹمنٹ بھی جا سکتے ہیں۔",
    notSaved: "آپ کا وزٹ محفوظ نہیں ہوا۔ براہ کرم دوبارہ کوشش کریں۔ یا، ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
    checkingSaved: "محفوظ کیے گئے وزٹ کے لیے اس فون کو چیک کیا جا رہا ہے...",
    unavailableHeading: "ہم اس فون پر محفوظ کیا گیا وزٹ نہیں کھول سکتے",
    unavailableText:
      "آپ کا محفوظ کیا گیا وزٹ اس وقت لوڈ نہیں ہوگا۔ آپ یہاں نیا وزٹ شروع نہیں کر سکتے۔ اگر آپ کو دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
    openHeading: "اس فون پر آپ کا ایک وزٹ کھلا ہے",
    openVisit: "اپنا وزٹ کھولیں",
    closedHeading: "اس فون پر آپ کا پچھلا وزٹ",
    closedText:
      "اس وزٹ کے لیے آف سائٹ انتظار ختم ہو گیا ہے۔ ہو سکتا ہے آپ اب بھی ہسپتال میں انتظار کر رہے ہوں۔ چیک کرنے کے لیے اپنا وزٹ کھولیں۔",
    expiredHeading: "آپ کے وزٹ کی درخواست کی میعاد ختم ہو گئی ہے",
    startNew: "نیا ڈیمو وزٹ شروع کریں",
    demoScreens: "ڈیمو اسکرینیں",
    staffScreen: "اسٹاف اسکرین",
    patientScreen: "مریض کی اسکرین",
    dashboard: "ڈیش بورڈ",
  },
  expiredText:
    "آپ نے یہ وزٹ 6 گھنٹے سے زیادہ پہلے شروع کیا تھا۔ اسے کبھی بھی ٹرائیج میں چیک ان نہیں کیا گیا۔ عملہ اب آپ کے آنے کی توقع نہیں رکھتا۔",
  patient: {
    loading: "آپ کا وزٹ لوڈ ہو رہا ہے...",
    unavailableHeading: "ہم آپ کا وزٹ لوڈ نہیں کر سکتے",
    unavailableText:
      "اس پیج پر آپ کے کام محفوظ نہیں ہو رہے ہیں۔ ہو سکتا ہے عملہ انہیں نہ دیکھے۔ براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
    noVisitHeading: "اس فون پر کوئی وزٹ نہیں ملا",
    brokenLinkHeading: "اس لنک نے کام نہیں کیا",
    brokenLinkText: "لنک غلط یا کٹا ہوا ہو سکتا ہے۔ کوئی وزٹ نہیں کھلا۔",
    findVisitHelp:
      "اپنی پرچی پر موجود QR کوڈ اسکین کریں۔ آپ اس کے نیچے چھپا ہوا لنک بھی ٹائپ کر سکتے ہیں۔ اگر یہ پھر بھی ناکام رہتا ہے، تو ڈیسک سے کہیں کہ وہ دوبارہ QR کوڈ دکھائے۔",
    waitingHeading: "سٹیٹس: انتظار کر رہے ہیں",
    placeInLine: "لائن میں آپ کی جگہ:",
    placeCanChange: "اگر زیادہ ایمرجنسی والے مریض آ جائیں تو آپ کی جگہ بدل سکتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
    waitLabel: "واپس بلائے جانے تک کا تخمینہ وقت:",
    waitRange: "{low} سے {high} منٹ",
    simulated: "یہ تخمینہ ڈیمو کے لیے فرضی ہے۔",
    calledHeading: "براہ کرم اب واپس آ جائیں",
    calledText: "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر واپس جائیں۔",
    onMyWay: "میں راستے میں ہوں",
    sending: "بھیجا جا رہا ہے...",
    confirmed: "شکریہ۔ عملہ جانتا ہے کہ آپ راستے میں ہیں۔",
    alertLimits: "ڈیمو کی حدود: اس پیج پر الرٹس صرف اس وقت کام کرتے ہیں جب یہ کھلا ہو اور آپ کا فون ان لاک ہو۔",
    notSaved: "آپ کا جواب محفوظ نہیں ہوا۔ عملہ نہیں جانتا کہ آپ نے اسے دبایا ہے۔ براہ کرم دوبارہ کوشش کریں یا ڈیسک پر جائیں۔",
    fromHomeHeading: "سٹیٹس: گھر سے شروع کیا گیا، ابھی ٹرائیج نہیں ہوا",
    fromHomeText: \[
      "لائن میں آپ کی جگہ اس وقت شروع ہوتی ہے جب کوئی نرس آپ کو ٹرائیج میں دیکھتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
      "یہ ایپ آپ کو رجسٹر نہیں کرتی یا آف سائٹ انتظار کرنے کی اجازت نہیں دیتی۔",
      "اگر آپ ایمرجنسی ڈیپارٹمنٹ جاتے ہیں، تو اس کے عام مراحل پر عمل کریں۔ عملے کو یہ وزٹ کوڈ دکھائیں۔ صرف عملہ آف سائٹ انتظار کی منظوری دے سکتا ہے۔",
    ],
    reassessHeading: "براہ کرم ٹرائیج ڈیسک پر جائیں",
    reassessText: "ایک نرس کو آپ کو دوبارہ چیک کرنے کی ضرورت ہے۔ یہ آپ کے دوبارہ لائن میں شامل ہونے سے پہلے ہوتا ہے۔",
    arrivedHeading: "سٹیٹس: ڈیسک پر تیار",
    arrivedText: "عملہ جانتا ہے کہ آپ واپس آ گئے ہیں۔ براہ کرم بلائے جانے تک انتظار کے علاقے میں رہیں۔",
    onsiteHeading: "سٹیٹس: ایمرجنسی ڈیپارٹمنٹ میں انتظار کر رہے ہیں",
    onsiteText: "آپ ہسپتال کے اندر انتظار کر رہے ہیں۔ عملہ تیار ہونے پر آپ کو بلائے گا۔",
    endedHeading: "آپ کا آف سائٹ انتظار ختم ہو گیا ہے",
    endedText: "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
    unableText:
      "عملہ آپ تک نہیں پہنچ سکا، لہذا یہ وزٹ آف سائٹ لائن سے نکل گیا ہے۔ اگر آپ کو اب بھی دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر آئیں۔",
    removedText:
      "عملے نے اس وزٹ کے لیے آف سائٹ انتظار ختم کر دیا ہے۔ اگر آپ کو اب بھی دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر آئیں۔",
    expiredHeading: "اس وزٹ کی درخواست کی میعاد ختم ہو گئی ہے",
    expiredHelp: "اگر آپ کو اب بھی دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
    expiredNewVisit: "یا شروع کے پیج پر نیا ڈیمو وزٹ شروع کریں۔",
  },
  announce: {
    called: "آپ کو واپس بلایا گیا ہے۔ براہ کرم ابھی ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔",
    onTheWay: "شکریہ۔ عملہ جانتا ہے کہ آپ راستے میں ہیں۔",
    arrived: "عملے نے آپ کو ایمرجنسی ڈیپارٹمنٹ میں واپس آ گیا ہے کے طور پر نشان زد کر دیا ہے۔",
    ended: "آپ کا آف سائٹ انتظار ختم ہو گیا ہے۔",
    reassess: "براہ کرم ٹرائیج ڈیسک پر جائیں۔",
    stillHere: "براہ کرم یہ تصدیق کرنے کے لیے بٹن دبائیں کہ آپ اب بھی یہاں ہیں۔",
    secondAlert: "ضروری: براہ کرم فوراً ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔",
  },
  slip: {
    typeLink: "یا یہ لنک اپنے فون کے براؤزر میں ٹائپ کریں:",
  },
  stillHere: {
    heading: "کیا آپ اب بھی اپنے وزٹ کی پیروی کر رہے ہیں؟",
    button: "میں اب بھی یہاں ہوں",
    thanks: "شکریہ۔",
    meaning: "یہ عملے کو بتاتا ہے کہ آپ اب بھی انتظار کر رہے ہیں۔ یہ آپ کی صحت کا چیک نہیں ہے۔",
  },
  secondAlert: "براہ کرم فوراً ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔ عملہ آپ تک پہنچنے کی کوشش کر سکتا ہے۔",
  returnNow: {
    lead: "ہمیں آپ کی طرف سے کوئی جواب نہیں ملا۔",
    text: "براہ کرم ابھی واپس آ جائیں۔ اگر آپ جواب نہیں دیتے ہیں تو عملہ آپ کے وزٹ کا جائزہ لے گا۔",
  },
  sound: {
    notice:
      "جب آپ کو بلایا جاتا ہے تو یہ ڈیمو آواز بجاتا ہے اور وائبریٹ کرتا ہے۔ یہ صرف اس وقت کام کرتا ہے جب یہ پیج کھلا ہو اور آپ کا فون ان لاک ہو۔",
    turnOn: "آواز آن کریں",
    on: "آواز آن ہے",
  },
  pausedHeading: "آف سائٹ انتظار روکا ہوا ہے",
  textSize: { label: "ٹیکسٹ کا سائز", normal: "نارمل", large: "بڑا", extraLarge: "بہت بڑا" },
  language: {
    label: "زبان منتخب کریں",
    draftNotice: "یہ ترجمہ ایک ڈرافٹ ہے۔ کسی روانی سے بولنے والے نے ابھی اسے چیک نہیں کیا ہے۔",
  },
  survey: {
    question: "آپ اپنے انتظار کے تجربے کو کیسی ریٹنگ دیں گے؟",
    low: "0 = بہت خراب",
    high: "10 = بہترین",
    submit: "جمع کرائیں",
    thanks: "آپ کے فیڈ بیک کا شکریہ۔",
    note: "جواب دینا اختیاری ہے۔ آپ کا نام محفوظ نہیں کیا جاتا ہے۔",
  },
  offline: "آپ آف لائن ہیں۔ اپنا سٹیٹس دیکھنے کے لیے دوبارہ انٹرنیٹ سے کنیکٹ کریں۔",
};
My apologies, I paused to keep the reply sizes manageable! Here is the next requested language, Urdu (`ur`), following your exact rules and shape.
```ts
export const ur = {
\  emergencyLine: "اگر آپ کی علامات خراب ہوتی ہیں، تو ابھی 911 پر کال کریں یا ایمرجنسی ڈیپارٹمنٹ واپس آ جائیں۔",
\  footer: "تصوراتی نمونہ (Concept prototype)۔ Trillium Health Partners سے منسلک یا ان سے منظور شدہ نہیں ہے۔ صرف ڈیمو ڈیٹا ہے۔",
\  appName: "ورچوئل ویٹنگ روم",
\  visitCode: "وزٹ کوڈ",
\  siteName: "Demo Site {site}",
\  newTab: "(نئے ٹیب میں کھلتا ہے)",
\  start: {
\    emergencyCheck:
\      "سینے میں درد، سانس لینے میں تکلیف، فالج کی علامات، بہت زیادہ خون بہنا یا کوئی اور ایمرجنسی ہے؟ ابھی 911 پر کال کریں۔",
\    careHeading: "اپنی دیکھ بھال کے اختیارات کے بارے میں جانیں",
\    careIntro: "یہ ڈیمو آپ کے لیے سروس کا انتخاب نہیں کر سکتا۔ جانے سے پہلے ہر سائٹ پر اصول اور اوقات چیک کریں۔",
\    health811Before: "Health811: نرس سے مفت بات کرنے کے لیے",
\    health811After: "پر کال کریں۔",
\    virtualCare: "ورچوئل ارجنٹ کیئر",
\    urgentCare: "Etobicoke میں Queensway Health Centre میں ارجنٹ کیئر سینٹر۔",
\    pharmacist:
\      "Mississauga میں تین Shoppers Drug Mart اسٹورز پر فارماسسٹ آپ کا معائنہ کر سکتا ہے۔ یہ ایک پائلٹ پروگرام ہے، لہذا جانے سے پہلے چیک کر لیں کہ کیا یہ اب بھی چل رہا ہے۔",
\    hoursBefore: "اوقات اور پتوں کے لیے، دیکھیں",
\    hoursLink: "THP کا ایمرجنسی پیج",
\    waitTimesLink: "THP کی ویب سائٹ پر موجودہ انتظار کے اوقات دیکھیں",
\    startHeading: "وزٹ شروع کریں",
\    startIntro:
\      "یہاں سے شروع کرنے سے لائن میں آپ کی جگہ نہیں بنتی۔ لائن میں آپ کی جگہ اس وقت شروع ہوتی ہے جب کوئی نرس آپ کو ٹرائیج (triage) میں دیکھتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
\    siteQuestion: "آپ کون سے ایمرجنسی ڈیپارٹمنٹ میں جا رہے ہیں؟",
\    languageLabel: "زبان",
\    languageNote: "فرانسیسی، اردو، عربی اور مینڈارن جلد آ رہی ہیں۔",
\    startButton: "وزٹ شروع کریں",
\    starting: "شروع ہو رہا ہے...",
\    paused: "آف سائٹ (Off-site) انتظار اس وقت روکا ہوا ہے۔ براہ کرم ایمرجنسی ڈیپارٹمنٹ آئیں اور وہاں انتظار کریں۔",
\    busy: "ایپ اس وقت بہت مصروف ہے۔ براہ کرم چند منٹ انتظار کریں اور دوبارہ کوشش کریں۔ آپ سیدھے ایمرجنسی ڈیپارٹمنٹ بھی جا سکتے ہیں۔",
\    notSaved: "آپ کا وزٹ محفوظ نہیں ہوا۔ براہ کرم دوبارہ کوشش کریں۔ یا، ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
\    checkingSaved: "محفوظ کیے گئے وزٹ کے لیے اس فون کو چیک کیا جا رہا ہے...",
\    unavailableHeading: "ہم اس فون پر محفوظ کیا گیا وزٹ نہیں کھول سکتے",
\    unavailableText:
\      "آپ کا محفوظ کیا گیا وزٹ اس وقت لوڈ نہیں ہوگا۔ آپ یہاں نیا وزٹ شروع نہیں کر سکتے۔ اگر آپ کو دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
\    openHeading: "اس فون پر آپ کا ایک وزٹ کھلا ہے",
\    openVisit: "اپنا وزٹ کھولیں",
\    closedHeading: "اس فون پر آپ کا پچھلا وزٹ",
\    closedText:
\      "اس وزٹ کے لیے آف سائٹ انتظار ختم ہو گیا ہے۔ ہو سکتا ہے آپ اب بھی ہسپتال میں انتظار کر رہے ہوں۔ چیک کرنے کے لیے اپنا وزٹ کھولیں۔",
\    expiredHeading: "آپ کے وزٹ کی درخواست کی میعاد ختم ہو گئی ہے",
\    startNew: "نیا ڈیمو وزٹ شروع کریں",
\    demoScreens: "ڈیمو اسکرینیں",
\    staffScreen: "اسٹاف اسکرین",
\    patientScreen: "مریض کی اسکرین",
\    dashboard: "ڈیش بورڈ",
\  },
\  expiredText:
\    "آپ نے یہ وزٹ 6 گھنٹے سے زیادہ پہلے شروع کیا تھا۔ اسے کبھی بھی ٹرائیج میں چیک ان نہیں کیا گیا۔ عملہ اب آپ کے آنے کی توقع نہیں رکھتا۔",
\  patient: {
\    loading: "آپ کا وزٹ لوڈ ہو رہا ہے...",
\    unavailableHeading: "ہم آپ کا وزٹ لوڈ نہیں کر سکتے",
\    unavailableText:
\      "اس پیج پر آپ کے کام محفوظ نہیں ہو رہے ہیں۔ ہو سکتا ہے عملہ انہیں نہ دیکھے۔ براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
\    noVisitHeading: "اس فون پر کوئی وزٹ نہیں ملا",
\    brokenLinkHeading: "اس لنک نے کام نہیں کیا",
\    brokenLinkText: "لنک غلط یا کٹا ہوا ہو سکتا ہے۔ کوئی وزٹ نہیں کھلا۔",
\    findVisitHelp:
\      "اپنی پرچی پر موجود QR کوڈ اسکین کریں۔ آپ اس کے نیچے چھپا ہوا لنک بھی ٹائپ کر سکتے ہیں۔ اگر یہ پھر بھی ناکام رہتا ہے، تو ڈیسک سے کہیں کہ وہ دوبارہ QR کوڈ دکھائے۔",
\    waitingHeading: "سٹیٹس: انتظار کر رہے ہیں",
\    placeInLine: "لائن میں آپ کی جگہ:",
\    placeCanChange: "اگر زیادہ ایمرجنسی والے مریض آ جائیں تو آپ کی جگہ بدل سکتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
\    waitLabel: "واپس بلائے جانے تک کا تخمینہ وقت:",
\    waitRange: "{low} سے {high} منٹ",
\    simulated: "یہ تخمینہ ڈیمو کے لیے فرضی ہے۔",
\    calledHeading: "براہ کرم اب واپس آ جائیں",
\    calledText: "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر واپس جائیں۔",
\    onMyWay: "میں راستے میں ہوں",
\    sending: "بھیجا جا رہا ہے...",
\    confirmed: "شکریہ۔ عملہ جانتا ہے کہ آپ راستے میں ہیں۔",
\    alertLimits: "ڈیمو کی حدود: اس پیج پر الرٹس صرف اس وقت کام کرتے ہیں جب یہ کھلا ہو اور آپ کا فون ان لاک ہو۔",
\    notSaved: "آپ کا جواب محفوظ نہیں ہوا۔ عملہ نہیں جانتا کہ آپ نے اسے دبایا ہے۔ براہ کرم دوبارہ کوشش کریں یا ڈیسک پر جائیں۔",
\    fromHomeHeading: "سٹیٹس: گھر سے شروع کیا گیا، ابھی ٹرائیج نہیں ہوا",
\    fromHomeText: \\\[
\      "لائن میں آپ کی جگہ اس وقت شروع ہوتی ہے جب کوئی نرس آپ کو ٹرائیج میں دیکھتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔",
\      "یہ ایپ آپ کو رجسٹر نہیں کرتی یا آف سائٹ انتظار کرنے کی اجازت نہیں دیتی۔",
\      "اگر آپ ایمرجنسی ڈیپارٹمنٹ جاتے ہیں، تو اس کے عام مراحل پر عمل کریں۔ عملے کو یہ وزٹ کوڈ دکھائیں۔ صرف عملہ آف سائٹ انتظار کی منظوری دے سکتا ہے۔",
\    ],
\    reassessHeading: "براہ کرم ٹرائیج ڈیسک پر جائیں",
\    reassessText: "ایک نرس کو آپ کو دوبارہ چیک کرنے کی ضرورت ہے۔ یہ آپ کے دوبارہ لائن میں شامل ہونے سے پہلے ہوتا ہے۔",
\    arrivedHeading: "سٹیٹس: ڈیسک پر تیار",
\    arrivedText: "عملہ جانتا ہے کہ آپ واپس آ گئے ہیں۔ براہ کرم بلائے جانے تک انتظار کے علاقے میں رہیں۔",
\    onsiteHeading: "سٹیٹس: ایمرجنسی ڈیپارٹمنٹ میں انتظار کر رہے ہیں",
\    onsiteText: "آپ ہسپتال کے اندر انتظار کر رہے ہیں۔ عملہ تیار ہونے پر آپ کو بلائے گا۔",
\    endedHeading: "آپ کا آف سائٹ انتظار ختم ہو گیا ہے",
\    endedText: "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
\    unableText:
\      "عملہ آپ تک نہیں پہنچ سکا، لہذا یہ وزٹ آف سائٹ لائن سے نکل گیا ہے۔ اگر آپ کو اب بھی دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر آئیں۔",
\    removedText:
\      "عملے نے اس وزٹ کے لیے آف سائٹ انتظار ختم کر دیا ہے۔ اگر آپ کو اب بھی دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر آئیں۔",
\    expiredHeading: "اس وزٹ کی درخواست کی میعاد ختم ہو گئی ہے",
\    expiredHelp: "اگر آپ کو اب بھی دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
\    expiredNewVisit: "یا شروع کے پیج پر نیا ڈیمو وزٹ شروع کریں۔",
\  },
\  announce: {
\    called: "آپ کو واپس بلایا گیا ہے۔ براہ کرم ابھی ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔",
\    onTheWay: "شکریہ۔ عملہ جانتا ہے کہ آپ راستے میں ہیں۔",
\    arrived: "عملے نے آپ کو ایمرجنسی ڈیپارٹمنٹ میں واپس آ گیا ہے کے طور پر نشان زد کر دیا ہے۔",
\    ended: "آپ کا آف سائٹ انتظار ختم ہو گیا ہے۔",
\    reassess: "براہ کرم ٹرائیج ڈیسک پر جائیں۔",
\    stillHere: "براہ کرم یہ تصدیق کرنے کے لیے بٹن دبائیں کہ آپ اب بھی یہاں ہیں۔",
\    secondAlert: "ضروری: براہ کرم فوراً ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔",
\  },
\  slip: {
\    typeLink: "یا یہ لنک اپنے فون کے براؤزر میں ٹائپ کریں:",
\  },
\  stillHere: {
\    heading: "کیا آپ اب بھی اپنے وزٹ کی پیروی کر رہے ہیں؟",
\    button: "میں اب بھی یہاں ہوں",
\    thanks: "شکریہ۔",
\    meaning: "یہ عملے کو بتاتا ہے کہ آپ اب بھی انتظار کر رہے ہیں۔ یہ آپ کی صحت کا چیک نہیں ہے۔",
\  },
\  secondAlert: "براہ کرم فوراً ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔ عملہ آپ تک پہنچنے کی کوشش کر سکتا ہے۔",
\  returnNow: {
\    lead: "ہمیں آپ کی طرف سے کوئی جواب نہیں ملا۔",
\    text: "براہ کرم ابھی واپس آ جائیں۔ اگر آپ جواب نہیں دیتے ہیں تو عملہ آپ کے وزٹ کا جائزہ لے گا۔",
\  },
\  sound: {
\    notice:
\      "جب آپ کو بلایا جاتا ہے تو یہ ڈیمو آواز بجاتا ہے اور وائبریٹ کرتا ہے۔ یہ صرف اس وقت کام کرتا ہے جب یہ پیج کھلا ہو اور آپ کا فون ان لاک ہو۔",
\    turnOn: "آواز آن کریں",
\    on: "آواز آن ہے",
\  },
\  pausedHeading: "آف سائٹ انتظار روکا ہوا ہے",
\  textSize: { label: "ٹیکسٹ کا سائز", normal: "نارمل", large: "بڑا", extraLarge: "بہت بڑا" },
\  language: {
\    label: "زبان منتخب کریں",
\    draftNotice: "یہ ترجمہ ایک ڈرافٹ ہے۔ کسی روانی سے بولنے والے نے ابھی اسے چیک نہیں کیا ہے۔",
\  },
\  survey: {
\    question: "آپ اپنے انتظار کے تجربے کو کیسی ریٹنگ دیں گے؟",
\    low: "0 = بہت خراب",
\    high: "10 = بہترین",
\    submit: "جمع کرائیں",
\    thanks: "آپ کے فیڈ بیک کا شکریہ۔",
\    note: "جواب دینا اختیاری ہے۔ آپ کا نام محفوظ نہیں کیا جاتا ہے۔",
\  },
\  offline: "آپ آف لائن ہیں۔ اپنا سٹیٹس دیکھنے کے لیے دوبارہ انٹرنیٹ سے کنیکٹ کریں۔",
};
```
\*\*Back-Translations (Urdu)\*\*
\* `emergencyLine`: If your symptoms get worse, call 911 right now or come back to the emergency department.
\* `start.emergencyCheck`: Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 right now.
\* `start.paused`: Off-site waiting is paused at this time. Please come to the emergency department and wait there.
\* `patient.calledHeading`: Please come back now.
\* `patient.calledText`: Please go back to the emergency department desk.
\* `announce.called`: You have been called back. Please go back to the emergency department right now.
\* `secondAlert`: Please go back to the emergency department right away. Staff may try to reach you.
\* `announce.secondAlert`: Urgent: Please go back to the emergency department right away.
\* `returnNow.text`: Please come back right now. If you do not answer, staff will review your visit.
\* `patient.fromHomeText` (first sentence): Your place in line starts at the time when a nurse sees you in triage. The patients with the most emergencies are always seen first.
\* `start.startIntro`: Starting from here does not make your place in line. Your place in line starts at the time when a nurse sees you in triage. The patients with the most emergencies are always seen first.
\* `patient.placeCanChange`: If more emergency patients arrive your place can change. The patients with the most emergencies are always seen first.
\* `stillHere.meaning`: This tells the staff that you are still waiting. This is not a check of your health.
\*\*Translation Notes (Urdu)\*\*
\* `health811Before` and `health811After`: Urdu sentence structure places the verb at the very end of the sentence. To make the injected `811` link read naturally, `health811Before` translates to "Health811: to speak with a nurse for free" and `health811After` translates to "call \[on]." When rendered as `{Before} 811 {After}`, it perfectly forms the correct grammatical sentence.
\* `triage`: I kept the English word "triage" (ٹرائیج) transliterated, as there is no common layman Urdu equivalent that effectively communicates this specific hospital department without sounding confusing.
\## Arabic
export const ar = {
  emergencyLine: "إذا ساءت الأعراض، اتصل بـ 911 أو عُد إلى قسم الطوارئ الآن.",
  footer: "نموذج مبدئي. غير تابع أو معتمد من Trillium Health Partners. بيانات تجريبية فقط.",
  appName: "غرفة الانتظار الافتراضية",
  visitCode: "رمز الزيارة",
  siteName: "Demo Site {site}",
  newTab: "(يفتح في علامة تبويب جديدة)",
  start: {
    emergencyCheck:
      "ألم في الصدر، صعوبة في التنفس، علامات سكتة دماغية، نزيف حاد أو حالة طوارئ أخرى؟ اتصل بـ 911 الآن.",
    careHeading: "تعرف على خيارات الرعاية المتاحة لك",
    careIntro: "هذا العرض التجريبي لا يمكنه اختيار الخدمة لك. تحقق من القواعد وساعات العمل في كل موقع قبل الذهاب.",
    health811Before: "Health811: اتصل بـ",
    health811After: "للتحدث مع ممرضة مجانًا.",
    virtualCare: "الرعاية العاجلة الافتراضية",
    urgentCare: "مركز الرعاية العاجلة في Queensway Health Centre في Etobicoke.",
    pharmacist:
      "يمكن لصيدلي تقييم حالتك في ثلاثة فروع لـ Shoppers Drug Mart في Mississauga. هذا برنامج تجريبي، لذا تحقق من أنه لا يزال يعمل قبل الذهاب.",
    hoursBefore: "لمعرفة ساعات العمل والعناوين، راجع",
    hoursLink: "صفحة الطوارئ الخاصة بـ THP",
    waitTimesLink: "اطلع على أوقات الانتظار الحالية على موقع THP",
    startHeading: "بدء الزيارة",
    startIntro:
      "البدء هنا لا يحجز لك مكانًا في الطابور. يبدأ مكانك في الطابور عندما تراك ممرضة في الفرز. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
    siteQuestion: "إلى أي قسم طوارئ ستذهب؟",
    languageLabel: "اللغة",
    languageNote: "اللغات الفرنسية والأردية والعربية والماندارين ستتوفر قريباً.",
    startButton: "بدء الزيارة",
    starting: "جاري البدء...",
    paused: "الانتظار خارج الموقع متوقف مؤقتًا في الوقت الحالي. يرجى الحضور إلى قسم الطوارئ والانتظار هناك.",
    busy: "التطبيق مشغول جدًا الآن. يرجى الانتظار بضع دقائق والمحاولة مرة أخرى. يمكنك أيضًا الذهاب مباشرة إلى قسم الطوارئ.",
    notSaved: "لم يتم حفظ زيارتك. يرجى المحاولة مرة أخرى. أو اذهب إلى مكتب قسم الطوارئ.",
    checkingSaved: "جاري البحث في هذا الهاتف عن زيارة محفوظة...",
    unavailableHeading: "لا يمكننا فتح الزيارة المحفوظة على هذا الهاتف",
    unavailableText:
      "لن يتم تحميل زيارتك المحفوظة الآن. لا يمكنك بدء زيارة جديدة هنا. إذا كنت بحاجة إلى رعاية، يرجى الذهاب إلى مكتب قسم الطوارئ.",
    openHeading: "لديك زيارة مفتوحة على هذا الهاتف",
    openVisit: "افتح زيارتك",
    closedHeading: "زيارتك السابقة على هذا الهاتف",
    closedText:
      "انتهى الانتظار خارج الموقع لهذه الزيارة. قد تكون لا تزال منتظرًا في المستشفى. افتح زيارتك للتحقق.",
    expiredHeading: "انتهت صلاحية طلب زيارتك",
    startNew: "بدء زيارة تجريبية جديدة",
    demoScreens: "شاشات العرض التجريبي",
    staffScreen: "شاشة الموظفين",
    patientScreen: "شاشة المريض",
    dashboard: "لوحة التحكم",
  },
  expiredText:
    "لقد بدأت هذه الزيارة منذ أكثر من 6 ساعات. لم يتم تسجيلها مطلقًا في الفرز. لم يعد الموظفون يتوقعون وصولك.",
  patient: {
    loading: "جاري تحميل زيارتك...",
    unavailableHeading: "لا يمكننا تحميل زيارتك",
    unavailableText:
      "أفعالك على هذه الصفحة لا يتم حفظها. قد لا يراها الموظفون. يرجى الذهاب إلى مكتب قسم الطوارئ.",
    noVisitHeading: "لم يتم العثور على زيارة على هذا الهاتف",
    brokenLinkHeading: "هذا الرابط لم يعمل",
    brokenLinkText: "قد يكون الرابط خاطئًا أو مقطوعًا. لم يتم فتح أي زيارة.",
    findVisitHelp:
      "امسح رمز QR الموجود على إيصالك. يمكنك أيضًا كتابة الرابط المطبوع أسفله. إذا استمر الفشل، اطلب من المكتب إظهار رمز QR مرة أخرى.",
    waitingHeading: "الحالة: قيد الانتظار",
    placeInLine: "مكانك في الطابور:",
    placeCanChange: "يمكن أن يتغير مكانك إذا وصل مرضى حالاتهم أكثر استعجالاً. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
    waitLabel: "الوقت المقدر حتى يتم استدعاؤك للعودة:",
    waitRange: "من {low} إلى {high} دقيقة",
    simulated: "هذا التقدير محاكى للعرض التجريبي.",
    calledHeading: "يرجى العودة الآن",
    calledText: "يرجى العودة إلى مكتب قسم الطوارئ.",
    onMyWay: "أنا في طريقي",
    sending: "جاري الإرسال...",
    confirmed: "شكرًا لك. الموظفون يعلمون أنك في طريقك.",
    alertLimits: "حدود العرض التجريبي: التنبيهات على هذه الصفحة تعمل فقط عندما تكون مفتوحة وهاتفك غير مقفل.",
    notSaved: "لم يتم حفظ إجابتك. الموظفون لا يعلمون أنك نقرت عليها. يرجى المحاولة مرة أخرى أو الذهاب إلى المكتب.",
    fromHomeHeading: "الحالة: بدأت من المنزل، لم يتم الفرز بعد",
    fromHomeText: \[
      "يبدأ مكانك في الطابور عندما تراك ممرضة في الفرز. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
      "هذا التطبيق لا يسجلك أو يمنحك الإذن بالانتظار خارج الموقع.",
      "إذا ذهبت إلى قسم الطوارئ، فاتبع خطواته المعتادة. اعرض رمز الزيارة هذا للموظفين. الموظفون فقط هم من يمكنهم الموافقة على الانتظار خارج الموقع.",
    ],
    reassessHeading: "يرجى الذهاب إلى مكتب الفرز",
    reassessText: "تحتاج ممرضة إلى فحصك مرة أخرى. يحدث هذا قبل أن تعود للانضمام إلى الطابور.",
    arrivedHeading: "الحالة: جاهز عند المكتب",
    arrivedText: "يعلم الموظفون أنك عدت. يرجى البقاء في منطقة الانتظار حتى يتم استدعاؤك.",
    onsiteHeading: "الحالة: في انتظار داخل قسم الطوارئ",
    onsiteText: "أنت تنتظر داخل المستشفى. سيتصل بك الموظفون عندما يكونون مستعدين.",
    endedHeading: "انتهى انتظارك خارج الموقع",
    endedText: "يرجى الذهاب إلى مكتب قسم الطوارئ.",
    unableText:
      "لم يتمكن الموظفون من الوصول إليك، لذا فقد خرجت هذه الزيارة من طابور الانتظار خارج الموقع. إذا كنت لا تزال بحاجة إلى رعاية، يرجى الحضور إلى مكتب قسم الطوارئ.",
    removedText:
      "أنهى الموظفون الانتظار خارج الموقع لهذه الزيارة. إذا كنت لا تزال بحاجة إلى رعاية، يرجى الحضور إلى مكتب قسم الطوارئ.",
    expiredHeading: "انتهت صلاحية طلب هذه الزيارة",
    expiredHelp: "إذا كنت لا تزال بحاجة إلى رعاية، يرجى الذهاب إلى مكتب قسم الطوارئ.",
    expiredNewVisit: "أو ابدأ زيارة تجريبية جديدة على صفحة البداية.",
  },
  announce: {
    called: "لقد تم استدعاؤك للعودة. يرجى العودة إلى قسم الطوارئ الآن.",
    onTheWay: "شكرًا لك. الموظفون يعلمون أنك في طريقك.",
    arrived: "سجلك الموظفون على أنك عدت إلى قسم الطوارئ.",
    ended: "انتهى انتظارك خارج الموقع.",
    reassess: "يرجى الذهاب إلى مكتب الفرز.",
    stillHere: "يرجى النقر على الزر لتأكيد أنك لا تزال هنا.",
    secondAlert: "عاجل: يرجى العودة إلى قسم الطوارئ في الحال.",
  },
  slip: {
    typeLink: "أو اكتب هذا الرابط في متصفح هاتفك:",
  },
  stillHere: {
    heading: "هل ما زلت تتابع زيارتك؟",
    button: "أنا لا أزال هنا",
    thanks: "شكرًا لك.",
    meaning: "هذا يخبر الموظفين أنك لا تزال تنتظر. إنه ليس فحصًا لصحتك.",
  },
  secondAlert: "يرجى العودة إلى قسم الطوارئ في الحال. قد يحاول الموظفون الوصول إليك.",
  returnNow: {
    lead: "لم نسمع منك.",
    text: "يرجى العودة الآن. سيقوم الموظفون بمراجعة زيارتك إذا لم ترد.",
  },
  sound: {
    notice:
      "يقوم هذا العرض التجريبي بتشغيل صوت والاهتزاز عند استدعائك. يعمل هذا فقط عندما تكون هذه الصفحة مفتوحة وهاتفك غير مقفل.",
    turnOn: "تشغيل الصوت",
    on: "الصوت قيد التشغيل",
  },
  pausedHeading: "الانتظار خارج الموقع متوقف مؤقتًا",
  textSize: { label: "حجم النص", normal: "عادي", large: "كبير", extraLarge: "كبير جدًا" },
  language: {
    label: "اختر اللغة",
    draftNotice: "هذه الترجمة عبارة عن مسودة. لم يقم متحدث طليق بمراجعتها بعد.",
  },
  survey: {
    question: "كيف تقيم تجربتك في الانتظار؟",
    low: "0 = سيئة جدًا",
    high: "10 = ممتازة",
    submit: "إرسال",
    thanks: "شكرا لك على ملاحظاتك.",
    note: "الإجابة اختيارية. لا يتم حفظ اسمك.",
  },
  offline: "أنت غير متصل بالإنترنت. أعد الاتصال بالإنترنت لمعرفة حالتك.",
};
Back-Translations (Arabic)
emergencyLine: If symptoms get worse, call 911 or return to the emergency department now.
start.emergencyCheck: Chest pain, difficulty breathing, signs of stroke, severe bleeding or another emergency? Call 911 now.
start.paused: Off-site waiting is temporarily paused at this time. Please come to the emergency department and wait there.
patient.calledHeading: Please return now.
patient.calledText: Please return to the emergency department desk.
announce.called: You have been called to return. Please return to the emergency department now.
secondAlert: Please return to the emergency department right away. Staff may try to reach you.
announce.secondAlert: Urgent: Please return to the emergency department right away.
returnNow.text: Please return now. Staff will review your visit if you do not reply.
patient.fromHomeText (first sentence): Your place in the line starts when a nurse sees you in triage. Patients with the most urgent conditions are always examined first.
start.startIntro: Starting here does not reserve a place for you in the line. Your place in the line starts when a nurse sees you in triage. Patients with the most urgent conditions are always examined first.
patient.placeCanChange: Your place can change if patients with more urgent conditions arrive. Patients with the most urgent conditions are always examined first.
stillHere.meaning: This tells the staff that you are still waiting. It is not an examination of your health.
Translation Notes (Arabic)
triage: There is no single layman equivalent for triage in Arabic, so the standard medical translation "الفرز" (Al-Farz) is used, which translates to "sorting/categorizing".
health811Before and health811After: Translated cleanly around the 811 injection to read "Health811: Call 811 to speak with a nurse for free."
\## Mandarin
export const zh = {
  emergencyLine: "如果您的症状恶化，请立即拨打 911 或回到急诊室。",
  footer: "概念原型。与 Trillium Health Partners 无关，也未获得其认可。仅为演示数据。",
  appName: "虚拟候诊室",
  visitCode: "就诊代码",
  siteName: "Demo Site {site}",
  newTab: "（在新标签页中打开）",
  start: {
    emergencyCheck:
      "胸痛、呼吸困难、中风迹象、大出血或其他紧急情况？请立即拨打 911。",
    careHeading: "了解您的护理选择",
    careIntro: "此演示无法为您选择服务。去之前请在每个网站上查看规则和时间。",
    health811Before: "Health811：拨打",
    health811After: "免费咨询护士。",
    virtualCare: "虚拟紧急护理",
    urgentCare: "位于 Etobicoke 的 Queensway Health Centre 的紧急护理中心。",
    pharmacist:
      "药剂师可以在 Mississauga 的三家 Shoppers Drug Mart 门店为您进行评估。这是一项试点计划，所以去之前请确认它是否仍在运行。",
    hoursBefore: "有关时间和地址，请参阅",
    hoursLink: "THP 的急诊网页",
    waitTimesLink: "在 THP 网站上查看当前等待时间",
    startHeading: "开始就诊",
    startIntro:
      "在这里开始并不会保留您的排队位置。您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。",
    siteQuestion: "您要去哪个急诊室？",
    languageLabel: "语言",
    languageNote: "法语、乌尔都语、阿拉伯语和普通话即将推出。",
    startButton: "开始就诊",
    starting: "正在开始…",
    paused: "目前院外候诊已暂停。请来急诊室并在那里等候。",
    busy: "该应用程序目前太忙。请等待几分钟再试一次。您也可以直接去急诊室。",
    notSaved: "您的就诊信息未保存。请重试。或者，去急诊室前台。",
    checkingSaved: "正在此手机上检查已保存的就诊信息…",
    unavailableHeading: "我们无法打开此手机上已保存的就诊信息",
    unavailableText:
      "您保存的就诊信息现在无法加载。您不能在这里开始新的就诊。如果您需要护理，请前往急诊室前台。",
    openHeading: "您在此手机上有一个未完成的就诊",
    openVisit: "打开您的就诊",
    closedHeading: "您在此手机上过去的就诊",
    closedText:
      "该次就诊的院外候诊已经结束。您可能仍在医院里等候。打开您的就诊页面查看。",
    expiredHeading: "您的就诊请求已过期",
    startNew: "开始一次新的演示就诊",
    demoScreens: "演示屏幕",
    staffScreen: "工作人员屏幕",
    patientScreen: "患者屏幕",
    dashboard: "仪表板",
  },
  expiredText:
    "您在 6 小时前开始了这次就诊。它从未在分诊处登记过。工作人员不再期望您的到来。",
  patient: {
    loading: "正在加载您的就诊信息…",
    unavailableHeading: "我们无法加载您的就诊信息",
    unavailableText:
      "您在此页面上的操作没有被保存。工作人员可能看不到它们。请前往急诊室前台。",
    noVisitHeading: "在此手机上未找到就诊信息",
    brokenLinkHeading: "此链接无效",
    brokenLinkText: "链接可能错误或被截断。没有打开任何就诊。",
    findVisitHelp:
      "扫描凭条上的 QR 码。您也可以输入打印在它下方的链接。如果仍然失败，请要求前台再次出示 QR 码。",
    waitingHeading: "状态：等候中",
    placeInLine: "您的排队位置：",
    placeCanChange: "如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。",
    waitLabel: "预计还需多久叫您回来：",
    waitRange: "{low} 到 {high} 分钟",
    simulated: "此估计时间是为演示而模拟的。",
    calledHeading: "请现在回来",
    calledText: "请回到急诊室前台。",
    onMyWay: "我正在路上",
    sending: "正在发送…",
    confirmed: "谢谢。工作人员知道您正在路上。",
    alertLimits: "演示限制：此页面上的警报仅在页面打开且手机未锁定时有效。",
    notSaved: "您的回答未保存。工作人员不知道您点击了它。请重试或去前台。",
    fromHomeHeading: "状态：在家开始，尚未分诊",
    fromHomeText: \[
      "您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。",
      "此应用程序不会为您注册或允许您在院外候诊。",
      "如果您去急诊室，请遵循其正常步骤。向工作人员出示此就诊代码。只有工作人员才能批准院外候诊。",
    ],
    reassessHeading: "请前往分诊台",
    reassessText: "护士需要再次为您检查。这将在您重新加入队伍之前进行。",
    arrivedHeading: "状态：在前台准备就绪",
    arrivedText: "工作人员知道您回来了。请在候诊区等候，直到有人叫您。",
    onsiteHeading: "状态：在急诊室内等候",
    onsiteText: "您正在医院内等候。工作人员准备好后会叫您。",
    endedHeading: "您的院外候诊已结束",
    endedText: "请前往急诊室前台。",
    unableText:
      "工作人员无法联系到您，因此这次就诊已离开院外候诊队列。如果您仍需要护理，请来急诊室前台。",
    removedText:
      "工作人员已结束此次就诊的院外候诊。如果您仍需要护理，请来急诊室前台。",
    expiredHeading: "此就诊请求已过期",
    expiredHelp: "如果您仍需要护理，请前往急诊室前台。",
    expiredNewVisit: "或者在起始页开始一次新的演示就诊。",
  },
  announce: {
    called: "您已被叫回。请现在回到急诊室。",
    onTheWay: "谢谢。工作人员知道您正在路上。",
    arrived: "工作人员已将您标记为回到急诊室。",
    ended: "您的院外候诊已结束。",
    reassess: "请前往分诊台。",
    stillHere: "请点击按钮确认您还在这里。",
    secondAlert: "紧急：请立即回到急诊室。",
  },
  slip: {
    typeLink: "或者在手机浏览器中输入此链接：",
  },
  stillHere: {
    heading: "您还在关注您的就诊吗？",
    button: "我还在",
    thanks: "谢谢。",
    meaning: "这告诉工作人员您仍在等待。这不是对您健康状况的检查。",
  },
  secondAlert: "请立即回到急诊室。工作人员可能会试图联系您。",
  returnNow: {
    lead: "我们没有收到您的消息。",
    text: "请现在回来。如果您不回复，工作人员将审查您的就诊。",
  },
  sound: {
    notice:
      "当您被叫到时，此演示会播放声音并振动。这仅在页面打开且手机未锁定时有效。",
    turnOn: "开启声音",
    on: "声音已开启",
  },
  pausedHeading: "院外候诊已暂停",
  textSize: { label: "文本大小", normal: "正常", large: "大", extraLarge: "超大" },
  language: {
    label: "选择语言",
    draftNotice: "此翻译是草稿。流利的母语人士尚未检查过它。",
  },
  survey: {
    question: "您如何评价您的等待体验？",
    low: "0 = 非常差",
    high: "10 = 极好",
    submit: "提交",
    thanks: "感谢您的反馈。",
    note: "回答是可选的。您的名字不会被保存。",
  },
  offline: "您已离线。请重新连接到互联网以查看您的状态。",
};
Here are the final two languages, Modern Standard Arabic (`ar`) and Mandarin (`zh`), following your exact rules and shape.
\### Arabic (`ar`)
```ts
export const ar = {
\  emergencyLine: "إذا ساءت الأعراض، اتصل بـ 911 أو عُد إلى قسم الطوارئ الآن.",
\  footer: "نموذج مبدئي. غير تابع أو معتمد من Trillium Health Partners. بيانات تجريبية فقط.",
\  appName: "غرفة الانتظار الافتراضية",
\  visitCode: "رمز الزيارة",
\  siteName: "Demo Site {site}",
\  newTab: "(يفتح في علامة تبويب جديدة)",
\  start: {
\    emergencyCheck:
\      "ألم في الصدر، صعوبة في التنفس، علامات سكتة دماغية، نزيف حاد أو حالة طوارئ أخرى؟ اتصل بـ 911 الآن.",
\    careHeading: "تعرف على خيارات الرعاية المتاحة لك",
\    careIntro: "هذا العرض التجريبي لا يمكنه اختيار الخدمة لك. تحقق من القواعد وساعات العمل في كل موقع قبل الذهاب.",
\    health811Before: "Health811: اتصل بـ",
\    health811After: "للتحدث مع ممرضة مجانًا.",
\    virtualCare: "الرعاية العاجلة الافتراضية",
\    urgentCare: "مركز الرعاية العاجلة في Queensway Health Centre في Etobicoke.",
\    pharmacist:
\      "يمكن لصيدلي تقييم حالتك في ثلاثة فروع لـ Shoppers Drug Mart في Mississauga. هذا برنامج تجريبي، لذا تحقق من أنه لا يزال يعمل قبل الذهاب.",
\    hoursBefore: "لمعرفة ساعات العمل والعناوين، راجع",
\    hoursLink: "صفحة الطوارئ الخاصة بـ THP",
\    waitTimesLink: "اطلع على أوقات الانتظار الحالية على موقع THP",
\    startHeading: "بدء الزيارة",
\    startIntro:
\      "البدء هنا لا يحجز لك مكانًا في الطابور. يبدأ مكانك في الطابور عندما تراك ممرضة في الفرز. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
\    siteQuestion: "إلى أي قسم طوارئ ستذهب؟",
\    languageLabel: "اللغة",
\    languageNote: "اللغات الفرنسية والأردية والعربية والماندارين ستتوفر قريباً.",
\    startButton: "بدء الزيارة",
\    starting: "جاري البدء...",
\    paused: "الانتظار خارج الموقع متوقف مؤقتًا في الوقت الحالي. يرجى الحضور إلى قسم الطوارئ والانتظار هناك.",
\    busy: "التطبيق مشغول جدًا الآن. يرجى الانتظار بضع دقائق والمحاولة مرة أخرى. يمكنك أيضًا الذهاب مباشرة إلى قسم الطوارئ.",
\    notSaved: "لم يتم حفظ زيارتك. يرجى المحاولة مرة أخرى. أو اذهب إلى مكتب قسم الطوارئ.",
\    checkingSaved: "جاري البحث في هذا الهاتف عن زيارة محفوظة...",
\    unavailableHeading: "لا يمكننا فتح الزيارة المحفوظة على هذا الهاتف",
\    unavailableText:
\      "لن يتم تحميل زيارتك المحفوظة الآن. لا يمكنك بدء زيارة جديدة هنا. إذا كنت بحاجة إلى رعاية، يرجى الذهاب إلى مكتب قسم الطوارئ.",
\    openHeading: "لديك زيارة مفتوحة على هذا الهاتف",
\    openVisit: "افتح زيارتك",
\    closedHeading: "زيارتك السابقة على هذا الهاتف",
\    closedText:
\      "انتهى الانتظار خارج الموقع لهذه الزيارة. قد تكون لا تزال منتظرًا في المستشفى. افتح زيارتك للتحقق.",
\    expiredHeading: "انتهت صلاحية طلب زيارتك",
\    startNew: "بدء زيارة تجريبية جديدة",
\    demoScreens: "شاشات العرض التجريبي",
\    staffScreen: "شاشة الموظفين",
\    patientScreen: "شاشة المريض",
\    dashboard: "لوحة التحكم",
\  },
\  expiredText:
\    "لقد بدأت هذه الزيارة منذ أكثر من 6 ساعات. لم يتم تسجيلها مطلقًا في الفرز. لم يعد الموظفون يتوقعون وصولك.",
\  patient: {
\    loading: "جاري تحميل زيارتك...",
\    unavailableHeading: "لا يمكننا تحميل زيارتك",
\    unavailableText:
\      "أفعالك على هذه الصفحة لا يتم حفظها. قد لا يراها الموظفون. يرجى الذهاب إلى مكتب قسم الطوارئ.",
\    noVisitHeading: "لم يتم العثور على زيارة على هذا الهاتف",
\    brokenLinkHeading: "هذا الرابط لم يعمل",
\    brokenLinkText: "قد يكون الرابط خاطئًا أو مقطوعًا. لم يتم فتح أي زيارة.",
\    findVisitHelp:
\      "امسح رمز QR الموجود على إيصالك. يمكنك أيضًا كتابة الرابط المطبوع أسفله. إذا استمر الفشل، اطلب من المكتب إظهار رمز QR مرة أخرى.",
\    waitingHeading: "الحالة: قيد الانتظار",
\    placeInLine: "مكانك في الطابور:",
\    placeCanChange: "يمكن أن يتغير مكانك إذا وصل مرضى حالاتهم أكثر استعجالاً. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
\    waitLabel: "الوقت المقدر حتى يتم استدعاؤك للعودة:",
\    waitRange: "من {low} إلى {high} دقيقة",
\    simulated: "هذا التقدير محاكى للعرض التجريبي.",
\    calledHeading: "يرجى العودة الآن",
\    calledText: "يرجى العودة إلى مكتب قسم الطوارئ.",
\    onMyWay: "أنا في طريقي",
\    sending: "جاري الإرسال...",
\    confirmed: "شكرًا لك. الموظفون يعلمون أنك في طريقك.",
\    alertLimits: "حدود العرض التجريبي: التنبيهات على هذه الصفحة تعمل فقط عندما تكون مفتوحة وهاتفك غير مقفل.",
\    notSaved: "لم يتم حفظ إجابتك. الموظفون لا يعلمون أنك نقرت عليها. يرجى المحاولة مرة أخرى أو الذهاب إلى المكتب.",
\    fromHomeHeading: "الحالة: بدأت من المنزل، لم يتم الفرز بعد",
\    fromHomeText: \\\[
\      "يبدأ مكانك في الطابور عندما تراك ممرضة في الفرز. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.",
\      "هذا التطبيق لا يسجلك أو يمنحك الإذن بالانتظار خارج الموقع.",
\      "إذا ذهبت إلى قسم الطوارئ، فاتبع خطواته المعتادة. اعرض رمز الزيارة هذا للموظفين. الموظفون فقط هم من يمكنهم الموافقة على الانتظار خارج الموقع.",
\    ],
\    reassessHeading: "يرجى الذهاب إلى مكتب الفرز",
\    reassessText: "تحتاج ممرضة إلى فحصك مرة أخرى. يحدث هذا قبل أن تعود للانضمام إلى الطابور.",
\    arrivedHeading: "الحالة: جاهز عند المكتب",
\    arrivedText: "يعلم الموظفون أنك عدت. يرجى البقاء في منطقة الانتظار حتى يتم استدعاؤك.",
\    onsiteHeading: "الحالة: في انتظار داخل قسم الطوارئ",
\    onsiteText: "أنت تنتظر داخل المستشفى. سيتصل بك الموظفون عندما يكونون مستعدين.",
\    endedHeading: "انتهى انتظارك خارج الموقع",
\    endedText: "يرجى الذهاب إلى مكتب قسم الطوارئ.",
\    unableText:
\      "لم يتمكن الموظفون من الوصول إليك، لذا فقد خرجت هذه الزيارة من طابور الانتظار خارج الموقع. إذا كنت لا تزال بحاجة إلى رعاية، يرجى الحضور إلى مكتب قسم الطوارئ.",
\    removedText:
\      "أنهى الموظفون الانتظار خارج الموقع لهذه الزيارة. إذا كنت لا تزال بحاجة إلى رعاية، يرجى الحضور إلى مكتب قسم الطوارئ.",
\    expiredHeading: "انتهت صلاحية طلب هذه الزيارة",
\    expiredHelp: "إذا كنت لا تزال بحاجة إلى رعاية، يرجى الذهاب إلى مكتب قسم الطوارئ.",
\    expiredNewVisit: "أو ابدأ زيارة تجريبية جديدة على صفحة البداية.",
\  },
\  announce: {
\    called: "لقد تم استدعاؤك للعودة. يرجى العودة إلى قسم الطوارئ الآن.",
\    onTheWay: "شكرًا لك. الموظفون يعلمون أنك في طريقك.",
\    arrived: "سجلك الموظفون على أنك عدت إلى قسم الطوارئ.",
\    ended: "انتهى انتظارك خارج الموقع.",
\    reassess: "يرجى الذهاب إلى مكتب الفرز.",
\    stillHere: "يرجى النقر على الزر لتأكيد أنك لا تزال هنا.",
\    secondAlert: "عاجل: يرجى العودة إلى قسم الطوارئ في الحال.",
\  },
\  slip: {
\    typeLink: "أو اكتب هذا الرابط في متصفح هاتفك:",
\  },
\  stillHere: {
\    heading: "هل ما زلت تتابع زيارتك؟",
\    button: "أنا لا أزال هنا",
\    thanks: "شكرًا لك.",
\    meaning: "هذا يخبر الموظفين أنك لا تزال تنتظر. إنه ليس فحصًا لصحتك.",
\  },
\  secondAlert: "يرجى العودة إلى قسم الطوارئ في الحال. قد يحاول الموظفون الوصول إليك.",
\  returnNow: {
\    lead: "لم نسمع منك.",
\    text: "يرجى العودة الآن. سيقوم الموظفون بمراجعة زيارتك إذا لم ترد.",
\  },
\  sound: {
\    notice:
\      "يقوم هذا العرض التجريبي بتشغيل صوت والاهتزاز عند استدعائك. يعمل هذا فقط عندما تكون هذه الصفحة مفتوحة وهاتفك غير مقفل.",
\    turnOn: "تشغيل الصوت",
\    on: "الصوت قيد التشغيل",
\  },
\  pausedHeading: "الانتظار خارج الموقع متوقف مؤقتًا",
\  textSize: { label: "حجم النص", normal: "عادي", large: "كبير", extraLarge: "كبير جدًا" },
\  language: {
\    label: "اختر اللغة",
\    draftNotice: "هذه الترجمة عبارة عن مسودة. لم يقم متحدث طليق بمراجعتها بعد.",
\  },
\  survey: {
\    question: "كيف تقيم تجربتك في الانتظار؟",
\    low: "0 = سيئة جدًا",
\    high: "10 = ممتازة",
\    submit: "إرسال",
\    thanks: "شكرا لك على ملاحظاتك.",
\    note: "الإجابة اختيارية. لا يتم حفظ اسمك.",
\  },
\  offline: "أنت غير متصل بالإنترنت. أعد الاتصال بالإنترنت لمعرفة حالتك.",
};
```
\*\*Back-Translations (Arabic)\*\*
\* `emergencyLine`: If symptoms get worse, call 911 or return to the emergency department now.
\* `start.emergencyCheck`: Chest pain, difficulty breathing, signs of stroke, severe bleeding or another emergency? Call 911 now.
\* `start.paused`: Off-site waiting is temporarily paused at this time. Please come to the emergency department and wait there.
\* `patient.calledHeading`: Please return now.
\* `patient.calledText`: Please return to the emergency department desk.
\* `announce.called`: You have been called to return. Please return to the emergency department now.
\* `secondAlert`: Please return to the emergency department right away. Staff may try to reach you.
\* `announce.secondAlert`: Urgent: Please return to the emergency department right away.
\* `returnNow.text`: Please return now. Staff will review your visit if you do not reply.
\* `patient.fromHomeText` (first sentence): Your place in the line starts when a nurse sees you in triage. Patients with the most urgent conditions are always examined first.
\* `start.startIntro`: Starting here does not reserve a place for you in the line. Your place in the line starts when a nurse sees you in triage. Patients with the most urgent conditions are always examined first.
\* `patient.placeCanChange`: Your place can change if patients with more urgent conditions arrive. Patients with the most urgent conditions are always examined first.
\* `stillHere.meaning`: This tells the staff that you are still waiting. It is not an examination of your health.
\*\*Translation Notes (Arabic)\*\*
\* `triage`: There is no single layman equivalent for triage in Arabic, so the standard medical translation "الفرز" (Al-Farz) is used, which translates to "sorting/categorizing".
\* `health811Before` and `health811After`: Translated cleanly around the 811 injection to read "Health811: Call 811 to speak with a nurse for free."
\---
\### Mandarin (`zh`)
```ts
export const zh = {
\  emergencyLine: "如果您的症状恶化，请立即拨打 911 或回到急诊室。",
\  footer: "概念原型。与 Trillium Health Partners 无关，也未获得其认可。仅为演示数据。",
\  appName: "虚拟候诊室",
\  visitCode: "就诊代码",
\  siteName: "Demo Site {site}",
\  newTab: "（在新标签页中打开）",
\  start: {
\    emergencyCheck:
\      "胸痛、呼吸困难、中风迹象、大出血或其他紧急情况？请立即拨打 911。",
\    careHeading: "了解您的护理选择",
\    careIntro: "此演示无法为您选择服务。去之前请在每个网站上查看规则和时间。",
\    health811Before: "Health811：拨打",
\    health811After: "免费咨询护士。",
\    virtualCare: "虚拟紧急护理",
\    urgentCare: "位于 Etobicoke 的 Queensway Health Centre 的紧急护理中心。",
\    pharmacist:
\      "药剂师可以在 Mississauga 的三家 Shoppers Drug Mart 门店为您进行评估。这是一项试点计划，所以去之前请确认它是否仍在运行。",
\    hoursBefore: "有关时间和地址，请参阅",
\    hoursLink: "THP 的急诊网页",
\    waitTimesLink: "在 THP 网站上查看当前等待时间",
\    startHeading: "开始就诊",
\    startIntro:
\      "在这里开始并不会保留您的排队位置。您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。",
\    siteQuestion: "您要去哪个急诊室？",
\    languageLabel: "语言",
\    languageNote: "法语、乌尔都语、阿拉伯语和普通话即将推出。",
\    startButton: "开始就诊",
\    starting: "正在开始…",
\    paused: "目前院外候诊已暂停。请来急诊室并在那里等候。",
\    busy: "该应用程序目前太忙。请等待几分钟再试一次。您也可以直接去急诊室。",
\    notSaved: "您的就诊信息未保存。请重试。或者，去急诊室前台。",
\    checkingSaved: "正在此手机上检查已保存的就诊信息…",
\    unavailableHeading: "我们无法打开此手机上已保存的就诊信息",
\    unavailableText:
\      "您保存的就诊信息现在无法加载。您不能在这里开始新的就诊。如果您需要护理，请前往急诊室前台。",
\    openHeading: "您在此手机上有一个未完成的就诊",
\    openVisit: "打开您的就诊",
\    closedHeading: "您在此手机上过去的就诊",
\    closedText:
\      "该次就诊的院外候诊已经结束。您可能仍在医院里等候。打开您的就诊页面查看。",
\    expiredHeading: "您的就诊请求已过期",
\    startNew: "开始一次新的演示就诊",
\    demoScreens: "演示屏幕",
\    staffScreen: "工作人员屏幕",
\    patientScreen: "患者屏幕",
\    dashboard: "仪表板",
\  },
\  expiredText:
\    "您在 6 小时前开始了这次就诊。它从未在分诊处登记过。工作人员不再期望您的到来。",
\  patient: {
\    loading: "正在加载您的就诊信息…",
\    unavailableHeading: "我们无法加载您的就诊信息",
\    unavailableText:
\      "您在此页面上的操作没有被保存。工作人员可能看不到它们。请前往急诊室前台。",
\    noVisitHeading: "在此手机上未找到就诊信息",
\    brokenLinkHeading: "此链接无效",
\    brokenLinkText: "链接可能错误或被截断。没有打开任何就诊。",
\    findVisitHelp:
\      "扫描凭条上的 QR 码。您也可以输入打印在它下方的链接。如果仍然失败，请要求前台再次出示 QR 码。",
\    waitingHeading: "状态：等候中",
\    placeInLine: "您的排队位置：",
\    placeCanChange: "如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。",
\    waitLabel: "预计还需多久叫您回来：",
\    waitRange: "{low} 到 {high} 分钟",
\    simulated: "此估计时间是为演示而模拟的。",
\    calledHeading: "请现在回来",
\    calledText: "请回到急诊室前台。",
\    onMyWay: "我正在路上",
\    sending: "正在发送…",
\    confirmed: "谢谢。工作人员知道您正在路上。",
\    alertLimits: "演示限制：此页面上的警报仅在页面打开且手机未锁定时有效。",
\    notSaved: "您的回答未保存。工作人员不知道您点击了它。请重试或去前台。",
\    fromHomeHeading: "状态：在家开始，尚未分诊",
\    fromHomeText: \\\[
\      "您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。",
\      "此应用程序不会为您注册或允许您在院外候诊。",
\      "如果您去急诊室，请遵循其正常步骤。向工作人员出示此就诊代码。只有工作人员才能批准院外候诊。",
\    ],
\    reassessHeading: "请前往分诊台",
\    reassessText: "护士需要再次为您检查。这将在您重新加入队伍之前进行。",
\    arrivedHeading: "状态：在前台准备就绪",
\    arrivedText: "工作人员知道您回来了。请在候诊区等候，直到有人叫您。",
\    onsiteHeading: "状态：在急诊室内等候",
\    onsiteText: "您正在医院内等候。工作人员准备好后会叫您。",
\    endedHeading: "您的院外候诊已结束",
\    endedText: "请前往急诊室前台。",
\    unableText:
\      "工作人员无法联系到您，因此这次就诊已离开院外候诊队列。如果您仍需要护理，请来急诊室前台。",
\    removedText:
\      "工作人员已结束此次就诊的院外候诊。如果您仍需要护理，请来急诊室前台。",
\    expiredHeading: "此就诊请求已过期",
\    expiredHelp: "如果您仍需要护理，请前往急诊室前台。",
\    expiredNewVisit: "或者在起始页开始一次新的演示就诊。",
\  },
\  announce: {
\    called: "您已被叫回。请现在回到急诊室。",
\    onTheWay: "谢谢。工作人员知道您正在路上。",
\    arrived: "工作人员已将您标记为回到急诊室。",
\    ended: "您的院外候诊已结束。",
\    reassess: "请前往分诊台。",
\    stillHere: "请点击按钮确认您还在这里。",
\    secondAlert: "紧急：请立即回到急诊室。",
\  },
\  slip: {
\    typeLink: "或者在手机浏览器中输入此链接：",
\  },
\  stillHere: {
\    heading: "您还在关注您的就诊吗？",
\    button: "我还在",
\    thanks: "谢谢。",
\    meaning: "这告诉工作人员您仍在等待。这不是对您健康状况的检查。",
\  },
\  secondAlert: "请立即回到急诊室。工作人员可能会试图联系您。",
\  returnNow: {
\    lead: "我们没有收到您的消息。",
\    text: "请现在回来。如果您不回复，工作人员将审查您的就诊。",
\  },
\  sound: {
\    notice:
\      "当您被叫到时，此演示会播放声音并振动。这仅在页面打开且手机未锁定时有效。",
\    turnOn: "开启声音",
\    on: "声音已开启",
\  },
\  pausedHeading: "院外候诊已暂停",
\  textSize: { label: "文本大小", normal: "正常", large: "大", extraLarge: "超大" },
\  language: {
\    label: "选择语言",
\    draftNotice: "此翻译是草稿。流利的母语人士尚未检查过它。",
\  },
\  survey: {
\    question: "您如何评价您的等待体验？",
\    low: "0 = 非常差",
\    high: "10 = 极好",
\    submit: "提交",
\    thanks: "感谢您的反馈。",
\    note: "回答是可选的。您的名字不会被保存。",
\  },
\  offline: "您已离线。请重新连接到互联网以查看您的状态。",
};
```
\*\*Back-Translations (Mandarin)\*\*
\* `emergencyLine`: If your symptoms worsen, please immediately call 911 or return to the emergency room.
\* `start.emergencyCheck`: Chest pain, breathing difficulties, signs of stroke, heavy bleeding, or other emergencies? Please call 911 immediately.
\* `start.paused`: Currently off-site waiting has been paused. Please come to the emergency room and wait there.
\* `patient.calledHeading`: Please come back now.
\* `patient.calledText`: Please return to the emergency room front desk.
\* `announce.called`: You have been called back. Please return to the emergency room now.
\* `secondAlert`: Please immediately return to the emergency room. Staff may try to contact you.
\* `announce.secondAlert`: Urgent: Please immediately return to the emergency room.
\* `returnNow.text`: Please come back now. If you do not reply, staff will review your visit.
\* `patient.fromHomeText` (first sentence): Your queue position starts counting from when a nurse sees you at the triage desk (triage). The most urgent patients always see a doctor first.
\* `start.startIntro`: Starting here will not reserve your queue position. Your queue position starts counting from when a nurse sees you at the triage desk (triage). The most urgent patients always see a doctor first.
\* `patient.placeCanChange`: If more urgent patients arrive, your position might change. The most urgent patients always see a doctor first.
\* `stillHere.meaning`: This tells staff you are still waiting. This is not a check on your health condition.
\*\*Translation Notes (Mandarin)\*\*
\* `triage`: I kept the English word `(triage)` next to the Chinese translation (分诊处) to ensure clarity, as requested by the rule to not introduce ambiguity into hospital steps.
\* `health811Before` and `health811After`: Formats correctly in Mandarin as "Health811: Dial 811 to consult a nurse for free."
