// Patient text in Canadian French. DRAFT: written by Gemini 3.1 Pro on 2026-11-10/11
// (handoffs/archive/2026-11-10-gemini-translations-phase3.md) and not yet approved by a
// fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
// handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
// Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
// The 2 new announce lines (waiting, onsite) are a draft by Claude, 2026-11-16, not yet approved.

import type { DurationWords } from "./durationWords";
import type { PatientText } from "./en";

export const fr: PatientText = {
  emergencyLine: "Si vos symptômes s'aggravent, appelez le 911 ou revenez immédiatement aux urgences.",
  footer: "Prototype conceptuel. Non affilié à ou approuvé par Trillium Health Partners. Données de démonstration uniquement.",
  appName: "WaitWell : Salle d'attente virtuelle",
  visitCode: "Code de visite",
  siteName: "Demo Site {site}",
  newTab: "(s'ouvre dans un nouvel onglet)",
  start: {
    emergencyCheck:
      "Douleur thoracique, difficulté à respirer, signes d'un accident vasculaire cérébral, saignement abondant ou autre urgence ? Appelez le 911 maintenant.",
    careHeading: "Renseignez-vous sur vos options de soins",
    careIntro: "Cette démonstration ne peut pas choisir un service pour vous. Vérifiez les règles et les heures d'ouverture sur chaque site avant de vous y rendre.",
    health811Before: "Health811 : Appelez le",
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
    noPhone: "Vous avez besoin d'un téléphone intelligent avec accès à Internet pour attendre hors site. Si vous n'en avez pas, attendez aux urgences comme d'habitude.",
    howHeading: "Comment ça fonctionne",
    // Step 2 is patient.fromHomeText[0] (SPEC), so it is not here.
    howSteps: [
      "Appuyez sur \"Commencer une visite\" à la maison ou en attendant à l'hôpital. Commencer une visite ne réserve pas de place dans la file.",
      "Le personnel décide si vous pouvez attendre hors site. Vous devez accepter et pouvoir revenir dans les 20 minutes. Si vous n'avez pas commencé sur votre téléphone, le personnel vous remet un feuillet papier.",
      "Suivez votre place dans la file, votre statut et l'intervalle d'attente simulé sur votre téléphone. Appuyez sur \"Je suis toujours ici\" toutes les 30 minutes.",
      "Lorsque votre statut est \"Veuillez revenir maintenant\", appuyez sur \"Je suis en route\". Revenez dans les 20 minutes.",
      "Allez au bureau du service des urgences à votre retour. Dites au personnel que vous êtes de retour.",
    ],
    questionsHeading: "Questions",
    questions: {
      holdPlace: {
        q: "Est-ce que commencer une visite depuis la maison réserve ma place?",
        a: "Commencer depuis la maison ne réserve pas de place dans la file. {triage}",
      },
      placeChanged: { q: "Pourquoi ma place dans la file a-t-elle changé?" },
      stillHere: {
        q: "Que se passe-t-il si je n'appuie pas sur \"Je suis toujours ici\"?",
        a: "Après 10 minutes, le personnel voit un avis sur votre visite. Appuyer sur ce bouton indique seulement au personnel que vous attendez toujours, et non comment vous vous sentez.",
      },
      noReply: {
        q: "Que se passe-t-il si je ne réponds pas quand on me demande de revenir?",
        a: "Une deuxième alerte s'affiche après 10 minutes. Si vous n'appuyez pas sur \"Je suis en route\" dans les 20 minutes, le personnel examinera votre visite.",
      },
      worse: { q: "Que faire si mes symptômes s'aggravent?" },
      saves: {
        q: "Qu'est-ce que l'application enregistre à mon sujet?",
        a: "L'application n'enregistre aucun nom, numéro de carte santé, numéro de téléphone ni symptôme. Les dossiers de l'application sont supprimés après 24 heures.",
      },
      reopen: {
        q: "Comment ouvrir ma visite de nouveau?",
        a: "Ouvrez-la de la même façon que la première fois, sur le même téléphone, ou scannez votre feuillet papier. Un code QR ou une application de texto ou de messagerie peut ouvrir son propre navigateur, et un autre téléphone ou une fenêtre de navigation privée n'aura pas votre visite.",
      },
      paused: { q: "Que se passe-t-il si le personnel suspend l'attente hors site?", a: "Vous verrez ce message : \"{message}\"" },
    },
    demoScreens: "Écrans de démonstration",
    staffScreen: "Écran du personnel",
    patientScreen: "Écran du patient",
    dashboard: "Tableau de bord",
  },
  expiredText:
    "Vous avez commencé cette visite il y a plus de 6 heures. Aucune infirmière ne vous a vu pour cette visite. Le personnel ne s'attend plus à ce que vous arriviez.",
  patient: {
    loading: "Chargement de votre visite…",
    unavailableHeading: "Nous ne pouvons pas charger votre visite",
    unavailableText:
      "Nous ne pouvons pas afficher votre visite pour le moment. Si vous avez besoin de soins, veuillez vous rendre au bureau du service des urgences.",
    noVisitHeading: "Aucune visite trouvée sur ce téléphone",
    brokenLinkHeading: "Ce lien n'a pas fonctionné",
    brokenLinkText: "Le lien pourrait être erroné ou coupé court. Aucune visite n'a été ouverte.",
    replacedLinkHeading: "Ce lien de visite ne fonctionne pas ou n'est plus actif",
    replacedLinkText: "Veuillez demander de l'aide au bureau du service des urgences.",
    findVisitHelp:
      "Scannez le code QR sur votre billet. Vous pouvez également taper le lien imprimé en dessous. Si cela échoue toujours, demandez au bureau de vous montrer à nouveau le code QR.",
    waitingHeading: "Statut : En attente",
    placeInLine: "Votre place dans la file d'attente :",
    placeCanChange: "Votre place peut changer si des patients plus urgents arrivent. Les patients les plus urgents sont toujours vus en premier.",
    waitLabel: "Temps estimé avant d'être rappelé :",
    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
    // from an hour, each end is built from the Duration words below.
    waitRangeLong: "{low} à {high}",
    simulated: "Cette estimation est simulée pour la démonstration.",
    beforeHeading: "Avant de partir",
    beforeItems: [
      "Gardez cette page ouverte et votre téléphone déverrouillé. Les alertes ne peuvent pas allumer un téléphone verrouillé.",
      "Gardez votre téléphone chargé et le son activé.",
      "Restez à moins de 20 minutes des urgences.",
      "Gardez votre feuillet papier si vous en avez reçu un, pour pouvoir scanner le code de nouveau.",
    ],
    calledHeading: "Veuillez revenir maintenant",
    calledText: "Veuillez retourner au bureau du service des urgences.",
    onMyWay: "Je suis en route",
    sending: "Envoi en cours…",
    confirmed: "Merci. Le personnel sait que vous êtes en route.",
    notSaved: "Votre réponse n'a pas été enregistrée. Le personnel ne sait pas que vous êtes en route. Veuillez réessayer ou vous rendre au bureau.",
    fromHomeHeading: "Statut : Commencée depuis la maison, pas encore vue par une infirmière",
    fromHomeText: [
      "Votre place dans la file commence lorsqu'une infirmière vous voit au triage. Les patients les plus urgents sont toujours vus en premier.",
      "Cette application ne vous enregistre pas à l'hôpital et ne vous permet pas d'attendre hors de l'hôpital.",
      "Quand vous arrivez au service des urgences, enregistrez-vous au bureau d'accueil et montrez ce code de visite. Seul le personnel peut vous permettre d'attendre hors de l'hôpital.",
    ],
    reassessHeading: "Veuillez vous rendre au bureau de triage",
    reassessText: "Une infirmière doit vous examiner de nouveau avant que vous retourniez dans la file d'attente.",
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
    called: "C'est votre tour. Veuillez revenir au service des urgences maintenant.",
    onTheWay: "Merci. Le personnel sait que vous êtes en route.",
    arrived: "Le personnel vous a marqué comme étant de retour au service des urgences.",
    ended: "Votre attente hors site est terminée.",
    reassess: "Veuillez vous rendre au bureau de triage.",
    stillHere: "Veuillez appuyer sur le bouton pour confirmer que vous êtes toujours ici.",
    secondAlert: "Urgent : Veuillez retourner au service des urgences immédiatement.",
    waiting: "Vous êtes maintenant dans la file d'attente hors site. Cette page indique votre place dans la file.",
    onsite: "Veuillez attendre à l'intérieur du service des urgences. Le personnel vous appellera lorsqu'il sera prêt.",
    expired: "Cette demande de visite a expiré. Si vous avez toujours besoin de soins, veuillez vous rendre au bureau du service des urgences.",
  },
  slip: {
    typeLink: "Ou tapez ce lien dans le navigateur de votre téléphone :",
  },
  stillHere: {
    heading: "Suivez-vous toujours votre visite ?",
    button: "Je suis toujours ici",
    thanks: "Merci.",
    meaning: "Cela indique au personnel que vous attendez toujours. Ce n'est pas un bilan de votre santé.",
    notSaved: "Votre appui sur le bouton n'a pas été enregistré. Le personnel ne sait peut-être pas que vous attendez toujours. Veuillez réessayer.",
  },
  secondAlert: "Veuillez revenir au service des urgences immédiatement. Le personnel peut appeler votre téléphone.",
  returnNow: {
    lead: "Nous n'avons pas eu de vos nouvelles.",
    text: "Veuillez revenir maintenant. Le personnel examinera votre visite si vous ne répondez pas.",
  },
  sound: {
    notice:
      "Cette démonstration peut émettre un son quand vous êtes appelé. Elle vibre aussi si votre téléphone le permet. Les alertes fonctionnent seulement quand cette page est ouverte et que votre téléphone est déverrouillé. Désactivez le mode silencieux de votre téléphone pour entendre le son.",
    turnOn: "Activer le son",
    on: "Le son est activé",
    failed: "Le son n'a pas pu démarrer sur ce téléphone. Regardez cet écran pour voir quand vous êtes appelé.",
    turnOff: "Désactiver le son",
    offWhileCalled: "Le son est désactivé. Appuyez sur « Activer le son » pour avoir des alertes sonores.",
  },
  pausedHeading: "L'attente hors site est suspendue",
  textSize: { label: "Taille du texte", normal: "Normale", large: "Grande", extraLarge: "Très grande" },
  language: {
    label: "Choisir la langue",
    draftNotice: "Cette traduction est un brouillon. Un locuteur courant ne l'a pas encore vérifiée.",
    draftTag: "brouillon",
    interpreter: "Besoin d'une autre langue ? Demandez un interprète gratuit au bureau du service des urgences.",
  },
  survey: {
    question: "Comment évalueriez-vous votre expérience d'attente ?",
    low: "0 = Très mauvaise",
    high: "10 = Excellente",
    submit: "Soumettre",
    thanks: "Merci pour vos commentaires.",
    note: "La réponse est facultative. Votre nom n'est pas enregistré.",
    notSaved: "Votre réponse n'a pas été enregistrée. Veuillez réessayer.",
  },
  offline: "Vous êtes hors ligne. Reconnectez-vous à Internet pour voir votre statut.",
};

/** Hour and minute words for the wait range (lib/waitText.ts). */
export const frDuration: DurationWords = {
  locale: "fr",
  hour: { one: "{n} heure", other: "{n} heures" },
  minute: { one: "{n} minute", other: "{n} minutes" },
  join: "{h} {m}",
};
