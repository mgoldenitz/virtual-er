# WaitWell: A virtual ER waiting room (concept prototype spec)

Read this whole file before writing code. Build one phase at a time and stop at the end of each phase so I can test it. I am new to coding: explain each new file in one plain sentence, and tell me exactly what to click or type when I have to do something myself. Never ask me to paste API keys or passwords into chat; tell me which file or settings page they go in.

## What this is

A demo web app showing how a hospital emergency department could let low-acuity patients (CTAS level 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when called.

It is a concept prototype. It is not affiliated with any hospital, uses only invented (synthetic) patients, and connects to no hospital system. Every page shows this footer:

"Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only."

App name: WaitWell. The main header uses the full name, "WaitWell: A virtual ER waiting room". Subheaders and other places use "WaitWell". (Owner, 2026-11-22.)

## Stack

- Next.js (App Router) with TypeScript and Tailwind CSS
- Supabase for the database, realtime updates and staff login. Project region: Canada (Central), ca-central-1
- Hosting on Vercel, code on GitHub
- No native mobile app. Everything runs in a phone or laptop browser.

## Tools for the agent

- Use context7 for current Next.js, Tailwind and Supabase documentation before writing code that depends on a library version.
  - Next.js: read the local docs in node_modules/next/dist/docs/ first (AGENTS.md), because they match the installed version; use context7 for Tailwind and Supabase (owner, 2026-11-13).
- Supabase MCP: use it to create tables, row-level security policies and to read logs, but show me the SQL and wait for my approval before running anything that changes or deletes data. It must be scoped to this project (project_ref). After Phase 2 it runs read_only.
- Vercel MCP: use it to read build logs and check deployments. Ask before changing any project setting.
- Playwright MCP: after each phase, open the app at phone size (390 x 844) and at laptop size, run the test checklist, and show me screenshots of anything that fails.
- Run /security-review at the end of Phases 2 and 3, and /code-review before the final version.
- Keep a short progress log so a new session can continue where the last one stopped.
- Never ask me to paste keys, tokens or passwords into chat. Tell me which file or dashboard page they go in.

## Hard rules

1. Store no real personal or health information. A visit has two identifiers. The display code is 6 characters (letters and digits, no look-alike characters such as O/0 or I/1) so people can read it aloud or type it at the desk. The access token is long and random (at least 128 bits, for example 22 or more random URL-safe characters); the QR code and the link saved on the phone carry the token, and only the token opens a visit on a patient's phone. Only logged-in staff can look up a visit by its short code. Patients open a visit only with the token: the link saved on their phone or the QR code on a desk slip. No names, health card numbers, phone numbers or symptoms are stored. The Pushover recall alert goes through the Pushover server, so it carries only the display code and the site: never the token, a link, the language or the CTAS level.
2. The app never makes clinical decisions. Staff choose the CTAS level and confirm eligibility. No symptom checker, no AI triage.
3. Every patient screen, in every state and every language, shows: "If your symptoms get worse, call 911 or come back to the emergency department now."
4. Visits older than 24 hours are deleted automatically. Just before a visit is deleted, add its contribution to a daily_stats table, counting each number on the date of its own event (survey responses count on the closed_at date). No survey can arrive after deletion, so no day ever needs reprocessing; do not use a once-a-night summary job. The dashboard shows a day as its daily_stats totals plus the visits still in the visits table. daily_stats holds only totals (no codes, tokens or single-visit times).
5. A patient's token can read only its own visit, through one database function that returns only the fields a patient may see. Patients can do exactly five things, each through its own narrow function or server route: start a visit from home (a rate-limited server route that itself sets source = home and status = pre_arrival; the browser never sets them, it is refused while off-site waiting is paused, and this never grants a place in line), record that the called screen was shown (sets seen_at once, only while called), confirm "I'm on my way" (only while called), tap "I'm still here" (only while waiting), and submit the survey score once (only after the visit is closed, and only if the visit waited off-site and arrived). Everything else, including the queue, is staff only (Supabase row-level security). Patient pages learn about changes from a signal that holds no visit data (for example a one-row table touched on every change) and then re-read through the function, so they never subscribe to visit rows.
6. No hospital logos or official branding.
7. Joining from home never holds a place in the doctor's line. A patient's place in line starts when a nurse triages them at the hospital, because urgent patients are always seen first.
8. Do not copy or display THP's wait-time numbers. Link to THP's dashboard on THP's own site (https://www.thp.ca/emergency/A/visit.html; the trilliumhealthpartners.ca address no longer works, per the owner on 2026-11-10). THP's terms prohibit reuse of its site material without written permission. All wait estimates inside the app are simulated.
9. Accessibility target: WCAG 2.2 AA (Ontario's legal minimum for public websites is WCAG 2.0 AA; 2.2 AA is the stronger design target). That means keyboard access, visible focus, labelled controls, touch targets of at least 24 by 24 CSS pixels, enough colour contrast, a layout that still works when the user enlarges text to 200% in the browser or phone settings, and pages that reflow on a small phone without sideways scrolling. Never rely on sound or colour alone: every alert and status also appears as words on screen.

## Screens

### / start page (patient's own phone, at home or in the waiting room, no login)

- Emergency check first: "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now."
- Other options before travelling: Health811 (call 811 for a free nurse line), the regional virtual urgent care program (https://www.regional-virtual-urgent-care.ca/), and THP's own alternatives listed on its emergency page: the Urgent Care Centre at Queensway Health Centre and the pharmacist assessment pilot at three Mississauga Shoppers Drug Mart locations. Link to THP's pages for both and copy nothing beyond their names and area (Etobicoke, Mississauga); hours change, so send patients to THP's page for them. Start page wording: "Urgent Care Centre at Queensway Health Centre in Etobicoke." and "A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so check that it is still running before you go.", then under the list: "For hours and addresses, see THP's emergency page." (linked).
- Link: "See current wait times on THP's website" (opens THP's page; nothing copied).
- "Start a visit" button: choose one of two demo sites ("Demo Site A", "Demo Site B") and a language. The app creates the visit code and a QR code and saves the code in the phone's browser storage, so the patient never types it and reopening the site brings the visit back.
- While staff have paused off-site waiting, "Start a visit" is replaced by: "Off-site waiting is paused right now. Please come to the emergency department and wait there."
- A visit started from home has status "Started from home, not yet triaged" (owner, 2026-11-10; was "Checked in from home") and shows: "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
- The footer disclaimer and the 911 line appear here too.

### /patient (phone, no login)

- Opens the visit saved on this phone automatically. For patients who did not start on their own phone, the triage desk prints a slip with a QR code (carrying the token), the short code, and the full link written out under the QR code with a label ("Or type this link into your phone's browser"), so a patient whose camera cannot scan still has a way in. The patient scans the QR code with the phone camera; if that fails, staff show the QR code again from /staff. Typing the short code on /patient does not open a visit.
- Shows: place in line, "Estimated time until you're called back" as a range counted from now (for example "40 minutes to 1 hour"), with a note that the estimate is simulated, and status: Waiting, Please head back now, Ready at the desk.
- Under the place in line, always show: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first."
- "I'm on my way" button after the patient is called.
- Every 30 minutes while waiting off-site, an "I'm still here" button appears. A missed tap (no tap within 10 minutes of the prompt) flags the patient on the staff screen. "I'm still here" only tells staff the patient is still following the visit; it is not a clinical reassessment, and neither the patient screen nor the staff screen may describe it as one. If symptoms change, the 911 line applies.
- The first time the called screen is shown, the page records seen_at. This means the screen was displayed in an open browser, not that the patient read it or is coming; staff still wait for "I'm on my way" and arrival. Sent, seen, on my way and arrived are tracked separately.
- While called but unconfirmed, the screen alerts with sound and vibration where the phone allows. These are on-screen demo alerts: they work only while the page is open and the phone is unlocked, and the demo must say so. Do not claim the app can wake a locked phone. A hospital version would use text messages or push notifications (iPhones allow web push only for sites added to the home screen). The demo has one extra alert that can reach a locked phone: a Pushover message to the owner's own phone when staff recall a real visit (see the Phase 4 line near the end). After the 20-minute step it shows: "Please return now. Staff will review your visit if you do not respond."
- Language switch: English, French, Urdu, Arabic and Mandarin (Simplified Chinese) (owner, 2026-11-10). Urdu and Arabic are right-to-left, so their screens flip. All text comes from one translation file so it can be checked by a fluent speaker.
- Text size control. Works on a small phone. Screen-reader labels on all controls.
- Screen readers announce meaningful status changes (for example "You have been called back") through a polite live region, or an assertive one for the call-back. The wait range and any countdown are not announced on every update.
- After the visit is closed, only for patients who waited off-site and arrived: one survey question, "How would you rate your waiting experience?" on a 0 to 10 scale.
- Updates live without refreshing.

### /staff (tablet or laptop, staff login required)

- Check in a patient after triage and registration (THP's emergency page lists triage first, then registration, where the patient gets an ID band): scan the QR code on the patient's phone (use the device camera) or type the short code (short-code lookup is staff-only). For a patient who did not start a visit, create a new code and show it with a QR code. Then choose CTAS 4 or 5, tick the eligibility checklist (has a smartphone with internet, can return within 20 minutes, agrees to wait off-site), and choose language.
- "Expected arrivals" list: visits started from home that have not reached triage yet. These are not in the waiting line. Remove them automatically after 6 hours if they never arrive.
- Patient declines or is not eligible: record "offered, declined" or "not eligible" with no other details (for the dashboard), and the patient waits on-site as usual.
  - (owner, 2026-11-19) A patient recorded as "offered, declined" who changes their mind within 6 hours can be switched to off-site waiting from the staff list "Waiting on-site: offered, declined". Staff tick the eligibility checklist again and check the language; the visit reopens (status waiting, closed_at cleared), keeps its place in line from the original triage time (the row shows the place it would get), and staff give the patient the slip. Not while off-site waiting is paused. Until the recall, staff can Undo a switch made by mistake (back to declined). The staff row says "switched to off-site N min ago" until the patient taps "I'm still here". On the dashboard it then counts as offered, not as declined. "Not eligible" visits cannot switch. The database holds the same rules (6 hours, closed_at, Undo only before the recall).
- List of patients waiting off-site with minutes waited, sorted by arrival.
- "Recall patient" button per patient (owner, 2026-11-11; was "Call back", renamed so it is not confused with the simulated phone calls); shows "Seen" when seen_at is set and "On the way" when the patient confirms.
- "Pause off-site waiting" switch per site, for downtime or a contact problem, with a confirmation step. While paused: no new off-site sign-ups (the start-from-home route refuses, and check-in offers on-site waiting only), visits already waiting off-site keep working, and the staff list shows a banner asking staff to check every outstanding call-back and offer on-site waiting. Turning it off needs a second confirmation.
- Confirmed but not arrived: a set time after confirmed_at (a setting, default 30 minutes), flag "On the way, not arrived". Never remove the visit automatically. This is a demo setting, not a clinically validated deadline.
- No-response follow-up after "Recall patient" (all times are settings so I can shorten them for testing; they are placeholders, and a hospital's clinical lead would set the real ones):
  - 0 minutes: patient screen alert (plus optional text in the Twilio add-on).
  - 10 minutes, no confirmation: second alert on the patient screen; flag on the staff screen: "No reply 10 min after call-back. Phone the patient now." (owner, 2026-11-11; was "Phone this patient.") The demo stores no phone numbers, so phone calls are simulated: staff record each attempt with a button ("Phoned, answered" or "Phoned, no answer"). A hospital version would take the number from its registration system. "Phoned, answered" saves last_phone_result, clears the phone flag and pauses escalation until followup_paused_until (a setting, default 10 minutes). After the pause, the ladder continues from the time elapsed since called_at; it does not restart. A visit with an answered call that still does not arrive is flagged "Answered the phone, but hasn't arrived or tapped "I'm on my way" yet." (owner, 2026-11-11; was "Contacted, not yet arrived"), never "Review: unable to reach".
  - 20 minutes: flag: "Still no reply 20 min after call-back. Phone the patient again." (owner, 2026-11-11; was "Phone a second time"); the patient screen shows the "Please return now" message.
  - 30 minutes, with no answered call: the visit is flagged "Review: unable to reach" and stays in the line until a nurse confirms. On confirmation the status becomes unable_to_reach and the visit leaves the active line. The app does not record this as left without being seen; staff follow hospital policy outside the app.
  - If an unable_to_reach patient arrives later, staff can reopen the visit, which clears closed_at and sends it back to triage for reassessment (status: needs_reassessment).
- The app never contacts anyone other than the patient. No emergency contacts are stored.
- "Issue a new link" (owner, 2026-11-14), for a lost or stolen phone, while waiting, called or on the way: gives the visit a new link and QR code; the old link and slip stop working at once. The visit code stays the same.
- Mark arrived, mark removed (left, no-show). Actions that end virtual waiting (arrived, removed, unable_to_reach confirmed, declined, not_eligible) set closed_at in the same update. Closed means virtual waiting ended, not that care is finished.
- "Call everyone back" button for a surge or a system problem, with a confirmation step.
  - (owner, 2026-11-12: the button is "Recall all off-site patients"; see components/staff/RecallAllPanel.tsx.)

### /dashboard (staff login required)

A "Show" switch with two buttons, Real (first, and on when the page opens; not saved) and Demo. Real and demo visits are never mixed; daily_stats keeps them apart through its is_demo key. Demo Site A and Demo Site B are two columns; on a phone they stack.

"Now" (the visits in the table at this moment):

- Waiting off-site: status waiting.
- Recalled, not yet arrived: status called or on_the_way.
- Back for reassessment: status needs_reassessment.

"Today (since midnight, Toronto time)". Each number counts a visit on the America/Toronto date of its own event, and adds the daily_stats row for (today, site, is_demo) (hard rule 4):

- Offered off-site waiting: "8 of 10 triaged (80%)". Top: offered_at today. Bottom: CTAS 4 or 5 with triaged_at today. Triage and offer are saved in the same step, so the share cannot go over 100%.
- Accepted: "6 of 8 offered (75%)". Accepted is offered minus declined.
- Declined: status declined, on offered_at.
- Average minutes from recall to arrival: "14 (5 visits)". arrived_at minus called_at, over visits with status arrived and called_at set, on arrived_at. A desk arrival with no called_at stays out.
- No-shows (status removed, removed_reason no_show), Unable to reach (nurse confirmed) (status unable_to_reach), Left (status removed, removed_reason left): on closed_at.
- Started from home: source home, on created_at. Reached triage: those of them with triaged_at set.
- Survey responses, Average score (0 to 10), Scored 9 or 10: visits with a survey_score, on closed_at.
- Recalled: called_at and offered_at set, on called_at. A visit is called only once. All recalled visits count, also when they later became needs_reassessment, no_show or unable_to_reach.
- Average minutes from offer to recall: "52 (7 visits)". called_at minus offered_at, over the Recalled visits, on called_at. It starts at offered_at, because a declined-to-waiting switch moves offered_at to the switch time. Patients still waiting are not in it.
- Wait bands: the same visits, by whole minutes rounded like the average: "Under 30 minutes", "30 to 59 minutes", "60 to 119 minutes", "120 minutes or more".

Percentages and minutes round to whole numbers; the average score rounds to one decimal place. A share or average whose bottom number is 0 shows "-" on screen, with the screen-reader text "no data yet". (Owner, 2026-11-18, the Gemini metric review and the dashboard plan: replaces the earlier list, whose offered percentage was always 100%.)

"Past 7 days": the 7 dates before today, each counted by the same rules as "Today". A share shows its count ("8 of 10 (80%)"), and an average shows its count in brackets. The wait numbers start on the date their migration runs. A day before that date shows "-" with the note "Wait numbers start on <date>." A funnel of today's counts (Started from home, Started from home today and reached triage (owner, 2026-11-21), Triaged CTAS 4 or 5, Offered, Accepted, Recalled, Arrived after recall, Answered survey) shows counts only, with the line "Each row counts what happened today. Desk patients join at Triaged, and some patients come back before a recall, so a lower row can be larger." Staff can download the past 7 days as CSV, for the mode on screen. The CSV has the same numbers plus the raw counts, has empty cells before the start date, and does not include today, codes, tokens or visit times. (Owner, 2026-11-20, the Gemini review of the analysis definitions.)

### Demo mode (staff only)

A scheduled simulator plays the staff and patient sides at Demo Site A and B, so the screens look like a normal evening. It makes only moves the app allows, and it reads or changes only visits with is_demo = true. It aims for about 9 demo visits waiting off-site per site and call-backs about 15 minutes apart. Once a day, an AI model sets the simulator's chances (tap rates, how often a recall comes early, the language mix) within fixed limits; it never sets a CTAS level or a time limit, and never sees a visit. Demo visits show a "Demo" tag on the staff screen. A staff action "Clear demo data" switches the simulator off and deletes all demo visits and demo rows in daily_stats; it must run before real testers start. (Owner, 2026-11-18: replaces the one-button demo mode, because the database sets every time to now(), so a button cannot make visits spread over the last few hours.)

## Data (one main table)

visits: id, code (6-character display code), access_token (long random token), site (A or B), source (home or desk), ctas_level (4 or 5, empty until triage), language, status (pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed, declined, not_eligible), removed_reason (left or no_show, only when removed), created_at, triaged_at, offered_at (when staff offered off-site waiting), last_still_here_at, called_at, seen_at (first time the called screen was shown), confirmed_at, review_flagged_at, arrived_at, closed_at, phone_attempts (count of simulated calls), last_phone_result (answered or no_answer), followup_paused_until, survey_score (0 to 10, optional), is_demo.

site_settings: site, offsite_paused (true or false), paused_at. Staff only.

daily_stats: key (day, site, is_demo), and one total per dashboard number. No codes, tokens or single-visit times.

Place in line is ordered by triaged_at, never by created_at.

Add other fields only if a phase needs them, and tell me why.

## Phases

1. Clickable prototype with in-browser fake data, no Supabase: start page, /patient, /staff, /dashboard. Build the core loop first: staff check in a desk visit, the patient screen shows it, staff press Call back, the patient taps "I'm on my way", staff mark arrived. Add starting a visit from home on the start page only after that loop works. Done when I can run the core loop across two tabs, then start a visit on the start page, check it in on /staff, and watch it change on /patient.
2. Supabase: table, realtime, staff login, row-level security. Then deploy to Vercel. Done when my laptop (staff) and my phone (patient) update each other within about 2 seconds on the vercel.app link.
3. Safety and equity: 911 line, start-page emergency check, no-response follow-up steps, "I'm still here" prompt, call-everyone-back, the pause off-site waiting switch, languages, text size, screen-reader labels and live regions, a WCAG 2.2 AA check (hard rule 9), footer, 24-hour deletion.
4. Dashboard, survey and demo mode.
5. Testing with real people and a README explaining how to run the project.

Phase 4 (owner, 2026-11-19, replaces the Twilio trial): when staff recall a real visit (not `is_demo`), the server sends one Pushover message to the owner's own phone only, never to patients (Pushover replaced ntfy on 2026-11-19). The two settings `PUSHOVER_APP_TOKEN` and `PUSHOVER_USER_KEY` are in .env.local and the Vercel settings; with one of them missing, nothing is sent.
