# Gemini review: workflow and screen consistency (Phase 3)

Model: Gemini Hydrogen 4, High, in a new chat. Date: 2026-11-18. Branch `phase3-review-fixes`.

## Prompt to paste

You review a concept prototype of a virtual ER waiting room. Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when staff recall them. Staff use a tablet or laptop. All data is synthetic. The stack is Next.js (App Router), React 19, TypeScript, Tailwind and Supabase.

Your job is to find problems, not to confirm that the work is good. Another chat of the same model family wrote parts of this text, so do not trust it. If you find no problem in an area, say "no problem found" for that area, and do not invent one.

Look for these problems, in this order:

1. Labels that do not match between the patient screens and the staff screens. Example: the patient sees one name for a step, and staff see a different name for the same step, so a staff member on the phone with a patient cannot match them.
2. Statuses or states that have no clear screen, or a screen that the patient cannot leave or understand. Use the status list in the SPEC (Data section) and the status-to-screen map in `PatientStatus.tsx` and `VisitScreen.tsx` below.
3. Workflow steps that are confusing for staff: an order of buttons that invites a wrong tap, a confirm step that is missing on an action that cannot be undone, or two buttons that seem to do the same thing.
4. Wording that is not consistent: the same thing said in two different ways, different units or time words, different tone, or a term that appears on one screen and never gets explained.
5. Any break of the SPEC hard rules below (for example a screen that gives medical advice, or that says the wait is exact).
6. Bugs in the two small fixes in the section "Small fixes to review" at the end: the thank-you card and the size of the draft notice. Look for timer bugs, a status box that a screen reader misses or hears twice, tests that do not prove what their names say, and anything the diff breaks. The design of the thank-you card is settled (see below), so review only its code.

Important context:

- The French, Urdu, Arabic and Mandarin texts are drafts that nobody has reviewed yet. They are not in this handoff. Review only the English text. Do not report translation problems.
- These are settled decisions. Do not report them as faults:
  - The thank-you after "I'm still here" goes into a hidden status box that empties after 3 seconds, and a visible card shows the same words (`StillHerePrompt.tsx`).
  - A missed "I'm still here" tap only shows a flag to staff. It never removes the patient from the line, and the flag says "Not a health check."
  - "Seen (screen shown, not necessarily read)" is on purpose: the app knows only that the called screen was on the phone.
  - The draft language option reads "Francais (French) - draft".
- Known open points that are already in our list, so do not report them again: the English screen for a short time before hydration in a saved non-English language; mixed text direction in the Urdu and Arabic menu options; the 2 links in `CareOptions.tsx` whose text sits at the top of their 44 px box.

For each problem, give:

- A number.
- The file and the line or the text key (for example `en.ts` `patient.calledHeading`).
- What is wrong, in one or two sentences.
- Who it hurts (patient or staff) and how.
- A fix, with the exact new words if it is a wording fix.
- How sure you are: high, medium or low.

Put the problems in order of harm, the worst first. Use plain English and short sentences.

## Checked

- `npm test`: 63 test files, 355 tests passed (2026-11-18, after commit 38ee12c).
- `npm run lint`: 0 errors, 2 warnings, both in `.playwright-mcp` helpers (2026-11-18).
- `npm run build`: passed (2026-11-18).
- axe-core (WCAG 2.2 AA rules) on every patient screen, /login and /staff at 320, 390, 768 and 1280 px, 100% and 200% text: no faults (docs/progress.md, 2026-11-17). This was before the 2026-11-18 fixes.

## Not checked

- No person has read the screens from start to end as a patient or as staff for this review.
- The translations: nobody fluent has reviewed them.
- The screens on a real Android phone or iPhone, and with VoiceOver or TalkBack.
- The `/dashboard` labels are not in this handoff (Phase 4 has its own metric review).

## Material

Each part below is the full file unless it says otherwise. Line numbers are on the left.


### SPEC.md, lines 33 to 128 (hard rules, screens, data)

```text
 33  ## Hard rules
 34  
 35  1. Store no real personal or health information. A visit has two identifiers. The display code is 6 characters (letters and digits, no look-alike characters such as O/0 or I/1) so people can read it aloud or type it at the desk. The access token is long and random (at least 128 bits, for example 22 or more random URL-safe characters); the QR code and the link saved on the phone carry the token, and only the token opens a visit on a patient's phone. Only logged-in staff can look up a visit by its short code. Patients open a visit only with the token: the link saved on their phone or the QR code on a desk slip. No names, health card numbers, phone numbers or symptoms are stored.
 36  2. The app never makes clinical decisions. Staff choose the CTAS level and confirm eligibility. No symptom checker, no AI triage.
 37  3. Every patient screen, in every state and every language, shows: "If your symptoms get worse, call 911 or come back to the emergency department now."
 38  4. Visits older than 24 hours are deleted automatically. Just before a visit is deleted, add its contribution to a daily_stats table, counting each number on the date of its own event (survey responses count on the closed_at date). No survey can arrive after deletion, so no day ever needs reprocessing; do not use a once-a-night summary job. The dashboard shows a day as its daily_stats totals plus the visits still in the visits table. daily_stats holds only totals (no codes, tokens or single-visit times).
 39  5. A patient's token can read only its own visit, through one database function that returns only the fields a patient may see. Patients can do exactly five things, each through its own narrow function or server route: start a visit from home (a rate-limited server route that itself sets source = home and status = pre_arrival; the browser never sets them, it is refused while off-site waiting is paused, and this never grants a place in line), record that the called screen was shown (sets seen_at once, only while called), confirm "I'm on my way" (only while called), tap "I'm still here" (only while waiting), and submit the survey score once (only after the visit is closed, and only if the visit waited off-site and arrived). Everything else, including the queue, is staff only (Supabase row-level security). Patient pages learn about changes from a signal that holds no visit data (for example a one-row table touched on every change) and then re-read through the function, so they never subscribe to visit rows.
 40  6. No hospital logos or official branding.
 41  7. Joining from home never holds a place in the doctor's line. A patient's place in line starts when a nurse triages them at the hospital, because urgent patients are always seen first.
 42  8. Do not copy or display THP's wait-time numbers. Link to THP's dashboard on THP's own site (https://www.thp.ca/emergency/A/visit.html; the trilliumhealthpartners.ca address no longer works, per the owner on 2026-11-10). THP's terms prohibit reuse of its site material without written permission. All wait estimates inside the app are simulated.
 43  9. Accessibility target: WCAG 2.2 AA (Ontario's legal minimum for public websites is WCAG 2.0 AA; 2.2 AA is the stronger design target). That means keyboard access, visible focus, labelled controls, touch targets of at least 24 by 24 CSS pixels, enough colour contrast, a layout that still works when the user enlarges text to 200% in the browser or phone settings, and pages that reflow on a small phone without sideways scrolling. Never rely on sound or colour alone: every alert and status also appears as words on screen.
 44  
 45  ## Screens
 46  
 47  ### / start page (patient's own phone, at home or in the waiting room, no login)
 48  
 49  - Emergency check first: "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now."
 50  - Other options before travelling: Health811 (call 811 for a free nurse line), the regional virtual urgent care program (https://www.regional-virtual-urgent-care.ca/), and THP's own alternatives listed on its emergency page: the Urgent Care Centre at Queensway Health Centre and the pharmacist assessment pilot at three Mississauga Shoppers Drug Mart locations. Link to THP's pages for both and copy nothing beyond their names and area (Etobicoke, Mississauga); hours change, so send patients to THP's page for them. Start page wording: "Urgent Care Centre at Queensway Health Centre in Etobicoke." and "A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so check that it is still running before you go.", then under the list: "For hours and addresses, see THP's emergency page." (linked).
 51  - Link: "See current wait times on THP's website" (opens THP's page; nothing copied).
 52  - "Start a visit" button: choose one of two demo sites ("Demo Site A", "Demo Site B") and a language. The app creates the visit code and a QR code and saves the code in the phone's browser storage, so the patient never types it and reopening the site brings the visit back.
 53  - While staff have paused off-site waiting, "Start a visit" is replaced by: "Off-site waiting is paused right now. Please come to the emergency department and wait there."
 54  - A visit started from home has status "Started from home, not yet triaged" (owner, 2026-11-10; was "Checked in from home") and shows: "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
 55  - The footer disclaimer and the 911 line appear here too.
 56  
 57  ### /patient (phone, no login)
 58  
 59  - Opens the visit saved on this phone automatically. For patients who did not start on their own phone, the triage desk prints a slip with a QR code (carrying the token), the short code, and the full link written out under the QR code with a label ("Or type this link into your phone's browser"), so a patient whose camera cannot scan still has a way in. The patient scans the QR code with the phone camera; if that fails, staff show the QR code again from /staff. Typing the short code on /patient does not open a visit.
 60  - Shows: place in line, "Estimated time until you're called back" as a range counted from now (for example "40 minutes to 1 hour"), with a note that the estimate is simulated, and status: Waiting, Please head back now, Ready at the desk.
 61  - Under the place in line, always show: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first."
 62  - "I'm on my way" button after the patient is called.
 63  - Every 30 minutes while waiting off-site, an "I'm still here" button appears. A missed tap (no tap within 10 minutes of the prompt) flags the patient on the staff screen. "I'm still here" only tells staff the patient is still following the visit; it is not a clinical reassessment, and neither the patient screen nor the staff screen may describe it as one. If symptoms change, the 911 line applies.
 64  - The first time the called screen is shown, the page records seen_at. This means the screen was displayed in an open browser, not that the patient read it or is coming; staff still wait for "I'm on my way" and arrival. Sent, seen, on my way and arrived are tracked separately.
 65  - While called but unconfirmed, the screen alerts with sound and vibration where the phone allows. These are on-screen demo alerts: they work only while the page is open and the phone is unlocked, and the demo must say so. Do not claim the app can wake a locked phone. A hospital version would use text messages or push notifications (iPhones allow web push only for sites added to the home screen). After the 20-minute step it shows: "Please return now. Staff will review your visit if you do not respond."
 66  - Language switch: English, French, Urdu, Arabic and Mandarin (Simplified Chinese) (owner, 2026-11-10). Urdu and Arabic are right-to-left, so their screens flip. All text comes from one translation file so it can be checked by a fluent speaker.
 67  - Text size control. Works on a small phone. Screen-reader labels on all controls.
 68  - Screen readers announce meaningful status changes (for example "You have been called back") through a polite live region, or an assertive one for the call-back. The wait range and any countdown are not announced on every update.
 69  - After the visit is closed, only for patients who waited off-site and arrived: one survey question, "How would you rate your waiting experience?" on a 0 to 10 scale.
 70  - Updates live without refreshing.
 71  
 72  ### /staff (tablet or laptop, staff login required)
 73  
 74  - Check in a patient after triage and registration (THP's emergency page lists triage first, then registration, where the patient gets an ID band): scan the QR code on the patient's phone (use the device camera) or type the short code (short-code lookup is staff-only). For a patient who did not start a visit, create a new code and show it with a QR code. Then choose CTAS 4 or 5, tick the eligibility checklist (has a phone, can return within 20 minutes, agrees to wait off-site), and choose language.
 75  - "Expected arrivals" list: visits started from home that have not reached triage yet. These are not in the waiting line. Remove them automatically after 6 hours if they never arrive.
 76  - Patient declines or is not eligible: record "offered, declined" or "not eligible" with no other details (for the dashboard), and the patient waits on-site as usual.
 77  - List of patients waiting off-site with minutes waited, sorted by arrival.
 78  - "Recall patient" button per patient (owner, 2026-11-11; was "Call back", renamed so it is not confused with the simulated phone calls); shows "Seen" when seen_at is set and "On the way" when the patient confirms.
 79  - "Pause off-site waiting" switch per site, for downtime or a contact problem, with a confirmation step. While paused: no new off-site sign-ups (the start-from-home route refuses, and check-in offers on-site waiting only), visits already waiting off-site keep working, and the staff list shows a banner asking staff to check every outstanding call-back and offer on-site waiting. Turning it off needs a second confirmation.
 80  - Confirmed but not arrived: a set time after confirmed_at (a setting, default 30 minutes), flag "On the way, not arrived". Never remove the visit automatically. This is a demo setting, not a clinically validated deadline.
 81  - No-response follow-up after "Recall patient" (all times are settings so I can shorten them for testing; they are placeholders, and a hospital's clinical lead would set the real ones):
 82    - 0 minutes: patient screen alert (plus optional text in the Twilio add-on).
 83    - 10 minutes, no confirmation: second alert on the patient screen; flag on the staff screen: "No reply 10 min after call-back. Phone the patient now." (owner, 2026-11-11; was "Phone this patient.") The demo stores no phone numbers, so phone calls are simulated: staff record each attempt with a button ("Phoned, answered" or "Phoned, no answer"). A hospital version would take the number from its registration system. "Phoned, answered" saves last_phone_result, clears the phone flag and pauses escalation until followup_paused_until (a setting, default 10 minutes). After the pause, the ladder continues from the time elapsed since called_at; it does not restart. A visit with an answered call that still does not arrive is flagged "Answered the phone, but hasn't arrived or tapped "I'm on my way" yet." (owner, 2026-11-11; was "Contacted, not yet arrived"), never "Review: unable to reach".
 84    - 20 minutes: flag: "Still no reply 20 min after call-back. Phone the patient again." (owner, 2026-11-11; was "Phone a second time"); the patient screen shows the "Please return now" message.
 85    - 30 minutes, with no answered call: the visit is flagged "Review: unable to reach" and stays in the line until a nurse confirms. On confirmation the status becomes unable_to_reach and the visit leaves the active line. The app does not record this as left without being seen; staff follow hospital policy outside the app.
 86    - If an unable_to_reach patient arrives later, staff can reopen the visit, which clears closed_at and sends it back to triage for reassessment (status: needs_reassessment).
 87  - The app never contacts anyone other than the patient. No emergency contacts are stored.
 88  - "Issue a new link" (owner, 2026-11-14), for a lost or stolen phone, while waiting, called or on the way: gives the visit a new link and QR code; the old link and slip stop working at once. The visit code stays the same.
 89  - Mark arrived, mark removed (left, no-show). Actions that end virtual waiting (arrived, removed, unable_to_reach confirmed, declined, not_eligible) set closed_at in the same update. Closed means virtual waiting ended, not that care is finished.
 90  - "Call everyone back" button for a surge or a system problem, with a confirmation step.
 91    - (owner, 2026-11-12: the button is "Recall all off-site patients"; see components/staff/RecallAllPanel.tsx.)
 92  
 93  ### /dashboard (staff login required)
 94  
 95  Numbers for the current day:
 96  
 97  - Patients waiting off-site now, and patients called but not yet arrived
 98  - Eligible patients offered the option (percentage), and how many declined
 99  - Average minutes from call-back to arrival
100  - No-shows and patients marked unable to reach
101  - Visits started from home, and how many of those arrived at triage
102  - Survey: number of responses, average score, and share scoring 9 or 10
103  
104  Definitions ("today" means since midnight, America/Toronto time; demo visits count only in demo mode, and daily_stats keeps them apart through its is_demo key):
105  
106  - Waiting off-site now: visits with status waiting. Called but not arrived: status called or on_the_way.
107  - Offered (percentage): visits with offered_at today, divided by visits triaged today as CTAS 4 or 5 minus those marked not_eligible. Declined: status declined.
108  - Average minutes from call-back to arrival: arrived_at minus called_at, averaged over visits that were called and arrived today.
109  - No-shows: status removed with removed_reason no_show. Unable to reach: status unable_to_reach (nurse-confirmed).
110  - Visits started from home: source home, created today; of those, arrived at triage means triaged_at is set.
111  - Survey: responses are visits whose closed_at is today and that have a survey_score; report the count beside the average and the share scoring 9 or 10.
112  
113  ### Demo mode (staff only)
114  
115  One button that creates 15 to 20 fake visits spread over the last few hours and moves some of them through the statuses, so the screens look like a busy evening. A second button clears all demo data, including demo rows in daily_stats.
116  
117  ## Data (one main table)
118  
119  visits: id, code (6-character display code), access_token (long random token), site (A or B), source (home or desk), ctas_level (4 or 5, empty until triage), language, status (pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed, declined, not_eligible), removed_reason (left or no_show, only when removed), created_at, triaged_at, offered_at (when staff offered off-site waiting), last_still_here_at, called_at, seen_at (first time the called screen was shown), confirmed_at, review_flagged_at, arrived_at, closed_at, phone_attempts (count of simulated calls), last_phone_result (answered or no_answer), followup_paused_until, survey_score (0 to 10, optional), is_demo.
120  
121  site_settings: site, offsite_paused (true or false), paused_at. Staff only.
122  
123  daily_stats: key (day, site, is_demo), and one total per dashboard number. No codes, tokens or single-visit times.
124  
125  Place in line is ordered by triaged_at, never by created_at.
126  
127  Add other fields only if a phase needs them, and tell me why.
128  
```

### lib/text/en.ts (all English patient text)

```ts
  1  // Every sentence a patient sees, in English. Other languages copy this shape (lib/text/index.ts).
  2  // Wording approved by the owner on 2026-11-10 (handoffs/archive/2026-11-10-gemini-patient-wording-phase3-response.md).
  3  // Sentences marked "SPEC" are fixed by SPEC.md: change them only if the owner changes SPEC.
  4  // Words in {braces} are filled in by the app (for example {low}); translators keep them as they are.
  5  // The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
  6  // Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
  7  
  8  import type { DurationWords } from "./durationWords";
  9  
 10  export const en = {
 11    // SPEC rule 3: on every patient screen, in every state and every language.
 12    emergencyLine: "If your symptoms get worse, call 911 or come back to the emergency department now.",
 13    // SPEC: on every page.
 14    footer: "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only.",
 15    appName: "Virtual Waiting Room",
 16    visitCode: "Visit code",
 17    siteName: "Demo Site {site}",
 18    newTab: "(opens in a new tab)",
 19  
 20    start: {
 21      // SPEC
 22      emergencyCheck:
 23        "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now.",
 24      careHeading: "Learn about your care options",
 25      careIntro: "This demo cannot choose a service for you. Check the rules and hours on each site before you go.",
 26      health811Before: "Health811: Call",
 27      health811After: "to speak with a nurse for free.",
 28      virtualCare: "Virtual urgent care",
 29      // SPEC (the next five)
 30      urgentCare: "Urgent Care Centre at Queensway Health Centre in Etobicoke.",
 31      pharmacist:
 32        "A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so check that it is still running before you go.",
 33      hoursBefore: "For hours and addresses, see",
 34      hoursLink: "THP's emergency page",
 35      waitTimesLink: "See current wait times on THP's website",
 36  
 37      startHeading: "Start a visit",
 38      // Ends with SPEC's sentence about triage.
 39      startIntro:
 40        "Starting here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
 41      siteQuestion: "Which emergency department are you going to?",
 42      startButton: "Start a visit",
 43      starting: "Starting…",
 44      // SPEC
 45      paused: "Off-site waiting is paused right now. Please come to the emergency department and wait there.",
 46      busy: "The app is too busy right now. Please wait a few minutes and try again. You can also go straight to the emergency department.",
 47      notSaved: "Your visit did not save. Please try again. Or, go to the emergency department desk.",
 48  
 49      checkingSaved: "Checking this phone for a saved visit…",
 50      unavailableHeading: "We cannot open the saved visit on this phone",
 51      unavailableText:
 52        "Your saved visit will not load right now. You cannot start a new one here. If you need care, please go to the emergency department desk.",
 53      openHeading: "You have an open visit on this phone",
 54      openVisit: "Open your visit",
 55      closedHeading: "Your past visit on this phone",
 56      closedText:
 57        "Off-site waiting is over for this visit. You might still be waiting at the hospital. Open your visit to check.",
 58      expiredHeading: "Your visit request has expired",
 59      startNew: "Start a new demo visit",
 60  
 61      demoScreens: "Demo screens",
 62      staffScreen: "Staff screen",
 63      patientScreen: "Patient screen",
 64      dashboard: "Dashboard",
 65    },
 66  
 67    // Shown on the start page and the patient screen when a visit from home was never triaged.
 68    expiredText:
 69      "You started this visit over 6 hours ago. No nurse saw you for this visit. Staff no longer expect you to arrive.",
 70  
 71    patient: {
 72      loading: "Loading your visit…",
 73      unavailableHeading: "We cannot load your visit",
 74      unavailableText:
 75        "Your actions on this page are not saving. Staff may not see them. Please go to the emergency department desk.",
 76      noVisitHeading: "No visit found on this phone",
 77      brokenLinkHeading: "This link did not work",
 78      brokenLinkText: "The link might be wrong or cut short. No visit was opened.",
 79      // Staff gave a new link or closed the visit, so this link no longer works.
 80      replacedLinkHeading: "This visit link does not work or is no longer active",
 81      replacedLinkText: "Please ask the emergency department desk for help.",
 82      findVisitHelp:
 83        "Scan the QR code on your slip. You can also type the link printed under it. If it still fails, ask the desk to show the QR code again.",
 84  
 85      waitingHeading: "Status: Waiting",
 86      placeInLine: "Your place in line:",
 87      // SPEC
 88      placeCanChange: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first.",
 89      // SPEC
 90      waitLabel: "Estimated time until you're called back:",
 91      // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
 92      // from an hour, each end is built from the Duration words below.
 93      waitRangeLong: "{low} to {high}",
 94      simulated: "This estimate is simulated for the demo.",
 95  
 96      calledHeading: "Please head back now",
 97      calledText: "Please go back to the emergency department desk.",
 98      onMyWay: "I'm on my way",
 99      sending: "Sending…",
100      confirmed: "Thank you. Staff know you are on your way.",
101      notSaved: "Your answer did not save. Staff do not know you are on your way. Please try again or go to the desk.",
102  
103      fromHomeHeading: "Status: Started from home, not seen by a nurse yet",
104      fromHomeText: [
105        // SPEC
106        "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.",
107        "This app does not check you in at the hospital or let you wait away from the hospital.",
108        "When you get to the emergency department, check in at the front desk and show this visit code. Only staff can let you wait away from the hospital.",
109      ],
110      reassessHeading: "Please go to the triage desk",
111      reassessText: "A nurse needs to check you again before you go back in line.",
112      arrivedHeading: "Status: Ready at the desk",
113      arrivedText: "Staff know you are back. Please stay in the waiting area until you are called.",
114      onsiteHeading: "Status: Waiting in the emergency department",
115      onsiteText: "You are waiting inside the hospital. Staff will call you when they are ready.",
116      endedHeading: "Your off-site wait has ended",
117      endedText: "Please go to the emergency department desk.",
118      unableText:
119        "Staff could not reach you, so this visit has left the off-site line. If you still need care, please come to the emergency department desk.",
120      removedText:
121        "Staff have ended off-site waiting for this visit. If you still need care, please come to the emergency department desk.",
122      expiredHeading: "This visit request has expired",
123      expiredHelp: "If you still need care, please go to the emergency department desk.",
124      expiredNewVisit: "Or start a new demo visit on the start page.",
125    },
126  
127    // Heard by screen-reader users when the status changes (never the wait range or countdowns).
128    announce: {
129      called: "It is your turn. Please come back to the emergency department now.",
130      onTheWay: "Thank you. Staff know you are on your way.",
131      arrived: "Staff have marked you as back at the emergency department.",
132      ended: "Your off-site wait has ended.",
133      reassess: "Please go to the triage desk.",
134      stillHere: "Please tap the button to confirm you are still here.",
135      secondAlert: "Urgent: Please return to the emergency department right now.",
136      waiting: "You are now in the off-site line. This page shows your place in line.",
137      onsite: "Please wait inside the emergency department. Staff will call you when they are ready.",
138      expired: "This visit request has expired. If you still need care, please go to the emergency department desk.",
139    },
140  
141    // Desk slip (printed for the patient).
142    slip: {
143      // SPEC
144      typeLink: "Or type this link into your phone's browser:",
145    },
146  
147    // Phase 3 features still being built. Written now so all text is translated in one batch.
148    stillHere: {
149      heading: "Are you still following your visit?",
150      button: "I'm still here",
151      thanks: "Thank you.",
152      meaning: "This tells staff you are still waiting. It is not a check of your health.",
153    },
154    secondAlert: "Please come back to the emergency department right now. Staff may phone you.",
155    returnNow: {
156      lead: "We have not heard from you.",
157      // SPEC
158      text: "Please return now. Staff will review your visit if you do not respond.",
159    },
160    sound: {
161      notice:
162        "This demo can play a sound when you are called. It also vibrates if your phone allows it. Alerts work only while this page is open and your phone is unlocked. Take your phone off silent so you can hear it.",
163      turnOn: "Turn on sound",
164      on: "Sound is on",
165      failed: "Sound could not start on this phone. Watch this screen to see when you are called.",
166      turnOff: "Turn off sound",
167      offWhileCalled: "Sound is off. Tap \"Turn on sound\" for sound alerts.",
168    },
169    pausedHeading: "Off-site waiting is paused",
170    textSize: { label: "Text size", normal: "Normal", large: "Large", extraLarge: "Extra large" },
171    language: {
172      label: "Select language",
173      draftNotice: "This translation is a draft. A fluent speaker has not checked it yet.",
174      // Shown in brackets after a draft language's name in the menu.
175      draftTag: "draft",
176      interpreter: "Need another language? Ask the emergency department desk for a free interpreter.",
177    },
178    survey: {
179      // SPEC
180      question: "How would you rate your waiting experience?",
181      low: "0 = Very poor",
182      high: "10 = Excellent",
183      submit: "Submit",
184      thanks: "Thank you for your feedback.",
185      note: "Answering is optional. Your name is not stored.",
186    },
187    offline: "You are offline. Reconnect to the internet to see your status.",
188  };
189  
190  /** The shape every language's text must have. */
191  export type PatientText = typeof en;
192  
193  /** Hour and minute words for the wait range (lib/waitText.ts) and the staff screen-reader words. */
194  export const enDuration: DurationWords = {
195    locale: "en",
196    hour: { one: "{n} hour", other: "{n} hours" },
197    minute: { one: "{n} minute", other: "{n} minutes" },
198    join: "{h} {m}",
199  };
```

### components/start/StartPageBody.tsx

```tsx
  1  "use client";
  2  
  3  // Everything on the start page, in the language chosen on this phone (English until one is
  4  // chosen): the language menu, the emergency check first, other care options, THP's
  5  // wait-time link, then "Start a visit". Urdu and Arabic are laid out right to left.
  6  
  7  import Link from "next/link";
  8  import { useChosenLanguage } from "@/data/savedLanguage";
  9  import { textFor } from "@/lib/text";
 10  import { languageInfo } from "@/lib/text/languages";
 11  import { EmergencyLine } from "@/components/EmergencyLine";
 12  import { LanguageSwitch } from "@/components/LanguageSwitch";
 13  import { TextSizeSwitch } from "@/components/patient/TextSizeSwitch";
 14  import { CareOptions } from "@/components/start/CareOptions";
 15  import { StartVisit } from "@/components/start/StartVisit";
 16  import { useDocumentLanguage } from "@/components/useDocumentLanguage";
 17  
 18  const linkStyle =
 19    "inline-block min-h-11 rounded-lg border-2 border-slate-700 px-4 py-2 font-semibold focus-visible:outline-4 focus-visible:outline-slate-950";
 20  
 21  export function StartPageBody() {
 22    const language = useChosenLanguage() ?? "en";
 23    const t = textFor(language);
 24    useDocumentLanguage(language);
 25    return (
 26      <main lang={language} dir={languageInfo(language).dir} className="mx-auto w-full max-w-xl space-y-6 px-4 py-6">
 27        <h1 className="text-2xl font-bold">{t.appName}</h1>
 28        <LanguageSwitch language={language} />
 29        <TextSizeSwitch language={language} />
 30        <p className="rounded-lg border-2 border-red-700 bg-red-50 p-3 text-lg font-bold text-red-900">
 31          {t.start.emergencyCheck}
 32        </p>
 33        <div className="clean-card">
 34          <CareOptions language={language} />
 35        </div>
 36        <StartVisit language={language} />
 37        <EmergencyLine language={language} />
 38        <nav aria-label={t.start.demoScreens} className="flex flex-wrap gap-3 border-t border-slate-300 pt-4">
 39          <Link href="/staff" className={linkStyle}>
 40            {t.start.staffScreen}
 41          </Link>
 42          <Link href="/patient" className={linkStyle}>
 43            {t.start.patientScreen}
 44          </Link>
 45          <Link href="/dashboard" className={linkStyle}>
 46            {t.start.dashboard}
 47          </Link>
 48        </nav>
 49      </main>
 50    );
 51  }
```

### components/start/StartVisit.tsx

```tsx
  1  "use client";
  2  
  3  // The start page's "Start a visit": choose a demo site; the visit takes the language chosen on
  4  // this phone (the menu at the top of the page). The server starts the visit and this phone remembers it, so the patient never types a code. If this phone already
  5  // has a visit, it shows that one first (open, ended or expired), and never offers a new one
  6  // while the saved visit cannot be read. While staff have paused off-site waiting at a site,
  7  // "Start a visit" for that site is replaced by the SPEC's paused message.
  8  
  9  import Link from "next/link";
 10  import { useRouter } from "next/navigation";
 11  import { useState, useSyncExternalStore } from "react";
 12  import { startVisitFromHome, usePatientView, type StartResult } from "@/data/patientVisit";
 13  import { loadSavedToken } from "@/data/savedToken";
 14  import { useSitePauses } from "@/data/sitePauses";
 15  import { startPageState } from "@/lib/startPage";
 16  import { fill, textFor } from "@/lib/text";
 17  import type { Site } from "@/lib/visit";
 18  import { Button } from "@/components/Button";
 19  
 20  const noSubscribe = () => () => {};
 21  
 22  const openLinkStyle =
 23    "inline-block min-h-11 rounded-xl bg-brand px-4 py-2 font-semibold text-white hover:bg-brand-strong focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-slate-950";
 24  const boxStyle = "clean-card space-y-3";
 25  
 26  export function StartVisit({ language }: { language: string }) {
 27    const router = useRouter();
 28    const savedToken = useSyncExternalStore(noSubscribe, loadSavedToken, () => null);
 29    const saved = usePatientView(savedToken);
 30    const [site, setSite] = useState<Site>("A");
 31    const [problem, setProblem] = useState<Exclude<StartResult, "saved"> | null>(null);
 32    const [starting, setStarting] = useState(false);
 33    const [wantsNew, setWantsNew] = useState(false);
 34    const { pauses } = useSitePauses();
 35    const sitePaused = pauses?.[site] === true;
 36    // Screen readers hear the paused message once when the chosen site becomes paused (live, or
 37    // by choosing a paused site). The region below stays in place, so the words are read.
 38    const [announced, setAnnounced] = useState("");
 39    const [wasPaused, setWasPaused] = useState<boolean | null>(null);
 40    if (pauses && sitePaused !== wasPaused) {
 41      setWasPaused(sitePaused);
 42      setAnnounced(wasPaused === false && sitePaused ? `${fill(textFor(language).siteName, { site })}: ${textFor(language).start.paused}` : "");
 43    }
 44    const state = startPageState(saved);
 45    const t = textFor(language);
 46    const s = t.start;
 47  
 48    // What the patient is told when a visit could not be started.
 49    const problemText = { paused: s.paused, busy: s.busy, not_saved: s.notSaved };
 50    // What the start page says about a visit already saved on this phone, before any new one.
 51    const savedNote = {
 52      closed: { heading: s.closedHeading, text: s.closedText },
 53      expired: { heading: s.expiredHeading, text: t.expiredText },
 54    };
 55  
 56    if (state === "loading") {
 57      return <p>{s.checkingSaved}</p>;
 58    }
 59  
 60    if (state === "unavailable") {
 61      return (
 62        <section aria-labelledby="start-heading" className={boxStyle}>
 63          <h2 id="start-heading" className="text-xl font-bold">
 64            {s.unavailableHeading}
 65          </h2>
 66          <p>{s.unavailableText}</p>
 67        </section>
 68      );
 69    }
 70  
 71    if (saved && typeof saved === "object" && state === "open") {
 72      return (
 73        <section aria-labelledby="start-heading" className={boxStyle}>
 74          <h2 id="start-heading" className="text-xl font-bold">
 75            {s.openHeading}
 76          </h2>
 77          <p>
 78            {t.visitCode}{" "}
 79            <bdi>
 80              <strong className="font-mono tracking-widest">{saved.code}</strong>
 81            </bdi>{" "}
 82            · <bdi>{fill(t.siteName, { site: saved.site })}</bdi>
 83          </p>
 84          <Link href="/patient" className={openLinkStyle}>
 85            {s.openVisit}
 86          </Link>
 87        </section>
 88      );
 89    }
 90  
 91    // An ended or expired visit is shown first; starting another demo visit is a separate choice.
 92    const savedBox =
 93      saved && typeof saved === "object" && (state === "closed" || state === "expired") ? (
 94        <section aria-labelledby="saved-heading" className={boxStyle}>
 95          <h2 id="saved-heading" className="text-xl font-bold">
 96            {savedNote[state].heading}
 97          </h2>
 98          <p>
 99            {t.visitCode}{" "}
100            <bdi>
101              <strong className="font-mono tracking-widest">{saved.code}</strong>
102            </bdi>{" "}
103            · <bdi>{fill(t.siteName, { site: saved.site })}</bdi>
104          </p>
105          <p>{savedNote[state].text}</p>
106          <Link href="/patient" className={openLinkStyle}>
107            {s.openVisit}
108          </Link>
109        </section>
110      ) : null;
111  
112    if (savedBox && !wantsNew) {
113      return (
114        <div className="space-y-4">
115          {savedBox}
116          <Button variant="secondary" onClick={() => setWantsNew(true)}>
117            {s.startNew}
118          </Button>
119        </div>
120      );
121    }
122  
123    const announcer = (
124      <p role="status" className="sr-only">
125        {announced}
126      </p>
127    );
128  
129    // Both sites paused: no start box at all, only the message (the start route refuses anyway).
130    // The announcer comes first in both this and the start box, so it is the same element in both.
131    if (pauses?.A && pauses?.B) {
132      return (
133        <>
134          {announcer}
135          <section aria-labelledby="start-heading" className={boxStyle} data-testid="start-paused">
136            <h2 id="start-heading" className="text-xl font-bold">
137              {t.pausedHeading}
138            </h2>
139            <p>{s.paused}</p>
140          </section>
141        </>
142      );
143    }
144  
145    const start = async () => {
146      if (starting) return; // a second tap while the first is on its way must not start two visits
147      setStarting(true);
148      setProblem(null);
149      const result = await startVisitFromHome(site, language);
150      if (result === "saved") {
151        router.push("/patient");
152        return; // stays "Starting…" until the patient screen opens
153      }
154      setStarting(false);
155      setProblem(result);
156    };
157  
158    return (
159      <>
160        {announcer}
161        <section aria-labelledby="start-heading" className="clean-card space-y-4">
162          <h2 id="start-heading" className="text-xl font-bold">
163            {s.startHeading}
164          </h2>
165          <p>{s.startIntro}</p>
166          <fieldset>
167            <legend className="font-semibold">{s.siteQuestion}</legend>
168            <div className="mt-2 flex flex-wrap gap-3">
169              {(["A", "B"] as const).map((option) => (
170                <label
171                  key={option}
172                  className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-control px-4"
173                >
174                  <input
175                    type="radio"
176                    name="site"
177                    className="size-5"
178                    checked={site === option}
179                    onChange={() => setSite(option)}
180                  />
181                  {fill(t.siteName, { site: option })}
182                </label>
183              ))}
184            </div>
185          </fieldset>
186          {sitePaused ? (
187            <p className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900" data-testid="site-paused">
188              {s.paused}
189            </p>
190          ) : (
191            <Button onClick={start} aria-disabled={starting} className="w-full text-lg">
192              {starting ? s.starting : s.startButton}
193            </Button>
194          )}
195          {problem && (
196            <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
197              {problemText[problem]}
198            </p>
199          )}
200        </section>
201      </>
202    );
203  }
```

### components/start/CareOptions.tsx

```tsx
  1  // The start page's "other options before travelling" and the link to THP's own wait times.
  2  // Only names and links: nothing is copied from THP's site (SPEC rule 8), and hours change,
  3  // so patients are sent to THP's page for them.
  4  
  5  import { textFor } from "@/lib/text";
  6  
  7  const THP_EMERGENCY_PAGE = "https://www.thp.ca/emergency/A/visit.html";
  8  
  9  // inline-block with py-1 makes each link a tap target of at least 24 by 24 pixels (WCAG 2.5.8).
 10  const linkStyle = "inline-block py-1 font-semibold text-brand underline underline-offset-2";
 11  // A link that stands alone (not inside a sentence) is at least 44 pixels high, like the buttons.
 12  const aloneStyle = `${linkStyle} min-h-11`;
 13  
 14  function External({ href, children, newTab, alone }: { href: string; children: string; newTab: string; alone?: boolean }) {
 15    return (
 16      <a href={href} target="_blank" rel="noopener noreferrer" className={alone ? aloneStyle : linkStyle}>
 17        {children}
 18        <span className="sr-only"> {newTab}</span>
 19      </a>
 20    );
 21  }
 22  
 23  export function CareOptions({ language }: { language?: string }) {
 24    const t = textFor(language);
 25    const s = t.start;
 26    return (
 27      <section aria-labelledby="options-heading" className="space-y-3">
 28        <h2 id="options-heading" className="text-xl font-bold">
 29          {s.careHeading}
 30        </h2>
 31        <p>{s.careIntro}</p>
 32        <ul className="list-disc space-y-2 ps-6 text-base">
 33          <li>
 34            {s.health811Before}{" "}
 35            <a href="tel:811" className={linkStyle}>
 36              811
 37            </a>{" "}
 38            {s.health811After}
 39          </li>
 40          <li>
 41            <External href="https://www.regional-virtual-urgent-care.ca/" newTab={t.newTab} alone>
 42              {s.virtualCare}
 43            </External>
 44          </li>
 45          <li>{s.urgentCare}</li>
 46          <li>{s.pharmacist}</li>
 47        </ul>
 48        <p>
 49          {s.hoursBefore}{" "}
 50          <External href={THP_EMERGENCY_PAGE} newTab={t.newTab}>
 51            {s.hoursLink}
 52          </External>
 53          .
 54        </p>
 55        <p>
 56          <External href={THP_EMERGENCY_PAGE} newTab={t.newTab} alone>
 57            {s.waitTimesLink}
 58          </External>
 59        </p>
 60      </section>
 61    );
 62  }
```

### components/patient/VisitScreen.tsx

```tsx
  1  "use client";
  2  
  3  // The part of the patient page below the 911 line: "Loading…", the "could not load" box, the
  4  // no-visit, broken-link or replaced-link box, or the visit itself (code, status, sound box and announcer).
  5  // This part stays on the page when the screen changes, so it is the one that moves focus to the
  6  // new heading when the old screen left with focus inside it.
  7  
  8  import { useRef } from "react";
  9  import type { PatientView } from "@/lib/patientView";
 10  import { fill, textFor } from "@/lib/text";
 11  import { FocusBox } from "./FocusBox";
 12  import { StatusAndSound } from "./StatusAndSound";
 13  import { StatusAnnouncer } from "./StatusAnnouncer";
 14  import { useRescueFocus } from "./useFocusRescue";
 15  
 16  type Props = {
 17    /** True until the link is read and the first answer for the visit comes in. */
 18    loading: boolean;
 19    /** The visit, null if the token opens no visit, or "unavailable" if it could not be read. */
 20    result: PatientView | null | "unavailable" | undefined;
 21    /** True when the link was broken or no longer opens a visit (for example after a new link). */
 22    linkFailed: boolean;
 23    /** True when the link once opened a visit but no longer does (for example staff made a new link). */
 24    linkReplaced?: boolean;
 25    token: string | null;
 26    language: string;
 27    onOnMyWay: () => void;
 28    sending: boolean;
 29    online: boolean;
 30    /** True when "I'm on my way" could not be saved. */
 31    notSaved: boolean;
 32  };
 33  
 34  type Screen = "loading" | "unavailable" | "none" | "visit";
 35  
 36  export function VisitScreen({ loading, result, linkFailed, linkReplaced = false, token, language, onOnMyWay, sending, online, notSaved }: Props) {
 37    const t = textFor(language);
 38    const p = t.patient;
 39    const view = result === "unavailable" ? null : result;
 40    // True when the old screen left with focus inside it; then focus goes to the new heading.
 41    const lostFocus = useRef(false);
 42    const markLost = useRescueFocus("status-heading", lostFocus);
 43  
 44    // Which of the 4 screens shows. "Loading…" comes first: while loading, result can be undefined.
 45    const screen: Screen = loading ? "loading" : result === "unavailable" ? "unavailable" : !view ? "none" : "visit";
 46  
 47    // A new screen gets a new box (the key), so the old box leaves and reports if it held focus.
 48    return (
 49      <FocusBox key={screen} onFocusLost={markLost} className="space-y-5">
 50        {screen === "loading" && (
 51          <p id="status-heading" tabIndex={-1}>
 52            {p.loading}
 53          </p>
 54        )}
 55        {screen === "unavailable" && (
 56          <section aria-labelledby="status-heading" className="clean-card space-y-2">
 57            <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
 58              {p.unavailableHeading}
 59            </h2>
 60            <p className="text-lg">{p.unavailableText}</p>
 61          </section>
 62        )}
 63        {screen === "none" && (
 64          <section aria-labelledby="status-heading" className="clean-card space-y-2">
 65            <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
 66              {linkReplaced ? p.replacedLinkHeading : linkFailed ? p.brokenLinkHeading : p.noVisitHeading}
 67            </h2>
 68            {linkReplaced && <p className="text-lg">{p.replacedLinkText}</p>}
 69            {linkFailed && !linkReplaced && <p className="text-lg">{p.brokenLinkText}</p>}
 70            <p className="text-lg">{p.findVisitHelp}</p>
 71          </section>
 72        )}
 73        {screen === "visit" && view && (
 74          <>
 75            <p className="text-base">
 76              {t.visitCode}:{" "}
 77              <bdi>
 78                <strong className="font-mono tracking-widest">{view.code}</strong>
 79              </bdi>{" "}
 80              · <bdi>{fill(t.siteName, { site: view.site })}</bdi>
 81            </p>
 82            <StatusAndSound view={view} token={token} language={language} onOnMyWay={onOnMyWay} sending={sending} online={online} />
 83            {notSaved && (
 84              <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
 85                {p.notSaved}
 86              </p>
 87            )}
 88            <StatusAnnouncer key={token} status={view.status} language={language} expired={view.expired} />
 89          </>
 90        )}
 91      </FocusBox>
 92    );
 93  }
```

### components/patient/PatientStatus.tsx

```tsx
  1  "use client";
  2  
  3  // The main part of the patient screen, which changes with the visit's status:
  4  // Waiting, Please head back now, Ready at the desk, and the states before and after those.
  5  
  6  import Link from "next/link";
  7  import { useRef, type RefObject } from "react";
  8  import type { PatientView } from "@/lib/patientView";
  9  import { textFor, type PatientText } from "@/lib/text";
 10  import { formatWaitRange } from "@/lib/waitText";
 11  import { Button } from "@/components/Button";
 12  import { CallReminder } from "./CallReminder";
 13  import { FocusBox } from "./FocusBox";
 14  import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
 15  
 16  type Props = {
 17    view: PatientView;
 18    language: string;
 19    onOnMyWay: () => void;
 20    sending: boolean;
 21    /** Set to true by a part below (the sound box) that left the page with focus inside it. */
 22    lostFocus?: RefObject<boolean>;
 23  };
 24  
 25  /** "I'm on my way". When it leaves the page with focus on it, it tells the status screen. */
 26  function OnMyWayButton({ onOnMyWay, sending, label, onFocusLost }: {
 27    onOnMyWay: () => void;
 28    sending: boolean;
 29    label: string;
 30    onFocusLost: () => void;
 31  }) {
 32    const area = useRef<HTMLDivElement>(null);
 33    useReportFocusOnLeave(area, onFocusLost);
 34    return (
 35      <div ref={area}>
 36        <Button onClick={onOnMyWay} aria-disabled={sending} className="w-full text-lg">
 37          {label}
 38        </Button>
 39      </div>
 40    );
 41  }
 42  
 43  function Waiting({ view, language, t }: { view: PatientView; language: string; t: PatientText }) {
 44    const p = t.patient;
 45    return (
 46      <section aria-labelledby="status-heading" className="clean-card space-y-3">
 47        <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
 48          {p.waitingHeading}
 49        </h2>
 50        <p className="text-lg">
 51          {p.placeInLine} <strong className="text-3xl">{view.placeInLine}</strong>
 52        </p>
 53        <p className="text-base">{p.placeCanChange}</p>
 54        <p className="text-lg">
 55          {p.waitLabel}{" "}
 56          <strong>{view.waitLow !== null && view.waitHigh !== null && formatWaitRange(view.waitLow, view.waitHigh, language)}</strong>
 57        </p>
 58        <p className="text-sm text-slate-700">{p.simulated}</p>
 59      </section>
 60    );
 61  }
 62  
 63  function Called({ view, onOnMyWay, sending, t, onFocusLost }: Props & { t: PatientText; onFocusLost: () => void }) {
 64    const p = t.patient;
 65    const confirmed = view.status === "on_the_way";
 66    return (
 67      <section
 68        aria-labelledby="status-heading"
 69        className="space-y-3 rounded-xl border-4 border-green-800 bg-green-50 p-4"
 70      >
 71        <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold text-green-950">
 72          {p.calledHeading}
 73        </h2>
 74        <p className="text-lg">{p.calledText}</p>
 75        {!confirmed && <CallReminder view={view} t={t} />}
 76        {confirmed ? (
 77          <p className="text-lg font-semibold" data-testid="confirmed">
 78            {p.confirmed}
 79          </p>
 80        ) : (
 81          <OnMyWayButton
 82            onOnMyWay={onOnMyWay}
 83            sending={sending}
 84            label={sending ? p.sending : p.onMyWay}
 85            onFocusLost={onFocusLost}
 86          />
 87        )}
 88      </section>
 89    );
 90  }
 91  
 92  /** Heading and paragraphs for every status that has no place-in-line or call-back screen. */
 93  function otherStatus(status: PatientView["status"], t: PatientText): { heading: string; text: string[] } {
 94    const p = t.patient;
 95    switch (status) {
 96      case "pre_arrival":
 97        return { heading: p.fromHomeHeading, text: p.fromHomeText };
 98      case "needs_reassessment":
 99        return { heading: p.reassessHeading, text: [p.reassessText] };
100      case "arrived":
101        return { heading: p.arrivedHeading, text: [p.arrivedText] };
102      case "declined":
103      case "not_eligible":
104        return { heading: p.onsiteHeading, text: [p.onsiteText] };
105      case "unable_to_reach":
106        return { heading: p.endedHeading, text: [p.unableText] };
107      case "removed":
108        return { heading: p.endedHeading, text: [p.removedText] };
109      default:
110        return { heading: p.endedHeading, text: [p.endedText] };
111    }
112  }
113  
114  function OtherStatus({ view, t }: { view: PatientView; t: PatientText }) {
115    const { heading, text } = otherStatus(view.status, t);
116    return (
117      <section aria-labelledby="status-heading" className="clean-card space-y-3">
118        <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
119          {heading}
120        </h2>
121        {text.map((paragraph) => (
122          <p key={paragraph} className="text-lg">
123            {paragraph}
124          </p>
125        ))}
126      </section>
127    );
128  }
129  
130  // A visit started from home that was never triaged within 6 hours: staff no longer expect it.
131  function Expired({ t }: { t: PatientText }) {
132    const p = t.patient;
133    return (
134      <section aria-labelledby="status-heading" className="clean-card space-y-3">
135        <h2 id="status-heading" tabIndex={-1} className="text-2xl font-bold">
136          {p.expiredHeading}
137        </h2>
138        <p className="text-lg">{t.expiredText}</p>
139        <p className="text-lg">{p.expiredHelp}</p>
140        <p className="text-lg">
141          <Link href="/" className="font-semibold text-brand underline underline-offset-2">
142            {p.expiredNewVisit}
143          </Link>
144        </p>
145      </section>
146    );
147  }
148  
149  export function PatientStatus({ view, language, onOnMyWay, sending, lostFocus }: Props) {
150    const t = textFor(language);
151    // The page's flag when it gives one (the sound box sets it too), otherwise this screen's own.
152    const ownFlag = useRef(false);
153    // A focused part that left with this change (for example "I'm on my way"): focus goes to the heading.
154    const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
155    const kind = viewKind(view);
156    // A new screen gets a new box (the key), so the old box leaves and tells this screen if it held focus.
157    return (
158      <FocusBox key={kind} onFocusLost={markLost}>
159        {kind === "expired" && <Expired t={t} />}
160        {kind === "waiting" && <Waiting view={view} language={language} t={t} />}
161        {kind === "called" && (
162          <Called view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} t={t} onFocusLost={markLost} />
163        )}
164        {kind === "other" && <OtherStatus view={view} t={t} />}
165      </FocusBox>
166    );
167  }
168  
169  /** Which screen the view shows. Called and on the way share one screen. */
170  function viewKind(view: PatientView): "expired" | "waiting" | "called" | "other" {
171    if (view.expired) return "expired";
172    if (view.status === "waiting") return "waiting";
173    if (view.status === "called" || view.status === "on_the_way") return "called";
174    return "other";
175  }
```

### components/patient/StatusAndSound.tsx

```tsx
  1  "use client";
  2  
  3  // The "I'm still here" prompt, the status screen and the sound box of the patient page, with the one
  4  // flag they share: when the prompt or the sound box leaves the page with focus inside it, the status
  5  // screen moves focus to its heading.
  6  // The page and the click test both use this part, so the test checks the real wiring.
  7  
  8  import { useRef } from "react";
  9  import type { PatientView } from "@/lib/patientView";
 10  import { PatientStatus } from "./PatientStatus";
 11  import { SoundSwitch } from "./SoundSwitch";
 12  import { StillHerePrompt } from "./StillHerePrompt";
 13  
 14  type Props = {
 15    view: PatientView;
 16    /** The visit's token, for the "I'm still here" tap (null: no prompt). */
 17    token: string | null;
 18    language: string;
 19    onOnMyWay: () => void;
 20    sending: boolean;
 21    /** False when the phone is offline: a dashed frame then shows the status may be old. */
 22    online: boolean;
 23  };
 24  
 25  export function StatusAndSound({ view, token, language, onOnMyWay, sending, online }: Props) {
 26    // True when the prompt or the sound box left the page with focus inside it; the status screen then moves focus.
 27    const lostFocus = useRef(false);
 28    return (
 29      <>
 30        {token && view.status === "waiting" && (
 31          <StillHerePrompt view={view} token={token} language={language} lostFocus={lostFocus} />
 32        )}
 33        {/* Offline: a dashed frame shows the status may be old. The frame is always there, so the status keeps its place. */}
 34        <div className={online ? "" : "rounded-xl border-4 border-dashed border-slate-700 p-1"} data-testid="status-frame">
 35          <PatientStatus view={view} language={language} onOnMyWay={onOnMyWay} sending={sending} lostFocus={lostFocus} />
 36        </div>
 37        {(view.status === "waiting" || view.status === "called") && (
 38          <SoundSwitch
 39            status={view.status}
 40            language={language}
 41            onFocusLost={() => {
 42              lostFocus.current = true;
 43            }}
 44          />
 45        )}
 46      </>
 47    );
 48  }
```

### components/patient/StillHerePrompt.tsx

```tsx
  1  "use client";
  2  
  3  // The "I'm still here" prompt on the patient screen: shows 30 minutes after triage or after the
  4  // last tap, while waiting off-site (lib/stillHere.ts). The tap only tells staff the patient is
  5  // still following the visit; the screen says it is not a health check.
  6  
  7  import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
  8  import { recordStillHere } from "@/data/patientVisit";
  9  import type { PatientView } from "@/lib/patientView";
 10  import { stillHereState } from "@/lib/stillHere";
 11  import { textFor } from "@/lib/text";
 12  import { Button } from "@/components/Button";
 13  import { useNow } from "@/components/useNow";
 14  import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
 15  
 16  /** How long the thank-you stays after a tap. */
 17  const THANKS_MS = 5 * 60_000;
 18  /** How long the hidden box keeps the thank-you, so a screen reader has time to speak it. */
 19  const THANKS_SPOKEN_MS = 3_000;
 20  
 21  type Props = {
 22    view: PatientView;
 23    token: string;
 24    language: string;
 25    /** The flag shared with the status screen, which stays on the page when this prompt leaves on a recall. */
 26    lostFocus?: RefObject<boolean>;
 27  };
 28  
 29  export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
 30    const now = useNow();
 31    const [sending, setSending] = useState(false);
 32    const [notSaved, setNotSaved] = useState(false);
 33    const [announcement, setAnnouncement] = useState("");
 34    const t = textFor(language);
 35    const state = now ? stillHereState(view, now) : "not_due";
 36    const showing = state !== "not_due";
 37    // If the prompt leaves with focus inside it (after the tap), focus goes to the status heading.
 38    // With the shared flag, the status screen also does this when the whole prompt leaves on a recall.
 39    const ownFlag = useRef(false);
 40    const markLost = useRescueFocus("status-heading", lostFocus ?? ownFlag);
 41  
 42    // Tell screen readers once each time the prompt appears (politely; it is not urgent).
 43    useEffect(() => {
 44      if (!showing) return;
 45      const timer = window.setTimeout(() => setAnnouncement(t.announce.stillHere), 300);
 46      return () => {
 47        window.clearTimeout(timer);
 48        setAnnouncement("");
 49      };
 50    }, [showing, t.announce.stillHere]);
 51  
 52    const tapped = view.lastStillHereAt ? new Date(view.lastStillHereAt).getTime() : null;
 53    const thanking = !showing && now !== null && tapped !== null && now.getTime() - tapped < THANKS_MS;
 54  
 55    // After a few seconds the hidden box goes empty, so a swipe reads the thank-you only on the card.
 56    const [thanksSpoken, setThanksSpoken] = useState(false);
 57    useEffect(() => {
 58      if (!thanking) return;
 59      const timer = window.setTimeout(() => setThanksSpoken(true), THANKS_SPOKEN_MS);
 60      return () => {
 61        window.clearTimeout(timer);
 62        setThanksSpoken(false);
 63      };
 64    }, [thanking]);
 65  
 66    async function onTap() {
 67      if (sending) return;
 68      setSending(true);
 69      const result = await recordStillHere(token);
 70      setSending(false);
 71      setNotSaved(result === "not_saved");
 72    }
 73  
 74    return (
 75      <>
 76        <p aria-live="polite" className="sr-only">
 77          {announcement}
 78        </p>
 79        {showing && (
 80          <PromptCard onFocusLost={markLost}>
 81            <h2 id="still-here-heading" className="text-xl font-bold">
 82              {t.stillHere.heading}
 83            </h2>
 84            <p>{t.stillHere.meaning}</p>
 85            <Button onClick={onTap} aria-disabled={sending} className="w-full text-lg">
 86              {sending ? t.patient.sending : t.stillHere.button}
 87            </Button>
 88            {notSaved && (
 89              <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
 90                {t.patient.notSaved}
 91              </p>
 92            )}
 93          </PromptCard>
 94        )}
 95        {/* Always on the page and always hidden, so screen readers hear the thank-you when its text
 96            comes in. It empties after a few seconds. The card below shows the same words on screen,
 97            and a screen reader user can touch it to hear them again. */}
 98        <p role="status" aria-atomic="true" className="sr-only" data-testid="still-here-thanks">
 99          {thanking && !thanksSpoken ? `${t.stillHere.thanks} ${t.stillHere.meaning}` : ""}
100        </p>
101        {thanking && (
102          <p className="clean-card font-semibold" data-testid="still-here-card">
103            {t.stillHere.thanks} {t.stillHere.meaning}
104          </p>
105        )}
106      </>
107    );
108  }
109  
110  /** The prompt's box. It tells the prompt when it leaves the page with focus inside it. */
111  function PromptCard({ onFocusLost, children }: { onFocusLost: () => void; children: ReactNode }) {
112    const box = useRef<HTMLElement>(null);
113    useReportFocusOnLeave(box, onFocusLost);
114    return (
115      <section
116        ref={box}
117        aria-labelledby="still-here-heading"
118        className="space-y-3 rounded-xl border-4 border-brand bg-card p-4"
119        data-testid="still-here"
120      >
121        {children}
122      </section>
123    );
124  }
```

### components/staff/checkInText.ts

```tsx
  1  // Staff text for the check-in panel (CheckInPanel.tsx).
  2  
  3  // The database refused off-site waiting because the site was paused on another screen.
  4  // The fallback button says "Not eligible" until the pause switch is read again (it may not be,
  5  // while the network is down), then "Waits on-site" (also its label while the switch is not read yet). Name both.
  6  export const PAUSED_NOT_SAVED =
  7    'Off-site waiting is paused at this site. Nothing was saved. Press "Not eligible" or "Waits on-site" so the patient waits on-site.';
  8  
  9  // The last read of the pause switch failed, and no earlier read worked. data/keepFresh.ts tries again every 5 seconds.
 10  // If the network is down, the "Waits on-site" save fails too ("could not be reached").
 11  export const READ_FAILED =
 12    "Could not read whether off-site waiting is paused. The patient waits on-site. The screen tries again every 5 seconds. " +
 13    "If the network is still down, no button can save.";
 14  
 15  // A later read failed, but the last good read said "not paused", so off-site waiting stays offered.
 16  // If the site was paused meanwhile, the database refuses the start (VWR02), so nothing is saved.
 17  // If the network is still down, every save fails with "could not be reached", on every button.
 18  // While the last good read said "not paused", the fallback button is labelled "Not eligible".
 19  export const STALE_READ =
 20    "Warning: could not check just now whether off-site waiting is paused. The last check said it was not paused. " +
 21    "The screen checks again every 5 seconds. If it was paused since then, a start will not be saved: " +
 22    'press "Not eligible" so the patient waits on-site. If the network is still down, no button can save.';
 23  
 24  /** The red box text while check-in offers on-site waiting only (paused, read failed, or not read yet). */
 25  export function onSiteOnlyText(offsitePaused: boolean | null, pauseReadFailed: boolean): string {
 26    // Paused comes first: it is the safer fact, even when a later read failed.
 27    if (offsitePaused) {
 28      const paused = "Off-site waiting is paused at this site: the patient waits on-site.";
 29      // A later read failed, so the network may be down, and then the save fails too.
 30      return pauseReadFailed ? `${paused} If the network is still down, no button can save.` : paused;
 31    }
 32    if (pauseReadFailed) return READ_FAILED;
 33    return "Checking whether off-site waiting is paused. The patient can wait on-site.";
 34  }
```

### components/staff/CheckInPanel.tsx

```tsx
  1  "use client";
  2  
  3  // Staff check-in after triage: CTAS level, eligibility checklist, language, then one of
  4  // "start off-site waiting", "offered, declined" or "not eligible". It checks in either a new
  5  // desk visit, or a visit the patient started from home (chosen from Expected arrivals).
  6  
  7  import { useState, type FormEvent } from "react";
  8  import { checkInVisitFromHome, createDeskVisit } from "@/data/staffActions";
  9  import type { Site, Visit } from "@/lib/visit";
 10  import type { DeskOutcome } from "@/lib/visitActions";
 11  import { LANGUAGES, menuLabel } from "@/lib/text/languages";
 12  import { Button } from "@/components/Button";
 13  import { PAUSED_NOT_SAVED, STALE_READ, onSiteOnlyText } from "./checkInText";
 14  
 15  const CHECKLIST = [
 16    { id: "phone", label: "Has a phone with them" },
 17    { id: "return", label: "Can return within 20 minutes" },
 18    { id: "agrees", label: "Agrees to wait off-site" },
 19  ] as const;
 20  
 21  type Props = {
 22    site: Site;
 23    /** Called when staff try a new check-in, before saving, so the last patient's slip is hidden. */
 24    onAttempt: () => void;
 25    onCreated: (visit: Visit) => void;
 26    /** A visit started from home that staff chose to check in, or null for a new desk visit. */
 27    homeVisit: Visit | null;
 28    /** Set when the chosen home visit changed elsewhere or expired, so it can no longer be checked in. */
 29    homeProblem: string | null;
 30    /** Leave the home visit: after it is checked in, or when staff cancel. */
 31    onHomeDone: () => void;
 32    /** true: paused; null: not read yet. Both mean check-in offers on-site waiting only. */
 33    offsitePaused: boolean | null;
 34    /** true when the last read of the pause switch failed (from useSitePauses). */
 35    pauseReadFailed: boolean;
 36  };
 37  
 38  export function CheckInPanel({
 39    site,
 40    onAttempt,
 41    onCreated,
 42    homeVisit,
 43    homeProblem,
 44    onHomeDone,
 45    offsitePaused,
 46    pauseReadFailed,
 47  }: Props) {
 48    // Only a read that says "not paused" lets staff offer off-site waiting.
 49    const onSiteOnly = offsitePaused !== false;
 50    // Off-site waiting is offered from an older good read, because the last read failed.
 51    const staleRead = offsitePaused === false && pauseReadFailed;
 52    // The warning shows only while the form can be used (no home visit problem).
 53    const showWarning = staleRead && !homeProblem;
 54  
 55    const [ctas, setCtas] = useState<4 | 5 | null>(null);
 56    const [ticked, setTicked] = useState<Record<string, boolean>>({});
 57    const [language, setLanguage] = useState("en");
 58    const [message, setMessage] = useState("");
 59    const [saving, setSaving] = useState(false);
 60  
 61    // A different home visit was chosen: start the form fresh, with the language the patient picked.
 62    const [formFor, setFormFor] = useState<string | null>(null);
 63    const homeId = homeVisit?.id ?? null;
 64    if (homeId !== formFor) {
 65      setFormFor(homeId);
 66      if (homeVisit) {
 67        setCtas(null);
 68        setTicked({});
 69        setLanguage(homeVisit.language);
 70        setMessage("");
 71      }
 72    }
 73  
 74    // Staff leave the home visit: clear its choices so none carry over to the next patient.
 75    function cancelHome() {
 76      setCtas(null);
 77      setTicked({});
 78      setLanguage("en");
 79      setMessage("");
 80      onHomeDone();
 81    }
 82  
 83    /** Save the check-in; returns the visit code, or null after showing why it was not saved. */
 84    async function save(outcome: DeskOutcome, ctasLevel: 4 | 5): Promise<string | null> {
 85      const form = { site, ctas_level: ctasLevel, language };
 86      if (homeVisit) {
 87        const result = await checkInVisitFromHome(homeVisit.id, form, outcome);
 88        if (result === "saved") {
 89          onHomeDone();
 90          return homeVisit.code;
 91        }
 92        setMessage(
 93          result === "paused"
 94            ? PAUSED_NOT_SAVED
 95            : result === "not_saved"
 96              ? "Not saved: the database could not be reached. Nothing was recorded. Try again."
 97              : `Visit ${homeVisit.code} changed or is already checked in. No check-in was saved.`,
 98        );
 99        return null;
100      }
101      const visit = await createDeskVisit(form, outcome);
102      if (visit === "paused") {
103        setMessage(PAUSED_NOT_SAVED);
104        return null;
105      }
106      if (visit === "refused") {
107        setMessage("Not saved: the database refused this check-in. Nothing was recorded.");
108        return null;
109      }
110      if (!visit) {
111        setMessage("Not saved: the database could not be reached. Nothing was recorded. Try again.");
112        return null;
113      }
114      onCreated(visit);
115      return visit.code;
116    }
117  
118    async function finish(outcome: DeskOutcome) {
119      if (saving) return; // a second press while the first is on its way must not check in twice
120      // Hide the previous patient's slip first, so a failed save never leaves it on screen
121      // where it could be handed to the next patient.
122      onAttempt();
123      if (homeProblem) return;
124      if (ctas === null) {
125        setMessage("Choose CTAS 4 or 5 first.");
126        return;
127      }
128      if (outcome === "waiting" && onSiteOnly) {
129        // What happened and what to do come first; the red-box text follows.
130        setMessage(`Nothing was saved. Press "Waits on-site" instead. ${onSiteOnlyText(offsitePaused, pauseReadFailed)}`);
131        return;
132      }
133      if (outcome === "waiting" && !CHECKLIST.every((item) => ticked[item.id])) {
134        setMessage("Tick all three checklist items to start off-site waiting.");
135        return;
136      }
137      setSaving(true);
138      setMessage("Saving...");
139      const code = await save(outcome, ctas);
140      setSaving(false);
141      if (!code) return;
142      setCtas(null);
143      setTicked({});
144      setMessage(
145        outcome === "waiting"
146          ? `Visit ${code} is now waiting off-site.`
147          : `Visit ${code} recorded as ${outcome === "declined" ? "offered, declined" : offsitePaused === true ? "waiting on-site (off-site waiting paused)" : offsitePaused === null ? "waiting on-site" : "not eligible"}. The patient waits on-site as usual.`,
148      );
149    }
150  
151    const onSubmit = (event: FormEvent) => {
152      event.preventDefault();
153      void finish("waiting");
154    };
155  
156    return (
157      <form onSubmit={onSubmit} className="glass-panel space-y-4" aria-labelledby="checkin-heading">
158        <h2 id="checkin-heading" tabIndex={-1} className="text-xl font-bold">
159          {homeVisit ? `Check in visit ${homeVisit.code} after triage` : "Check in a patient after triage"}
160        </h2>
161        {homeVisit && (
162          <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-100 p-3">
163            <p>
164              {homeVisit.source === "home" && homeVisit.triaged_at === null
165                ? "Started from home. The patient already has this visit on their phone."
166                : "Back for reassessment. The patient already has this visit on their phone. Their place in line starts again at this triage."}
167            </p>
168            <Button variant="secondary" onClick={cancelHome}>
169              Cancel: check in a new patient instead
170            </Button>
171          </div>
172        )}
173  
174        {homeProblem && (
175          <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
176            {homeProblem}
177          </p>
178        )}
179  
180        <fieldset disabled={!!homeProblem} className="min-w-0">
181          <legend className="font-semibold">CTAS level (chosen by the triage nurse)</legend>
182          <div className="mt-2 flex flex-wrap gap-3">
183            {([4, 5] as const).map((level) => (
184              <label
185                key={level}
186                className="flex min-h-11 items-center gap-2 rounded-lg border-2 border-control px-4"
187              >
188                <input
189                  type="radio"
190                  name="ctas"
191                  className="size-5"
192                  checked={ctas === level}
193                  onChange={() => setCtas(level)}
194                />
195                CTAS {level}
196              </label>
197            ))}
198          </div>
199        </fieldset>
200  
201        <fieldset disabled={!!homeProblem} className="min-w-0">
202          <legend className="font-semibold">Eligibility checklist</legend>
203          <div className="mt-2 space-y-2">
204            {CHECKLIST.map((item) => (
205              <label key={item.id} className="flex min-h-11 items-center gap-3">
206                <input
207                  type="checkbox"
208                  className="size-5"
209                  checked={!!ticked[item.id]}
210                  onChange={(e) => setTicked({ ...ticked, [item.id]: e.target.checked })}
211                />
212                {item.label}
213              </label>
214            ))}
215          </div>
216        </fieldset>
217  
218        <label className="block">
219          <span className="font-semibold">Language</span>
220          <select
221            value={language}
222            onChange={(e) => setLanguage(e.target.value)}
223            className="mt-2 block min-h-11 max-w-full rounded-lg border-2 border-control px-3"
224          >
225            {LANGUAGES.map((l) => (
226              <option key={l.code} value={l.code}>
227                {l.approved ? menuLabel(l) : `${menuLabel(l)}, draft until checked`}
228              </option>
229            ))}
230          </select>
231        </label>
232  
233        {!homeProblem && (
234          <div className="flex flex-wrap gap-3">
235            {onSiteOnly ? (
236              <p className="w-full rounded-lg border-2 border-red-800 bg-red-50 p-3 font-semibold text-red-900">
237                {onSiteOnlyText(offsitePaused, pauseReadFailed)}
238              </p>
239            ) : (
240              <Button type="submit" aria-disabled={saving} aria-describedby={staleRead ? "stale-read-warning" : undefined}>
241                Start off-site waiting
242              </Button>
243            )}
244            {/* While paused nobody can be offered off-site waiting, so "Offered, declined" would count
245                a patient as offered by mistake. "Waits on-site" records not_eligible, which leaves the
246                patient out of the dashboard's "offered" percentage, as it should. */}
247            {!onSiteOnly && (
248              <Button variant="secondary" aria-disabled={saving} onClick={() => finish("declined")}>
249                Offered, declined
250              </Button>
251            )}
252            <Button variant="secondary" aria-disabled={saving} onClick={() => finish("not_eligible")}>
253              {/* While paused or not read, the red box above says why; the label is the name the messages use. */}
254              {offsitePaused === false ? "Not eligible" : "Waits on-site"}
255            </Button>
256          </div>
257        )}
258  
259        {/* Always on the page, so screen readers hear the warning when it comes. It is below the
260            buttons, so they do not move when a read fails or works again. */}
261        <div>
262          <p
263            id="stale-read-warning"
264            role="status"
265            className={showWarning ? "mb-4 rounded-lg border-2 border-amber-800 bg-amber-50 p-3 font-semibold text-amber-950" : ""}
266          >
267            {showWarning ? STALE_READ : ""}
268          </p>
269          <p role="status" className="min-h-6 font-semibold">
270            {message}
271          </p>
272        </div>
273      </form>
274    );
275  }
```

### components/staff/VisitRow.tsx

```tsx
  1  "use client";
  2  
  3  // One patient in the staff's off-site list: minutes waited, call-back progress and actions.
  4  // The no-response flags and phone-call buttons are in FollowUpPanel.
  5  
  6  import { useState, type ReactNode } from "react";
  7  import { callBackVisit, issueNewVisitLink, markVisitArrived, removeVisit } from "@/data/staffActions";
  8  import { minutesBetween } from "@/lib/queue";
  9  import { STILL_HERE_ANSWER_WITHIN_MINUTES } from "@/lib/demoTimes";
 10  import { lastTapThisWait, stillHereState } from "@/lib/stillHere";
 11  import type { ChangeResult, Visit } from "@/lib/visit";
 12  import { Button } from "@/components/Button";
 13  import { Duration } from "./Duration";
 14  import { FollowUpPanel } from "./FollowUpPanel";
 15  import { NewLinkPanel } from "./NewLinkPanel";
 16  
 17  type Props = {
 18    visit: Visit;
 19    now: Date;
 20    onShowSlip: (visit: Visit) => void;
 21    /** Called after a change takes this patient off the list, so the page can say so and move focus. */
 22    onLeftList: (message: string) => void;
 23  };
 24  
 25  const NOT_SAVED = "Not saved: the database could not be reached. Try again.";
 26  const CHANGED = "The list just changed. Check this patient again.";
 27  
 28  function progress(visit: Visit, now: Date): ReactNode {
 29    if (visit.status === "waiting") {
 30      // "I'm still here" only shows the patient is still following the visit; never a health check.
 31      const lastTap = lastTapThisWait({ triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at });
 32      if (!lastTap) return "Waiting off-site";
 33      return (
 34        <>
 35          {`Waiting off-site · last "I'm still here" `}
 36          <Duration minutes={minutesBetween(lastTap, now)} /> ago
 37        </>
 38      );
 39    }
 40    const sinceCall = visit.called_at ? minutesBetween(visit.called_at, now) : 0;
 41    const steps: string[] = [];
 42    // seen_at means the called screen was displayed on the phone, not that the patient read it.
 43    if (visit.seen_at) steps.push("Seen (screen shown, not necessarily read)");
 44    if (visit.status === "on_the_way") steps.push("On the way");
 45    return (
 46      <>
 47        Called <Duration minutes={sinceCall} /> ago{steps.map((step) => ` · ${step}`).join("")}
 48      </>
 49    );
 50  }
 51  
 52  export function VisitRow({ visit, now, onShowSlip, onLeftList }: Props) {
 53    const [note, setNote] = useState("");
 54    const [saving, setSaving] = useState(false);
 55    /** A short "it worked" message, for a change that keeps the patient on the list. */
 56    const [okNote, setOkNote] = useState("");
 57    /** Save one change and show what happened. `leftListMessage` is announced when the patient leaves the list. */
 58    const act = async (change: () => Promise<ChangeResult>, leftListMessage?: string) => {
 59      if (saving) return; // while one change is on its way, further presses do nothing
 60      setSaving(true);
 61      setOkNote("");
 62      const result = await change();
 63      setSaving(false);
 64      if (result === "saved" && leftListMessage) {
 65        onLeftList(leftListMessage);
 66      }
 67      setNote(result === "saved" ? "" : result === "not_saved" ? NOT_SAVED : CHANGED);
 68    };
 69    /** After "Issue a new link" saves: open the slip with the new QR code and say what happened. */
 70    const showNewLink = (updated: Visit) => {
 71      onShowSlip(updated);
 72      setOkNote(`New link issued for ${visit.code}. The old link no longer works.`);
 73    };
 74    const waited = visit.triaged_at ? minutesBetween(visit.triaged_at, now) : 0;
 75  
 76    return (
 77      <li className="rounded-xl border-2 border-slate-300 bg-white p-4" data-testid={`row-${visit.code}`}>
 78        <div className="flex flex-wrap items-baseline justify-between gap-2">
 79          <p className="font-mono text-xl font-bold tracking-widest">{visit.code}</p>
 80          <p>
 81            CTAS {visit.ctas_level} · waited <strong><Duration minutes={waited} /></strong>
 82          </p>
 83        </div>
 84        <p className="mt-1 font-semibold" data-testid="progress">
 85          {progress(visit, now)}
 86        </p>
 87        {stillHereState({ status: visit.status, triagedAt: visit.triaged_at, lastStillHereAt: visit.last_still_here_at }, now) ===
 88          "missed" && (
 89          <p className="mt-2 rounded-lg border-2 border-red-800 bg-red-50 p-2 font-semibold text-red-900" data-testid="still-here-flag">
 90            {`Missed "I'm still here": no tap within ${STILL_HERE_ANSWER_WITHIN_MINUTES} min of the prompt. Not a health check.`}
 91          </p>
 92        )}
 93        <FollowUpPanel visit={visit} now={now} saving={saving} act={act} />
 94        <div className="mt-3 flex flex-wrap gap-2">
 95          {visit.status === "waiting" && (
 96            <Button aria-disabled={saving} onClick={() => act(() => callBackVisit(visit.id))}>
 97              Recall patient<span className="sr-only"> {visit.code}</span>
 98            </Button>
 99          )}
100          <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => markVisitArrived(visit.id), `Visit ${visit.code} marked arrived. Undo is under Recently closed.`)}>
101            Mark arrived
102          </Button>
103          <Button variant="secondary" onClick={() => onShowSlip(visit)}>
104            Show QR again
105          </Button>
106        </div>
107        <details className="mt-3">
108          <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
109            Remove from list
110          </summary>
111          <div className="mt-2 flex flex-wrap gap-2">
112            <Button variant="danger" aria-disabled={saving} onClick={() => act(() => removeVisit(visit.id, "left"), `Visit ${visit.code} removed: left. Undo is under Recently closed.`)}>
113              Left
114            </Button>
115            <Button variant="danger" aria-disabled={saving} onClick={() => act(() => removeVisit(visit.id, "no_show"), `Visit ${visit.code} removed: no-show. Undo is under Recently closed.`)}>
116              No-show
117            </Button>
118          </div>
119        </details>
120        <NewLinkPanel code={visit.code} saving={saving} onConfirm={() => act(() => issueNewVisitLink(visit.id, showNewLink))} />
121        {(saving || note || okNote) && (
122          <p role="status" className={`mt-2 font-semibold ${saving || !note ? "" : "text-red-800"}`}>
123            {saving ? "Saving…" : note || okNote}
124          </p>
125        )}
126      </li>
127    );
128  }
```

### components/staff/FollowUpPanel.tsx

```tsx
  1  "use client";
  2  
  3  // The no-response steps on one staff row after "Recall patient": the flag ("Phone this patient",
  4  // "Review: unable to reach" and so on), the simulated phone-call buttons, and the nurse's
  5  // confirmation of "unable to reach". The rule that picks the flag is in lib/followUp.ts.
  6  
  7  import { confirmUnableToReachFor, recordPhoneCallFor } from "@/data/staffActions";
  8  import { CALL_PHONE_AGAIN_MINUTES, CALL_REVIEW_MINUTES, CALL_SECOND_ALERT_MINUTES } from "@/lib/demoTimes";
  9  import { canRecordPhoneCall, staffFollowUp, type StaffFollowUp } from "@/lib/followUp";
 10  import { formatMinutes } from "@/lib/duration";
 11  import { enDuration } from "@/lib/text/en";
 12  import { formatDuration } from "@/lib/waitText";
 13  import { minutesBetween } from "@/lib/queue";
 14  import type { ChangeResult, Visit } from "@/lib/visit";
 15  import { Button } from "@/components/Button";
 16  import type { ReactNode } from "react";
 17  import { Duration } from "./Duration";
 18  
 19  type Props = {
 20    visit: Visit;
 21    now: Date;
 22    saving: boolean;
 23    /** The row's save helper: saves one change and shows what happened. */
 24    act: (change: () => Promise<ChangeResult>, leftListMessage?: string) => void;
 25  };
 26  
 27  const AMBER = "border-amber-800 bg-amber-50 text-amber-950";
 28  const RED = "border-red-800 bg-red-50 text-red-900";
 29  
 30  const clock = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
 31  
 32  /**
 33   * One flag: its words, their colour, and the words screen readers hear. `body`, when there, is what
 34   * the screen shows in place of `text` (with a time that screen readers hear in full words).
 35   */
 36  type Flag = { text: string; tone: string; spoken: string; body?: ReactNode };
 37  
 38  /** A flag whose spoken words are the same as its words on screen. */
 39  const same = (text: string, tone: string): Flag => ({ text, tone, spoken: text });
 40  
 41  /**
 42   * A flag with a fixed time in it: "10 min" on screen, "10 minutes" for screen readers, which can
 43   * read "min" as letters. The time is a fixed step (not a count), so the words stay the same each minute.
 44   */
 45  const withTime = (before: string, minutes: number, after: string, tone: string): Flag => ({
 46    text: `${before}${formatMinutes(minutes)}${after}`,
 47    tone,
 48    spoken: `${before}${formatDuration(minutes, enDuration)}${after}`,
 49    body: (
 50      <>
 51        {before}
 52        <Duration minutes={minutes} />
 53        {after}
 54      </>
 55    ),
 56  });
 57  
 58  /**
 59   * The words and colour of each flag; null when there is nothing to flag. `spoken` leaves out
 60   * minute counts that go up, so the words do not change, and are not read again, every minute.
 61   */
 62  export function flagFor(followUp: StaffFollowUp, visit: Visit, now: Date): Flag | null {
 63    switch (followUp.kind) {
 64      case "phone":
 65        return withTime("No reply ", CALL_SECOND_ALERT_MINUTES, " after call-back. Phone the patient now.", AMBER);
 66      case "phone_again": {
 67        // "again" only if someone already phoned; staff may have missed the first flag.
 68        const ask = visit.phone_attempts === 0 ? "Phone the patient now." : "Phone the patient again.";
 69        return withTime("Still no reply ", CALL_PHONE_AGAIN_MINUTES, ` after call-back. ${ask}`, AMBER);
 70      }
 71      case "paused":
 72        return same(`Phoned, answered. Follow-up paused until ${clock(followUp.until)}.`, AMBER);
 73      case "review":
 74        return withTime(
 75          "Review: unable to reach. No answered call ",
 76          CALL_REVIEW_MINUTES,
 77          " after the call-back. Stays in the line until a nurse confirms.",
 78          RED,
 79        );
 80      case "contacted_not_arrived":
 81        return same(`Answered the phone, but hasn't arrived or tapped "I'm on my way" yet.`, AMBER);
 82      case "on_way_not_arrived": {
 83        const since = visit.confirmed_at ? minutesBetween(visit.confirmed_at, now) : 0;
 84        return {
 85          text: `On the way, not arrived. Confirmed ${formatMinutes(since)} ago.`,
 86          tone: AMBER,
 87          spoken: "On the way, not arrived.",
 88          body: (
 89            <>
 90              On the way, not arrived. Confirmed <Duration minutes={since} /> ago.
 91            </>
 92          ),
 93        };
 94      }
 95      default:
 96        return null;
 97    }
 98  }
 99  
100  export function FollowUpPanel({ visit, now, saving, act }: Props) {
101    const followUp = staffFollowUp(visit, now);
102    const flag = flagFor(followUp, visit, now);
103    const canPhone = canRecordPhoneCall(visit, now);
104    // Screen readers hear each new flag once (politely), without the minute counts.
105    const spoken = flag ? `Visit ${visit.code}: ${flag.spoken}` : "";
106    const announcer = (
107      <p role="status" className="sr-only">
108        {spoken}
109      </p>
110    );
111    // The announcer stays in the same place whether or not the rest shows, so it is never
112    // re-created at the moment a flag appears (a new region is often not read).
113    return (
114      <>
115        {announcer}
116        {(flag || canPhone) && (
117          <div className="mt-2 space-y-2" data-testid="follow-up">
118            {flag && (
119              <p className={`rounded-lg border-2 p-2 font-semibold ${flag.tone}`} data-testid={`flag-${followUp.kind}`}>
120                {flag.body ?? flag.text}
121              </p>
122            )}
123            {canPhone && (
124              <div className="space-y-2">
125                <p className="text-sm text-slate-700">
126                  Simulated calls (the demo stores no phone numbers). Recorded so far: {visit.phone_attempts}
127                  {visit.last_phone_result && ` (last: ${visit.last_phone_result === "answered" ? "answered" : "no answer"})`}.
128                </p>
129                <div className="flex flex-wrap gap-2">
130                  <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => recordPhoneCallFor(visit.id, "answered"))}>
131                    Phoned, answered<span className="sr-only"> for visit {visit.code}</span>
132                  </Button>
133                  <Button variant="secondary" aria-disabled={saving} onClick={() => act(() => recordPhoneCallFor(visit.id, "no_answer"))}>
134                    Phoned, no answer<span className="sr-only"> for visit {visit.code}</span>
135                  </Button>
136                </div>
137              </div>
138            )}
139            {followUp.kind === "review" && (
140              <details>
141                <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
142                  Confirm unable to reach
143                </summary>
144                <p className="mt-1 text-sm">
145                  The visit leaves the off-site line. It is not recorded as left without being seen. Follow hospital policy outside the app.
146                </p>
147                <Button
148                  variant="danger"
149                  className="mt-2"
150                  aria-disabled={saving}
151                  onClick={() =>
152                    act(
153                      () => confirmUnableToReachFor(visit.id),
154                      `Visit ${visit.code} confirmed unable to reach. Reopen is under Recently closed.`,
155                    )
156                  }
157                >
158                  Yes, unable to reach<span className="sr-only"> for visit {visit.code}</span>
159                </Button>
160              </details>
161            )}
162          </div>
163        )}
164      </>
165    );
166  }
```

### lib/followUp.ts

```tsx
  1  // The no-response steps after "Recall patient" (SPEC /staff): which flag staff see, and which
  2  // message the patient's called screen shows. Minutes always count from called_at; an answered
  3  // phone call pauses the staff flags, then they continue from that same clock (no restart).
  4  // All times are demo settings in lib/demoTimes.ts, not clinical deadlines.
  5  
  6  import {
  7    CALL_PHONE_AGAIN_MINUTES,
  8    CALL_REVIEW_MINUTES,
  9    CALL_SECOND_ALERT_MINUTES,
 10    ON_WAY_NOT_ARRIVED_MINUTES,
 11  } from "./demoTimes";
 12  import type { Visit, VisitStatus } from "./visit";
 13  
 14  /** What the staff row shows for a called-back visit. */
 15  export type StaffFollowUp =
 16    | { kind: "none" }
 17    /** "Phoned, answered" was recorded; flags wait until `until`. */
 18    | { kind: "paused"; until: string }
 19    /** "Phone this patient." */
 20    | { kind: "phone" }
 21    /** "Phone a second time." */
 22    | { kind: "phone_again" }
 23    /** "Review: unable to reach." A nurse must confirm before the visit leaves the line. */
 24    | { kind: "review" }
 25    /** A call was answered but the patient has still not confirmed or arrived. Never "unable to reach". */
 26    | { kind: "contacted_not_arrived" }
 27    /** Tapped "I'm on my way" a while ago and not marked arrived. Never removed automatically. */
 28    | { kind: "on_way_not_arrived" };
 29  
 30  type FollowUpFields = Pick<
 31    Visit,
 32    "status" | "called_at" | "confirmed_at" | "phone_attempts" | "last_phone_result" | "followup_paused_until"
 33  >;
 34  
 35  const MINUTE_MS = 60_000;
 36  
 37  const minutesSince = (iso: string, now: Date) => (now.getTime() - new Date(iso).getTime()) / MINUTE_MS;
 38  
 39  /**
 40   * True if any call since this call-back was answered. last_phone_result holds only the latest
 41   * result, but followup_paused_until is set only by an answered call (and cleared at triage),
 42   * so a later "no answer" never turns an answered visit into "unable to reach".
 43   */
 44  export function wasAnswered(visit: Pick<Visit, "last_phone_result" | "followup_paused_until">): boolean {
 45    return visit.last_phone_result === "answered" || visit.followup_paused_until !== null;
 46  }
 47  
 48  export function staffFollowUp(visit: FollowUpFields, now: Date): StaffFollowUp {
 49    if (visit.status === "on_the_way") {
 50      const late = visit.confirmed_at !== null && minutesSince(visit.confirmed_at, now) >= ON_WAY_NOT_ARRIVED_MINUTES;
 51      return late ? { kind: "on_way_not_arrived" } : { kind: "none" };
 52    }
 53    if (visit.status !== "called" || !visit.called_at) return { kind: "none" };
 54    const pausedUntil = visit.followup_paused_until;
 55    if (pausedUntil && now.getTime() < new Date(pausedUntil).getTime()) return { kind: "paused", until: pausedUntil };
 56  
 57    const minutes = minutesSince(visit.called_at, now);
 58    if (minutes >= CALL_REVIEW_MINUTES) {
 59      return wasAnswered(visit) ? { kind: "contacted_not_arrived" } : { kind: "review" };
 60    }
 61    // Each phone flag clears once staff record that many calls (answered or not).
 62    if (minutes >= CALL_PHONE_AGAIN_MINUTES) return visit.phone_attempts >= 2 ? { kind: "none" } : { kind: "phone_again" };
 63    if (minutes >= CALL_SECOND_ALERT_MINUTES) return visit.phone_attempts >= 1 ? { kind: "none" } : { kind: "phone" };
 64    return { kind: "none" };
 65  }
 66  
 67  /** Staff can record a simulated phone call from the "Phone this patient" step onwards, while called. */
 68  export function canRecordPhoneCall(visit: Pick<Visit, "status" | "called_at">, now: Date): boolean {
 69    return (
 70      visit.status === "called" &&
 71      visit.called_at !== null &&
 72      minutesSince(visit.called_at, now) >= CALL_SECOND_ALERT_MINUTES
 73    );
 74  }
 75  
 76  /** What the patient's called screen adds: nothing yet, the second alert, or "Please return now". */
 77  export type PatientCallStep = "first" | "second_alert" | "return_now";
 78  
 79  /**
 80   * Only while called and not yet confirmed. The patient's messages follow the clock alone;
 81   * an answered phone call pauses only the staff flags (the patient view never sees it).
 82   */
 83  export function patientCallStep(status: VisitStatus, calledAt: string | null, now: Date): PatientCallStep {
 84    if (status !== "called" || !calledAt) return "first";
 85    const minutes = minutesSince(calledAt, now);
 86    if (minutes >= CALL_PHONE_AGAIN_MINUTES) return "return_now";
 87    if (minutes >= CALL_SECOND_ALERT_MINUTES) return "second_alert";
 88    return "first";
 89  }
```

### components/staff/ExpectedArrivals.tsx

```tsx
  1  "use client";
  2  
  3  // The staff "Expected arrivals" list: visits started from home that have not reached triage.
  4  // They are not in the waiting line. Staff pick one from the list, or type the code the patient
  5  // shows (short-code lookup is staff-only), to check it in after triage. The code box also finds
  6  // a reopened visit that needs reassessment; those are also listed under "Back for reassessment".
  7  
  8  import { useState, type FormEvent } from "react";
  9  import { findVisitByCode } from "@/data/staffActions";
 10  import { backForReassessment, expectedArrivals, isExpected } from "@/lib/expectedArrivals";
 11  import { Duration } from "./Duration";
 12  import { minutesBetween } from "@/lib/queue";
 13  import type { Site, Visit } from "@/lib/visit";
 14  import { Button } from "@/components/Button";
 15  
 16  type Props = { visits: Visit[]; site: Site; now: Date; onChoose: (visit: Visit) => void };
 17  
 18  export function ExpectedArrivals({ visits, site, now, onChoose }: Props) {
 19    const [typed, setTyped] = useState("");
 20    const [message, setMessage] = useState("");
 21    const expected = expectedArrivals(visits, site, now);
 22    const reassess = backForReassessment(visits, site);
 23  
 24    const [looking, setLooking] = useState(false);
 25  
 26    const find = async (event: FormEvent) => {
 27      event.preventDefault();
 28      if (looking) return;
 29      setLooking(true);
 30      setMessage("Looking…");
 31      const visit = await findVisitByCode(typed);
 32      setLooking(false);
 33      if (visit === "failed") {
 34        return setMessage("Could not look up the code: the database could not be reached. Try again.");
 35      }
 36      if (!visit) return setMessage("No visit has that code. Check the code with the patient.");
 37      if (visit.site !== site) {
 38        return setMessage(`Visit ${visit.code} was started for Demo Site ${visit.site}. Switch site to check it in.`);
 39      }
 40      if (!isExpected(visit, now) && visit.status !== "needs_reassessment") {
 41        return setMessage(
 42          visit.status === "pre_arrival"
 43            ? `Visit ${visit.code} was started more than 6 hours ago. Check the patient in as a new visit.`
 44            : `Visit ${visit.code} is already checked in.`,
 45        );
 46      }
 47      setMessage("");
 48      setTyped("");
 49      onChoose(visit);
 50    };
 51  
 52    return (
 53      <section aria-labelledby="expected-heading" className="glass-panel space-y-3">
 54        <h2 id="expected-heading" className="text-xl font-bold">
 55          Expected arrivals ({expected.length})
 56        </h2>
 57        <p className="text-sm text-slate-700">
 58          Started from home, not yet triaged. Not in the waiting line.
 59        </p>
 60        <form onSubmit={find} className="flex flex-wrap items-end gap-2">
 61          <label className="block max-w-full">
 62            <span className="font-semibold">Visit code</span>
 63            <input
 64              value={typed}
 65              onChange={(e) => setTyped(e.target.value)}
 66              autoComplete="off"
 67              spellCheck={false}
 68              className="mt-1 block min-h-11 w-40 max-w-full rounded-lg border-2 border-control px-3 font-mono uppercase tracking-widest"
 69            />
 70          </label>
 71          <Button type="submit" variant="secondary" aria-disabled={looking}>
 72            Find visit
 73          </Button>
 74        </form>
 75        <p role="status" className="min-h-6 font-semibold">
 76          {message}
 77        </p>
 78        {reassess.length > 0 && (
 79          <div className="space-y-2">
 80            <h3 className="font-bold">Back for reassessment ({reassess.length})</h3>
 81            <p className="text-sm text-slate-700">{`Reopened after "unable to reach". Triage again before they rejoin the line.`}</p>
 82            <ul className="space-y-2">
 83              {reassess.map((visit) => (
 84                <li
 85                  key={visit.id}
 86                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-amber-800 bg-amber-50 p-3"
 87                  data-testid={`reassess-${visit.code}`}
 88                >
 89                  <p>
 90                    <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · needs reassessment
 91                  </p>
 92                  <Button variant="secondary" onClick={() => onChoose(visit)}>
 93                    Triage again<span className="sr-only"> visit {visit.code}</span>
 94                  </Button>
 95                </li>
 96              ))}
 97            </ul>
 98          </div>
 99        )}
100        {expected.length > 0 && (
101          <ul className="space-y-2">
102            {expected.map((visit) => (
103              <li
104                key={visit.id}
105                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border-2 border-slate-300 bg-white p-3"
106                data-testid={`expected-${visit.code}`}
107              >
108                <p>
109                  <span className="font-mono text-lg font-bold tracking-widest">{visit.code}</span> · started{" "}
110                  <Duration minutes={minutesBetween(visit.created_at, now)} /> ago
111                </p>
112                <Button variant="secondary" onClick={() => onChoose(visit)}>
113                  Check in<span className="sr-only"> visit {visit.code}</span>
114                </Button>
115              </li>
116            ))}
117          </ul>
118        )}
119      </section>
120    );
121  }
```

### components/staff/RecentlyClosed.tsx

```tsx
  1  "use client";
  2  
  3  // The staff "Recently closed" list: patients marked arrived, left or no-show at this site,
  4  // newest first, each with its own Undo button; a visit confirmed "unable to reach" has a
  5  // Reopen button instead, which sends it back to triage. There is no time limit, and older closures
  6  // stay reachable with "Show older closures", so nobody has to hurry.
  7  
  8  import { useEffect, useRef, useState } from "react";
  9  import { reopenVisit, undoCloseVisit } from "@/data/staffActions";
 10  import { CLOSED_PAGE_SIZE, closedLabel, recentlyClosed } from "@/lib/recentlyClosed";
 11  import type { Site, Visit } from "@/lib/visit";
 12  import { Button } from "@/components/Button";
 13  
 14  type Props = {
 15    visits: Visit[];
 16    site: Site;
 17    /** Called after an Undo, with words for screen readers; `undone` is true when it worked. */
 18    onUndoResult: (message: string, undone: boolean) => void;
 19    /** Called after a working Reopen, so the page can open the visit in the check-in form. */
 20    onReopened: (visit: Visit) => void;
 21  };
 22  
 23  export function RecentlyClosed({ visits, site, onUndoResult, onReopened }: Props) {
 24    // A failure note stays beside its own row, and the row (with its Undo button) stays too.
 25    const [notes, setNotes] = useState<Record<string, string>>({});
 26    const [savingId, setSavingId] = useState<string | null>(null);
 27    const [shownCount, setShownCount] = useState(CLOSED_PAGE_SIZE);
 28    const [revealed, setRevealed] = useState<{ first: number; message: string } | null>(null);
 29    const listRef = useRef<HTMLUListElement>(null);
 30    const all = recentlyClosed(visits, site);
 31  
 32    // After "Show older closures", move focus to the first newly shown row (the button may be gone).
 33    useEffect(() => {
 34      if (revealed) listRef.current?.querySelectorAll("li")[revealed.first]?.focus();
 35    }, [revealed]);
 36  
 37    if (all.length === 0) return null;
 38    const closed = all.slice(0, shownCount);
 39    const older = all.length - closed.length;
 40  
 41    const showOlder = () => {
 42      const added = Math.min(CLOSED_PAGE_SIZE, older);
 43      setRevealed({ first: closed.length, message: `Showing ${added} older ${added === 1 ? "closure" : "closures"}.` });
 44      setShownCount(shownCount + CLOSED_PAGE_SIZE);
 45    };
 46  
 47    const undo = async (visit: Visit) => {
 48      if (savingId) return; // one Undo at a time, so a double press cannot send it twice
 49      setSavingId(visit.id);
 50      const reopening = visit.status === "unable_to_reach";
 51      const result = reopening ? await reopenVisit(visit.id) : await undoCloseVisit(visit.id, visit);
 52      setSavingId(null);
 53      const verb = reopening ? "reopened" : "undone";
 54      const note =
 55        result === "saved"
 56          ? ""
 57          : result === "not_saved"
 58            ? `Not saved: the database could not be reached, so visit ${visit.code} was not ${verb}. Try again.`
 59            : `Could not ${reopening ? "reopen" : "undo"} visit ${visit.code}: it changed since it was closed.`;
 60      setNotes({ ...notes, [visit.id]: note });
 61      if (result === "saved" && reopening) {
 62        onUndoResult(`Reopened: visit ${visit.code} needs reassessment. Triage the patient again below.`, true);
 63        onReopened(visit);
 64        return;
 65      }
 66      onUndoResult(result === "saved" ? `Undone: visit ${visit.code} is back on the list.` : note, result === "saved");
 67    };
 68  
 69    return (
 70      <section aria-labelledby="closed-heading" className="space-y-2">
 71        <h3 id="closed-heading" className="text-lg font-bold">
 72          Recently closed
 73        </h3>
 74        <p className="text-sm text-slate-700">
 75          Pressed by mistake? Undo puts the patient back where they were. Reopen sends a patient who could not be reached back to triage.
 76        </p>
 77        <ul ref={listRef} className="space-y-2">
 78          {closed.map((visit) => (
 79            <li key={visit.id} tabIndex={-1} className="rounded-lg border-2 border-slate-300 bg-white p-3" data-testid={`closed-${visit.code}`}>
 80              <div className="flex flex-wrap items-center justify-between gap-2">
 81                <p>
 82                  <span className="font-mono font-bold tracking-widest">{visit.code}</span> {closedLabel(visit)}
 83                </p>
 84                <Button variant="secondary" aria-disabled={savingId !== null} onClick={() => undo(visit)}>
 85                  {savingId === visit.id ? "Saving…" : visit.status === "unable_to_reach" ? "Reopen" : "Undo"}
 86                  <span className="sr-only"> for visit {visit.code}</span>
 87                </Button>
 88              </div>
 89              {notes[visit.id] && <p className="mt-2 font-semibold text-red-800">{notes[visit.id]}</p>}
 90            </li>
 91          ))}
 92        </ul>
 93        {older > 0 && (
 94          <Button variant="secondary" onClick={showOlder}>
 95            Show older closures ({older} more)
 96          </Button>
 97        )}
 98        <p role="status" className="sr-only">
 99          {revealed?.message}
100        </p>
101      </section>
102    );
103  }
```

### components/staff/RecallAllPanel.tsx

```tsx
  1  "use client";
  2  
  3  // The "Recall all off-site patients" button for a surge or a system problem, with a
  4  // confirmation that names the site and how many patients it reaches. Only the patients
  5  // counted in that confirmation are recalled (lib/recallAll.ts).
  6  
  7  import { useEffect, useRef, useState } from "react";
  8  import { recallAll } from "@/data/staffActions";
  9  import { patientCount } from "@/lib/patientCount";
 10  import { recallAllMessage, recallAllTargets } from "@/lib/recallAll";
 11  import type { Site, Visit } from "@/lib/visit";
 12  import { Button } from "@/components/Button";
 13  
 14  type Props = {
 15    visits: Visit[];
 16    site: Site;
 17    /**
 18     * Called with words for staff and screen readers after a recall, or after a failed one.
 19     * `closed` is true when the confirmation closed (the page then moves focus, because the
 20     * focused button just disappeared); after a failed save the box stays open with focus in it.
 21     */
 22    onResult: (message: string, closed: boolean) => void;
 23  };
 24  
 25  export function RecallAllPanel({ visits, site, onResult }: Props) {
 26    /** The visits shown in the open confirmation, or null when it is closed. */
 27    const [asked, setAsked] = useState<Visit[] | null>(null);
 28    const [saving, setSaving] = useState(false);
 29    const question = useRef<HTMLHeadingElement>(null);
 30    const openButton = useRef<HTMLButtonElement>(null);
 31    const targets = recallAllTargets(visits, site);
 32  
 33    // Move focus to the question when it opens, so keyboard and screen-reader users land on it.
 34    useEffect(() => {
 35      if (asked) question.current?.focus();
 36    }, [asked]);
 37  
 38    const cancel = () => {
 39      setAsked(null);
 40      // Focus goes back to the button once it is shown again.
 41      window.setTimeout(() => openButton.current?.focus(), 0);
 42    };
 43  
 44    const confirm = async () => {
 45      if (!asked || saving) return;
 46      setSaving(true);
 47      const result = await recallAll(asked.map((v) => v.id));
 48      setSaving(false);
 49      if (!result.notSaved) setAsked(null);
 50      onResult(recallAllMessage(result, site), !result.notSaved);
 51    };
 52  
 53    if (!asked) {
 54      if (targets.length === 0) return null;
 55      return (
 56        <Button ref={openButton} variant="danger" onClick={() => setAsked(targets)}>
 57          Recall all off-site patients ({targets.length})
 58        </Button>
 59      );
 60    }
 61  
 62    const n = asked.length;
 63    return (
 64      <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="recall-all-confirm">
 65        <h3 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
 66          Recall all {patientCount(n)} waiting off-site at Demo Site {site}?
 67        </h3>
 68        <p>
 69          {`Each patient's phone will show "Please head back now". Use this for a surge or a system problem. `}
 70          There is no undo: recalled patients stay recalled.
 71        </p>
 72        <p className="font-mono tracking-widest">{asked.map((v) => v.code).join(" · ")}</p>
 73        <div className="flex flex-wrap gap-2">
 74          <Button variant="danger" aria-disabled={saving} onClick={confirm}>
 75            {saving ? "Saving…" : `Yes, recall all ${n}`}
 76          </Button>
 77          <Button variant="secondary" aria-disabled={saving} onClick={cancel}>
 78            Cancel
 79          </Button>
 80        </div>
 81      </div>
 82    );
 83  }
```

### components/staff/PauseSwitch.tsx

```tsx
  1  "use client";
  2  
  3  // The "Pause off-site waiting" switch for one site (SPEC /staff), for downtime or a contact
  4  // problem. Pausing needs one confirmation. While paused, a banner asks staff to check every
  5  // outstanding recall and offer on-site waiting. Turning it back on needs a second, separate
  6  // confirmation: a tick that patients can be reached again, then the button.
  7  
  8  import { useEffect, useRef, useState } from "react";
  9  import { setSitePaused } from "@/data/sitePauses";
 10  import { patientCount } from "@/lib/patientCount";
 11  import type { ChangeResult, Site } from "@/lib/visit";
 12  import { Button } from "@/components/Button";
 13  
 14  type Props = {
 15    site: Site;
 16    /** The switch as last read, or null if it could not be read yet. */
 17    paused: boolean | null;
 18    /** Patients still in the off-site line at this site (waiting or recalled), or null while the list is not read yet. */
 19    offSiteCount: number | null;
 20    /** Called with words for staff and screen readers after each change. */
 21    onResult: (message: string) => void;
 22  };
 23  
 24  type Mode = "idle" | "confirmPause" | "confirmResume";
 25  
 26  export function PauseSwitch({ site, paused, offSiteCount, onResult }: Props) {
 27    const [mode, setMode] = useState<Mode>("idle");
 28    const [checked, setChecked] = useState(false);
 29    const [saving, setSaving] = useState(false);
 30    const [note, setNote] = useState("");
 31    const question = useRef<HTMLHeadingElement>(null);
 32    // After Cancel or a save, focus lands on the one button that is still on screen.
 33    const pauseButton = useRef<HTMLButtonElement>(null);
 34    const resumeButton = useRef<HTMLButtonElement>(null);
 35  
 36    // Keyboard and screen-reader users land on each confirmation question when it opens.
 37    useEffect(() => {
 38      if (mode !== "idle") question.current?.focus();
 39    }, [mode]);
 40  
 41    if (paused === null) {
 42      return <p className="text-sm text-slate-700">Checking whether off-site waiting is paused at this site…</p>;
 43    }
 44  
 45    // Count words only when the list has been read; otherwise the sentences name no number.
 46    const stillOff = offSiteCount === null ? "the patients still off-site" : `the ${patientCount(offSiteCount)} still off-site`;
 47    const alreadyOff = offSiteCount === null ? "Patients already off-site" : `The ${patientCount(offSiteCount)} already off-site`;
 48  
 49    const close = () => {
 50      setMode("idle");
 51      setChecked(false);
 52      setNote("");
 53      window.setTimeout(() => (resumeButton.current ?? pauseButton.current)?.focus(), 0);
 54    };
 55  
 56    const save = async (pause: boolean) => {
 57      if (saving) return;
 58      if (!pause && !checked) {
 59        setNote("Tick the box first to confirm patients can be reached again.");
 60        return;
 61      }
 62      setSaving(true);
 63      const result: ChangeResult = await setSitePaused(site, pause);
 64      setSaving(false);
 65      if (result === "not_saved") {
 66        setNote("Not saved: the database could not be reached. Nothing changed. Try again.");
 67        return;
 68      }
 69      if (result === "refused") {
 70        onResult(`Another screen already ${pause ? "paused" : "resumed"} off-site waiting at Demo Site ${site}.`);
 71      } else {
 72        onResult(
 73          pause
 74            ? `Off-site waiting paused at Demo Site ${site}. Check every outstanding recall.`
 75            : `Off-site waiting is back on at Demo Site ${site}.`,
 76        );
 77      }
 78      close();
 79    };
 80  
 81    return (
 82      <section aria-labelledby={`pause-heading-${site}`} className="space-y-2" data-testid="pause-switch">
 83        <h3 id={`pause-heading-${site}`} className="sr-only">
 84          Off-site waiting switch, Demo Site {site}
 85        </h3>
 86  
 87        {paused && (
 88          <div className="space-y-2 rounded-xl border-4 border-red-800 bg-red-50 p-4 text-red-950" data-testid="paused-banner">
 89            <p className="text-lg font-bold">Off-site waiting is paused at Demo Site {site}.</p>
 90            <p>
 91              No new off-site sign-ups: the start page sends patients to the emergency department, and check-in offers
 92              on-site waiting only. Check every outstanding recall, and offer on-site waiting to {stillOff}.
 93            </p>
 94            {mode === "idle" && (
 95              <Button ref={resumeButton} variant="secondary" onClick={() => setMode("confirmResume")}>
 96                Turn off-site waiting back on…
 97              </Button>
 98            )}
 99          </div>
100        )}
101  
102        {!paused && mode === "idle" && (
103          <Button ref={pauseButton} variant="secondary" onClick={() => setMode("confirmPause")}>
104            Pause off-site waiting at Demo Site {site}…
105          </Button>
106        )}
107  
108        {mode === "confirmPause" && (
109          <div className="space-y-3 rounded-xl border-4 border-red-800 bg-white p-4" data-testid="pause-confirm">
110            <h4 ref={question} tabIndex={-1} className="text-lg font-bold text-red-900">
111              Pause off-site waiting at Demo Site {site}?
112            </h4>
113            <p>
114              Use this for downtime or a contact problem. New patients will wait on-site. {alreadyOff} keep their visits,
115              and you will be asked to check each one.
116            </p>
117            <div className="flex flex-wrap gap-2">
118              <Button variant="danger" aria-disabled={saving} onClick={() => save(true)}>
119                {saving ? "Saving…" : "Yes, pause off-site waiting"}
120              </Button>
121              <Button variant="secondary" aria-disabled={saving} onClick={close}>
122                Cancel
123              </Button>
124            </div>
125          </div>
126        )}
127  
128        {mode === "confirmResume" && (
129          <div className="space-y-3 rounded-xl border-4 border-slate-700 bg-white p-4" data-testid="resume-confirm">
130            <h4 ref={question} tabIndex={-1} className="text-lg font-bold">
131              Turn off-site waiting back on at Demo Site {site}?
132            </h4>
133            <label className="flex min-h-11 items-center gap-3">
134              <input type="checkbox" className="size-5" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
135              I have checked that patients can be reached again (phones and this app work).
136            </label>
137            <div className="flex flex-wrap gap-2">
138              <Button aria-disabled={saving || !checked} onClick={() => save(false)}>
139                {saving ? "Saving…" : "Yes, turn it back on"}
140              </Button>
141              <Button variant="secondary" aria-disabled={saving} onClick={close}>
142                Cancel
143              </Button>
144            </div>
145          </div>
146        )}
147  
148        {note && (
149          <p role="alert" className="font-semibold text-red-800">
150            {note}
151          </p>
152        )}
153      </section>
154    );
155  }
```

### components/staff/NewLinkPanel.tsx

```tsx
  1  "use client";
  2  
  3  // The "Lost or stolen phone" panel for one visit. Staff must confirm before a new link is issued,
  4  // because the old phone stops working at once. This file only asks; the parent saves the change.
  5  
  6  import { useEffect, useRef, useState } from "react";
  7  import { Button } from "@/components/Button";
  8  
  9  type Props = {
 10    /** The visit code, read out with the button so staff know which patient it is for. */
 11    code: string;
 12    /** True while a change is on its way. "Yes" does nothing then. */
 13    saving: boolean;
 14    /** Called once staff confirm. */
 15    onConfirm: () => void;
 16  };
 17  
 18  type Mode = "idle" | "confirm";
 19  
 20  export function NewLinkPanel({ code, saving, onConfirm }: Props) {
 21    const [mode, setMode] = useState<Mode>("idle");
 22    const issueButton = useRef<HTMLButtonElement>(null);
 23    const yesButton = useRef<HTMLButtonElement>(null);
 24  
 25    // When the confirm question opens, focus moves to "Yes" for keyboard and screen-reader users.
 26    useEffect(() => {
 27      if (mode === "confirm") yesButton.current?.focus();
 28    }, [mode]);
 29  
 30    // Back to the first state. The "Issue a new link" button is drawn again, so focus waits one tick.
 31    const returnToIssue = () => {
 32      setMode("idle");
 33      window.setTimeout(() => issueButton.current?.focus(), 0);
 34    };
 35  
 36    const confirm = () => {
 37      if (saving) return;
 38      onConfirm();
 39      returnToIssue();
 40    };
 41  
 42    return (
 43      <details className="mt-3">
 44        <summary className="cursor-pointer py-2 text-slate-800 underline underline-offset-2">
 45          Lost or stolen phone
 46        </summary>
 47        <div className="mt-2 space-y-2">
 48          <p>The old link and the old slip stop working. Give the patient the new QR code.</p>
 49          {mode === "idle" && (
 50            <Button variant="secondary" ref={issueButton} aria-disabled={saving} onClick={() => setMode("confirm")}>
 51              Issue a new link<span className="sr-only"> {code}</span>
 52            </Button>
 53          )}
 54          {mode === "confirm" && (
 55            <>
 56              <p className="font-semibold">The old phone stops working at once. Issue a new link for {code}?</p>
 57              <div className="flex flex-wrap gap-2">
 58                <Button variant="danger" ref={yesButton} aria-disabled={saving} onClick={confirm}>
 59                  Yes, issue a new link
 60                </Button>
 61                <Button variant="secondary" onClick={returnToIssue}>
 62                  Cancel
 63                </Button>
 64              </div>
 65            </>
 66          )}
 67        </div>
 68      </details>
 69    );
 70  }
```

### components/staff/VisitSlip.tsx

```tsx
  1  "use client";
  2  
  3  // The desk slip: QR code carrying the token, the short code, and the full link written out
  4  // for patients whose camera can't scan (SPEC /patient).
  5  
  6  import { QRCodeSVG } from "qrcode.react";
  7  import { groupToken } from "@/lib/codes";
  8  import { slipOrigin } from "@/lib/slipOrigin";
  9  import { patientLink } from "@/data/savedToken";
 10  import { Button } from "@/components/Button";
 11  import { textFor } from "@/lib/text";
 12  
 13  type Props = { code: string; token: string; language: string; onClose: () => void };
 14  
 15  export function VisitSlip({ code, token, language, onClose }: Props) {
 16    // Always the live link, except on localhost while testing (lib/slipOrigin.ts).
 17    const origin = slipOrigin(typeof window === "undefined" ? "" : window.location.origin);
 18    const scanLink = patientLink(origin, token, language);
 19    const typedLink = patientLink(origin, groupToken(token));
 20  
 21    return (
 22      <section
 23        aria-labelledby="slip-heading"
 24        className="rounded-xl border-2 border-slate-800 bg-white p-4"
 25      >
 26        <h3 id="slip-heading" className="text-lg font-bold">
 27          Patient slip for visit {code}
 28        </h3>
 29        <div className="mt-3 flex flex-wrap items-start gap-4">
 30          <QRCodeSVG
 31            value={scanLink}
 32            size={176}
 33            marginSize={2}
 34            role="img"
 35            aria-label={`QR code that opens visit ${code} on the patient's phone`}
 36          />
 37          <div className="min-w-0 flex-1 space-y-2">
 38            <p>
 39              {textFor("en").visitCode}: <strong className="font-mono text-2xl tracking-widest">{code}</strong>
 40            </p>
 41            <p className="text-sm">{textFor("en").slip.typeLink}</p>
 42            <p className="font-mono text-sm break-all" data-testid="slip-link">
 43              {typedLink}
 44            </p>
 45            <a
 46              href={scanLink}
 47              target="_blank"
 48              rel="noopener"
 49              className="inline-block text-brand underline underline-offset-2 focus-visible:outline-4 focus-visible:outline-slate-950"
 50            >
 51              Demo: open the patient screen in a new tab
 52            </a>
 53          </div>
 54        </div>
 55        <Button variant="secondary" className="mt-4" onClick={onClose}>
 56          Done, hide slip
 57        </Button>
 58      </section>
 59    );
 60  }
```

### lib/progressChanges.ts

```tsx
  1  // Finds call-back progress worth telling staff screen readers about: a patient's called
  2  // screen was shown, or a patient tapped "I'm on my way". Minute counters are never included.
  3  
  4  import type { Visit } from "./visit";
  5  
  6  /** Messages for visits that gained "Seen" or "On the way" between two readings of the list. */
  7  export function progressChanges(before: Visit[], after: Visit[]): string[] {
  8    const old = new Map(before.map((v) => [v.id, v]));
  9    const messages: string[] = [];
 10    for (const visit of after) {
 11      const was = old.get(visit.id);
 12      if (!was) continue;
 13      // Compare the event times, not the status, so an Undo that restores a status is not news.
 14      if (visit.status === "on_the_way" && visit.confirmed_at && !was.confirmed_at) {
 15        messages.push(`Visit ${visit.code}: patient is on the way.`);
 16      } else if (visit.seen_at && !was.seen_at && visit.status === "called") {
 17        messages.push(`Visit ${visit.code}: called screen was shown on the patient's phone.`);
 18      }
 19    }
 20    return messages;
 21  }
```

### app/staff/page.tsx

```tsx
  1  "use client";
  2  
  3  // The staff screen: check patients in (new at the desk, or expected from home), see who is
  4  // waiting off-site, and call them back.
  5  
  6  import { useEffect, useRef, useState } from "react";
  7  import { useSitePauses } from "@/data/sitePauses";
  8  import { reloadVisits } from "@/data/staffActions";
  9  import { useVisits } from "@/data/useVisits";
 10  import { homeCheckInProblem } from "@/lib/homeCheckIn";
 11  import { activeLine } from "@/lib/queue";
 12  import type { Site, Visit } from "@/lib/visit";
 13  import { CheckInPanel } from "@/components/staff/CheckInPanel";
 14  import { ExpectedArrivals } from "@/components/staff/ExpectedArrivals";
 15  import { PauseSwitch } from "@/components/staff/PauseSwitch";
 16  import { ProgressAnnouncer } from "@/components/staff/ProgressAnnouncer";
 17  import { RecallAllPanel } from "@/components/staff/RecallAllPanel";
 18  import { RecentlyClosed } from "@/components/staff/RecentlyClosed";
 19  import { SignOutButton } from "@/components/staff/SignOutButton";
 20  import { VisitRow } from "@/components/staff/VisitRow";
 21  import { VisitSlip } from "@/components/staff/VisitSlip";
 22  import { StaffShell } from "@/components/staff/StaffShell";
 23  import { Button } from "@/components/Button";
 24  import { useNow } from "@/components/useNow";
 25  
 26  export default function StaffPage() {
 27    const { visits, outOfDate } = useVisits();
 28    const now = useNow();
 29    const { pauses, failed: pauseReadFailed } = useSitePauses();
 30    const [site, setSite] = useState<Site>("A");
 31    const [slip, setSlip] = useState<Visit | null>(null);
 32    const [announcement, setAnnouncement] = useState("");
 33    const [homeVisit, setHomeVisit] = useState<Visit | null>(null);
 34  
 35    // Staff chose an expected arrival: hide any old slip and move focus to the check-in form.
 36    const chooseHomeVisit = (visit: Visit) => {
 37      setSlip(null);
 38      setHomeVisit(visit);
 39    };
 40    useEffect(() => {
 41      if (homeVisit) document.getElementById("checkin-heading")?.focus();
 42    }, [homeVisit]);
 43    const listHeading = useRef<HTMLHeadingElement>(null);
 44  
 45    // A patient just left the list: say so, and move keyboard focus from the vanished row
 46    // to the list heading, so it is never lost.
 47    const onLeftList = (message: string) => {
 48      setAnnouncement(message);
 49      listHeading.current?.focus();
 50    };
 51    // After a working Undo its row (and the focused button) vanishes, so focus moves to the
 52    // list heading too; after a failed one, focus stays on the Undo button so staff can try again.
 53    const onUndoResult = (message: string, undone: boolean) => {
 54      setAnnouncement(message);
 55      if (undone) listHeading.current?.focus();
 56    };
 57  
 58    const line = visits ? activeLine(visits, site) : [];
 59    const paused = pauses ? pauses[site] : null;
 60    // The chosen home visit may have been checked in on another screen, or expired, since staff opened it.
 61    const homeProblem =
 62      homeVisit && visits && now
 63        ? homeCheckInProblem(homeVisit, visits.find((v) => v.id === homeVisit.id) ?? null, now)
 64        : null;
 65    // Show a slip only for a visit that is waiting off-site; declined and not-eligible get none.
 66    const showSlip = (visit: Visit) => setSlip(visit.status === "waiting" || visit.called_at ? visit : null);
 67  
 68    return (
 69      <StaffShell>
 70      <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-6">
 71        <header className="glass-panel flex flex-wrap items-center justify-between gap-3">
 72          <h1 className="text-2xl font-bold">Staff: Virtual Waiting Room</h1>
 73          <label className="flex flex-wrap items-center gap-2">
 74            <span className="font-semibold">Site</span>
 75            <select
 76              value={site}
 77              onChange={(e) => {
 78                setSite(e.target.value as Site);
 79                setSlip(null);
 80                setHomeVisit(null);
 81              }}
 82              className="min-h-11 max-w-full rounded-lg border-2 border-control px-3"
 83            >
 84              <option value="A">Demo Site A</option>
 85              <option value="B">Demo Site B</option>
 86            </select>
 87          </label>
 88          <SignOutButton />
 89        </header>
 90        {outOfDate && (
 91          <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-red-800 bg-white p-3">
 92            <p className="font-semibold text-red-900">
 93              {visits
 94                ? "This list may be out of date: the visits could not be read just now. Check your connection."
 95                : "The visits could not be loaded. Check your connection, or sign out and sign in again."}
 96            </p>
 97            <Button variant="secondary" onClick={() => void reloadVisits()}>
 98              Try again
 99            </Button>
100          </div>
101        )}
102  
103        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
104          <div className="space-y-4">
105            {visits && now && (
106              <ExpectedArrivals visits={visits} site={site} now={now} onChoose={chooseHomeVisit} />
107            )}
108            <CheckInPanel
109              key={site}
110              site={site}
111              onAttempt={() => setSlip(null)}
112              onCreated={showSlip}
113              homeVisit={homeVisit}
114              homeProblem={homeProblem}
115              offsitePaused={paused}
116              pauseReadFailed={pauseReadFailed}
117              onHomeDone={() => setHomeVisit(null)}
118            />
119            {slip && <VisitSlip code={slip.code} token={slip.access_token} language={slip.language} onClose={() => setSlip(null)} />}
120          </div>
121  
122          <section aria-labelledby="list-heading" className="glass-panel space-y-3">
123            <h2 id="list-heading" ref={listHeading} tabIndex={-1} className="text-xl font-bold">
124              Off-site: waiting or called back ({line.length})
125            </h2>
126            <p role="status" className="min-h-6 font-semibold">
127              {announcement}
128            </p>
129            <PauseSwitch key={`pause-${site}`} site={site} paused={paused} offSiteCount={visits ? line.length : null} onResult={setAnnouncement} />
130            {visits && <RecallAllPanel key={`recall-${site}`} visits={visits} site={site} onResult={(message, closed) => (closed ? onLeftList(message) : setAnnouncement(message))} />}
131            {visits === null || now === null ? (
132              <p>{outOfDate ? "No list to show yet." : "Loading…"}</p>
133            ) : line.length === 0 ? (
134              <p>No one is waiting off-site at this site.</p>
135            ) : (
136              <ol className="space-y-3">
137                {line.map((visit) => (
138                  <VisitRow
139                    key={visit.id}
140                    visit={visit}
141                    now={now}
142                    onShowSlip={setSlip}
143                    onLeftList={onLeftList}
144                  />
145                ))}
146              </ol>
147            )}
148            {visits && <RecentlyClosed key={`closed-${site}`} visits={visits} site={site} onUndoResult={onUndoResult} onReopened={chooseHomeVisit} />}
149            {visits && <ProgressAnnouncer visits={visits} site={site} />}
150          </section>
151        </div>
152      </main>
153      </StaffShell>
154    );
155  }
```

## Small fixes to review

Two fixes, each with a test commit first and then a fix commit. The changed lines call only React (`useState`, `useEffect`), `window.setTimeout` and `window.clearTimeout`, and the text from `en.ts`. No other project helper is called by the changed lines. The full `StillHerePrompt.tsx` is in the Material above.

Line counts after the fixes: `components/patient/StillHerePrompt.tsx` 124, `components/patient/StillHerePrompt.click.test.tsx` 135, `components/LanguageSwitch.tsx` 48, `components/LanguageSwitch.test.tsx` 63.

Checked after both fixes (2026-11-18): `npm test` 63 files, 356 tests passed; `npm run lint` 0 errors, 2 warnings (`.playwright-mcp` helpers); `npm run build` passed. Each new test failed before its fix. Not checked: VoiceOver or TalkBack on a real phone.

Fix A, the thank-you card. Before: the visible card had `aria-hidden="true"`, so a screen reader user who touched it heard nothing. After: the card has no `aria-hidden`; the `sr-only` status box has `aria-atomic="true"` and empties 3 seconds after the thank-you comes in, so a swipe reads the words only once, on the card.

Fix B, the draft notice. Before: `text-sm` on the notice that tells a patient the text is a draft. After: `text-base`, the size of the other patient text.

### Commit fb97c67: Test: the thank-you card can be touched by a screen reader, and the hidden box empties after a few seconds

```diff
diff --git a/components/patient/StillHerePrompt.click.test.tsx b/components/patient/StillHerePrompt.click.test.tsx
index cb974aa..e044296 100644
--- a/components/patient/StillHerePrompt.click.test.tsx
+++ b/components/patient/StillHerePrompt.click.test.tsx
@@ -95,16 +95,36 @@ describe("StillHerePrompt tap", () => {
     expect(statusBox()?.className.split(" ")).toContain("sr-only");
   });
 
-  it("keeps the status box hidden after the tap and shows the thank-you in a separate card", async () => {
+  it("keeps the status box hidden after the tap and shows the thank-you in a card screen readers can touch", async () => {
     show(due);
     await act(async () => button()?.click());
     show(tapped);
     expect(statusBox()?.className.split(" ")).toContain("sr-only");
     const card = container.querySelector('[data-testid="still-here-card"]');
-    expect(card?.getAttribute("aria-hidden")).toBe("true");
+    expect(card?.hasAttribute("aria-hidden")).toBe(false);
     expect(card?.textContent).toContain(s.thanks);
   });
 
+  it("makes screen readers read the thank-you box as one whole message", () => {
+    show(due);
+    expect(statusBox()?.getAttribute("aria-atomic")).toBe("true");
+  });
+
+  it("empties the hidden thank-you box after a few seconds, so a swipe reads the words only on the card", async () => {
+    vi.useFakeTimers();
+    try {
+      show(due);
+      await act(async () => button()?.click());
+      show(tapped);
+      expect(statusBox()?.textContent).toContain(s.thanks);
+      act(() => vi.advanceTimersByTime(5_000));
+      expect(statusBox()?.textContent).toBe("");
+      expect(container.querySelector('[data-testid="still-here-card"]')?.textContent).toContain(s.thanks);
+    } finally {
+      vi.useRealTimers();
+    }
+  });
+
   it("leaves focus on the page after a phone tap that did not focus the button", async () => {
     show(due);
     expect(document.activeElement).toBe(document.body);
```

### Commit 38ee12c: Fix: a screen reader can touch the thank-you card, and the hidden box empties after 3 seconds

```diff
diff --git a/components/patient/StillHerePrompt.tsx b/components/patient/StillHerePrompt.tsx
index 26b32b7..6c47dc9 100644
--- a/components/patient/StillHerePrompt.tsx
+++ b/components/patient/StillHerePrompt.tsx
@@ -15,6 +15,8 @@ import { useReportFocusOnLeave, useRescueFocus } from "./useFocusRescue";
 
 /** How long the thank-you stays after a tap. */
 const THANKS_MS = 5 * 60_000;
+/** How long the hidden box keeps the thank-you, so a screen reader has time to speak it. */
+const THANKS_SPOKEN_MS = 3_000;
 
 type Props = {
   view: PatientView;
@@ -50,6 +52,17 @@ export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
   const tapped = view.lastStillHereAt ? new Date(view.lastStillHereAt).getTime() : null;
   const thanking = !showing && now !== null && tapped !== null && now.getTime() - tapped < THANKS_MS;
 
+  // After a few seconds the hidden box goes empty, so a swipe reads the thank-you only on the card.
+  const [thanksSpoken, setThanksSpoken] = useState(false);
+  useEffect(() => {
+    if (!thanking) return;
+    const timer = window.setTimeout(() => setThanksSpoken(true), THANKS_SPOKEN_MS);
+    return () => {
+      window.clearTimeout(timer);
+      setThanksSpoken(false);
+    };
+  }, [thanking]);
+
   async function onTap() {
     if (sending) return;
     setSending(true);
@@ -80,12 +93,13 @@ export function StillHerePrompt({ view, token, language, lostFocus }: Props) {
         </PromptCard>
       )}
       {/* Always on the page and always hidden, so screen readers hear the thank-you when its text
-          comes in. The card below shows the same words on screen; screen readers skip it. */}
-      <p role="status" className="sr-only" data-testid="still-here-thanks">
-        {thanking ? `${t.stillHere.thanks} ${t.stillHere.meaning}` : ""}
+          comes in. It empties after a few seconds. The card below shows the same words on screen,
+          and a screen reader user can touch it to hear them again. */}
+      <p role="status" aria-atomic="true" className="sr-only" data-testid="still-here-thanks">
+        {thanking && !thanksSpoken ? `${t.stillHere.thanks} ${t.stillHere.meaning}` : ""}
       </p>
       {thanking && (
-        <p aria-hidden="true" className="clean-card font-semibold" data-testid="still-here-card">
+        <p className="clean-card font-semibold" data-testid="still-here-card">
           {t.stillHere.thanks} {t.stillHere.meaning}
         </p>
       )}
```

### Commit 458029a: Test: the draft notice uses normal-size text

```diff
diff --git a/components/LanguageSwitch.test.tsx b/components/LanguageSwitch.test.tsx
index 30b9d94..73d7fb8 100644
--- a/components/LanguageSwitch.test.tsx
+++ b/components/LanguageSwitch.test.tsx
@@ -46,6 +46,16 @@ describe("LanguageSwitch", () => {
     expect(optionText(html, "en")).toBe("English");
   });
 
+  it("shows the draft notice in normal-size text, not small text, so a patient can read it", () => {
+    for (const language of ["fr", "ur", "ar", "zh"]) {
+      const html = renderToStaticMarkup(<LanguageSwitch language={language} />);
+      const tag = html.match(/<p[^>]*data-testid="draft-notice"[^>]*>/)?.[0] ?? "";
+      const classes = (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ");
+      expect(classes).toContain("text-base");
+      expect(classes).not.toContain("text-sm");
+    }
+  });
+
   it("always shows the interpreter line", () => {
     const html = renderToStaticMarkup(<LanguageSwitch language="en" />);
     expect(html).toContain(textFor("en").language.interpreter);
```

### Commit c27ef36: Fix: the draft notice uses normal-size text on patient screens

```diff
diff --git a/components/LanguageSwitch.tsx b/components/LanguageSwitch.tsx
index da40db3..98860e4 100644
--- a/components/LanguageSwitch.tsx
+++ b/components/LanguageSwitch.tsx
@@ -37,7 +37,7 @@ export function LanguageSwitch({ language }: { language: string }) {
       {/* Always on the page, so a screen reader hears the notice when it appears after a language change. */}
       <div role="status">
         {!current.approved && (
-          <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-sm font-semibold text-amber-950" data-testid="draft-notice">
+          <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-base font-semibold text-amber-950" data-testid="draft-notice">
             {t.language.draftNotice}
           </p>
         )}
```

### components/LanguageSwitch.tsx (full file, after Fix B)

```tsx
  1  "use client";
  2  
  3  // The language menu on patient screens, with each language written in itself so a patient
  4  // can find their own. Each draft language has a tag in the menu, in its own words, and the
  5  // draft notice shows for any language a fluent speaker has not approved yet (SPEC). The
  6  // interpreter line is always shown. The choice is remembered on this phone (data/savedLanguage.ts).
  7  
  8  import { chooseLanguage } from "@/data/savedLanguage";
  9  import { textFor } from "@/lib/text";
 10  import { languageInfo, LANGUAGES, menuLabel, type LanguageInfo } from "@/lib/text/languages";
 11  
 12  /** The menu words for one language: its label, then " - draft" in that language if it is not approved. */
 13  function optionLabel(info: LanguageInfo): string {
 14    if (info.approved) return menuLabel(info);
 15    return `${menuLabel(info)} - ${textFor(info.code).language.draftTag}`;
 16  }
 17  
 18  export function LanguageSwitch({ language }: { language: string }) {
 19    const t = textFor(language);
 20    const current = languageInfo(language);
 21    return (
 22      <div className="space-y-2">
 23        <label className="flex flex-wrap items-center gap-3">
 24          <span className="font-semibold">{t.language.label}</span>
 25          <select
 26            value={current.code}
 27            onChange={(e) => chooseLanguage(e.target.value)}
 28            className="min-h-11 max-w-full rounded-lg border-2 border-control bg-card px-3"
 29          >
 30            {LANGUAGES.map((l) => (
 31              <option key={l.code} value={l.code} lang={l.code} dir={l.dir}>
 32                {optionLabel(l)}
 33              </option>
 34            ))}
 35          </select>
 36        </label>
 37        {/* Always on the page, so a screen reader hears the notice when it appears after a language change. */}
 38        <div role="status">
 39          {!current.approved && (
 40            <p className="rounded-lg border-2 border-amber-700 bg-amber-50 p-2 text-base font-semibold text-amber-950" data-testid="draft-notice">
 41              {t.language.draftNotice}
 42            </p>
 43          )}
 44        </div>
 45        <p className="text-base">{t.language.interpreter}</p>
 46      </div>
 47    );
 48  }
```

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted by the owner (bold marks removed).

### Problems found (worst first)

1. `components/patient/StillHerePrompt.tsx` line 90 (`lib/text/en.ts` `patient.notSaved`, line 101) - Area 4 (Inconsistent wording)

- What is wrong: When `"I'm still here"` fails to save, `StillHerePrompt.tsx` shows `t.patient.notSaved`, which says `"Your answer did not save. Staff do not know you are on your way. Please try again or go to the desk."` That message belongs to the `"I'm on my way"` button after a recall, not to a patient who is still waiting off-site.
- Who it hurts and how: It hurts patients (and creates unnecessary desk traffic for staff). A waiting patient who has not been called back is told staff do not know they are "on your way" and to go to the desk, which can make them think they were recalled or must return to the hospital right away.
- Fix: Add a `notSaved` key under `stillHere` in `lib/text/en.ts` (lines 148-153) and render `{t.stillHere.notSaved}` on line 90 of `components/patient/StillHerePrompt.tsx`: `notSaved: "Your tap did not save. Staff may not know you are still waiting. Please try again."`
- How sure: High.

2. `components/staff/VisitRow.tsx` lines 94-106 - Area 3 (Confusing staff workflow)

- What is wrong: `"Recall patient"` fires on a single tap with no confirmation step and no undo (`RecentlyClosed.tsx` only lists closed visits, and `RecallAllPanel.tsx` line 70 notes recalled patients stay recalled), while sitting right next to `"Mark arrived"` and `"Show QR again"`. Every other irreversible or high-impact staff action (`RecallAllPanel.tsx`, `NewLinkPanel.tsx`, `PauseSwitch.tsx`, and `"Confirm unable to reach"` in `FollowUpPanel.tsx`) requires a confirmation step.
- Who it hurts and how: It hurts patients and staff. One accidental tap meant for `"Mark arrived"` or `"Show QR again"` immediately sends `"Please head back now"` to the wrong patient's phone and starts the no-response escalation timers, with no way for staff to undo it.
- Fix: Add an inline two-step confirmation for `"Recall patient"` in `components/staff/VisitRow.tsx` (matching `NewLinkPanel.tsx` and `RecallAllPanel.tsx`). Prompt: `Recall visit {visit.code}? The patient's phone will show "Please head back now". There is no undo.` Buttons: `"Yes, recall patient"` and `"Cancel"`.
- How sure: High.

3. `components/patient/VisitScreen.tsx` lines 63-72 (`lib/text/en.ts` `patient.replacedLinkText`, line 81) - Area 2 (Unclear or dead-end screen)

- What is wrong: When `linkReplaced` is true (`screen === "none"`), `VisitScreen.tsx` line 70 still renders `p.findVisitHelp`, telling the patient to scan the QR code or type the link on their old slip even though that slip just stopped working. In addition, none of the three `screen === "none"` states (`noVisitHeading`, `brokenLinkHeading`, `replacedLinkHeading`) has a link back to `/` (the start page), unlike `Expired` in `PatientStatus.tsx` line 141.
- Who it hurts and how: It hurts patients. A patient whose link was replaced or ended is told to reuse an invalid slip, and a patient who opens `/patient` with no active visit (or after 24-hour deletion) has no link back to `/` to start a new visit or check care options.
- Fix: In `components/patient/VisitScreen.tsx` lines 63-72, show `p.findVisitHelp` only when `!linkReplaced`, and add a link to `/` (`p.expiredNewVisit`) inside `screen === "none"`. In `lib/text/en.ts` line 81, change `patient.replacedLinkText` to: `"This link was replaced or is no longer active. Please ask the emergency department desk for help."`
- How sure: High.

### Check by review area

1. Labels that do not match between patient and staff screens: No problem found.
2. Statuses or states with no clear screen, or a screen the patient cannot leave or understand: See problem 3 above. All ten visit statuses in `SPEC.md` line 119 map to clear screens in `PatientStatus.tsx`.
3. Confusing workflow steps for staff: See problem 2 above.
4. Inconsistent wording: See problem 1 above.
5. Breaks of the SPEC hard rules: No problem found.
6. Bugs in the two small fixes (thank-you card and draft notice): No problem found.

## Claude's check

- 1, the wrong not-saved message on "I'm still here": true. `StillHerePrompt.tsx` line 90 shows `t.patient.notSaved` (`en.ts` line 101), which says "Staff do not know you are on your way. Please try again or go to the desk." A patient who is still `waiting` reads that they must go to the desk. Gemini's words fit: "Your tap did not save. Staff may not know you are still waiting. Please try again." The fix needs a new key `stillHere.notSaved` in `en.ts` and in the 4 draft files, so it touches 2 folders (plan mode). The 4 drafts need a translation step.
- 2, "Recall patient" has no confirm step and no undo: true. `VisitRow.tsx` line 96 calls `callBackVisit` on one tap. `lib/allowedSteps.ts` line 16 lets `called` go to `on_the_way`, `arrived`, `removed` or `unable_to_reach`, never back to `waiting`, and the database trigger uses the same list. A wrong tap sends "Please head back now" to the phone and starts the 10, 20 and 30 minute follow-up steps. "Mark arrived", "Left" and "No-show" have one tap, but each has Undo under "Recently closed", so they are not the same case. The SPEC (line 78) does not ask for a confirm step on this button, so this is a product decision.
- 3a, the find-your-visit help on the replaced-link screen: true. `VisitScreen.tsx` line 70 shows `findVisitHelp` ("Scan the QR code on your slip...") also when `linkReplaced` is true, but the old slip no longer works. Show it only when `!linkReplaced`. Gemini's new `replacedLinkText` is not needed: the present text "Please ask the emergency department desk for help." is correct, and Gemini's first sentence repeats the heading.
- 3b, no link to the start page on the 3 "none" screens: true. Only the expired screen (`PatientStatus.tsx` line 141) links to `/`. A patient with no visit or with a broken link has no way to the start page and its other care options. On the replaced-link screen a new visit could make a second visit for the same person, so a link there is less useful. Product decision.
- 6, the two small fixes: Gemini found no problem.
- Areas 1 and 5: Gemini found no problem. Not checked by me beyond Gemini's answer.
