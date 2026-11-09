# Virtual ER Waiting Room: briefing for a second opinion

Prepared 2026-11-09, revised the same day after a review by another model (changes listed under "Revisions" in Part 2). Paste this whole file into another AI model, then ask the questions in the last section (or your own).

## How to read this

I am Michael, a business student with no software engineering experience. I am building a demo web app for a project management course (MGMT 51463, Project and Performance Management, Fall 2026), using AI coding agents ("vibe coding"). I am not a Trillium Health Partners (THP) employee and have no access to hospital systems. Please explain technical terms plainly, flag anything in this plan that looks wrong or risky, and say when you are unsure instead of guessing.

The file has three parts: the project concept (the business case the app comes from), the app plan, and research already done. The full agent spec (SPEC.md) is at the end, unchanged.

## Part 1: the project concept

Trillium Health Partners runs the emergency departments at Credit Valley Hospital and Mississauga Hospital in Mississauga, Ontario. THP already publishes real-time and predicted ER wait times online before patients arrive. Once registered, though, low-acuity patients (Canadian Triage and Acuity Scale, CTAS, levels 4 and 5, such as a sprain, minor cut or ear infection) still wait in person in a crowded waiting room, sometimes for hours. That causes crowding, infection exposure, and patients leaving without being seen.

The concept: a virtual ER waiting room where eligible low-acuity patients, after triage, wait off-site, follow their place in line on their phone, and get an alert when it is time to come back.

The course version is a project charter for a hospital rollout: about $750,000 CAD (range $700,000 to $800,000, including a $50,000 contingency reserve and a $50,000 management reserve), 10 months (about 43 weeks), at both sites. Phases: months 1 to 2 initiation, requirements and vendor selection; months 3 to 5 integration, configuration, privacy review and testing; month 6 pilot at one site; months 7 to 8 rollout and staff training; months 9 to 10 evaluation, surveys and closure.

Charter objectives:
1. Offer the virtual waiting option to 100% of registered low-acuity ER patients at both sites by month 8.
2. Reduce the average number of CTAS 4 to 5 patients physically in the waiting room by 30% against the pre-launch baseline by month 9.
3. Reach 80% patient satisfaction with the virtual waiting experience (post-visit survey) by month 10.
4. No increase in the left-without-being-seen rate and zero adverse events caused by waiting off-site, checked monthly from launch.
5. Finish on schedule and within $750,000, with CPI and SPI of at least 0.95.

Charter constraints: 10-month time limit; budget ceiling; only CTAS 4 to 5 patients at the two sites (CTAS 1 to 3 stay on-site); Ontario's Personal Health Information Protection Act (PHIPA), with minimal patient information in texts and online queues; no disruption to 24/7 ER operations.

Charter assumptions: leadership and ER clinical leads support the new workflow; THP's registration and triage systems can share real-time queue data; most low-acuity patients have a phone that can receive texts or calls (others wait on-site as usual); low-acuity volumes stay near the baseline year; IT, clinical and vendor staff are available as scheduled.

Budget lines (CAD): virtual queue platform and licensing 160,000; system integration 130,000; project management 70,000; configuration and development 60,000; workflow redesign and staff training 50,000; privacy and security (Privacy Impact Assessment, PHIPA review, security testing) 45,000; business analysis and requirements 40,000; testing and QA 35,000; pilot and evaluation 35,000; patient communications (signage, multilingual instructions) 25,000; contingency reserve 50,000; management reserve 50,000.

Strategic fit, from THP's "A New Kind of Health Care for a Healthier Community: Plan to 2030" (October 2025). The app supports four of the five quality goals: Patient and Caregiver Experience (THP target: patient experience above 9 out of 10; the app's waiting-experience survey uses the same 0 to 10 scale, but it is not THP's organization-wide measure), Health Equity (the booklet reports over 130 languages spoken, 52% of residents born outside Canada, and 14 of 40 Peel neighbourhoods in the lowest socioeconomic group; the app's language switch, large text and plain wording support equity; they do not by themselves show reduced inequity), Team Experience (THP target: engagement above 80%; one-button call-back and flags for unconfirmed patients, with less staff work as a hypothesis to test, since the Geneva study in Part 3 found staff reported extra work), and Value (top-quartile cost efficiency; a software project instead of a physical ER expansion, with savings to be tested). It does not claim the fifth goal, Population Health (measured as reduced hospitalization). It supports two strategic priorities: Deliver the highest quality care (Digitally Enabled Care, People-Centred Care) and Partner for a seamless health system (Digitally-Connected Seamless Care). The booklet's commitment to "responsible, ethical, and people-centered AI" fits the app's rule of no AI in clinical decisions.

## Part 2: the app plan

What I am building is a concept prototype that demonstrates the workflow: a website that opens on any phone, with a staff screen where a triage nurse checks in a CTAS 4 or 5 patient and later calls them back, and a patient screen that shows their place in line and tells them when to return. It uses only invented patients, connects to no hospital system, and has no THP branding. Every page has the footer "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only."

What changes because I do not work at THP:
1. No hospital system connection. A staff screen stands in for registration and triage.
2. No real patients or health information. Each visit has a 6-character display code and a long random access token, never a name, health card number or symptom.
3. PHIPA is a design standard, not a compliance claim (the demo holds no real health information): collect the minimum, delete visits after 24 hours, and lock each code to its own record.
4. No THP name or logo on the product. The app gets its own neutral name (not chosen yet).
5. No real wait-time feed. THP's dashboard shows no API or open data, and THP's terms forbid reuse of site material without written permission, so the app links to THP's page (https://trilliumhealthpartners.ca/emergency/a/visit.html) and all waits inside the app are simulated.
6. No texts to the public, because of consent under Canada's anti-spam law (CASL) and cost. Alerts appear on the patient screen only while the page is open and the phone is unlocked, and are labelled as demo alerts. Optional: a Twilio trial that texts only my own verified number.
7. No clinical decisions. The nurse picks the CTAS level and ticks an eligibility checklist. No symptom checker, no AI triage.
8. A safety line on every patient screen, in every state and language: "If your symptoms get worse, call 911 or come back to the emergency department now."

Decisions already made (2026-11-09): patients can start a visit on their own phone, even from home (the code is saved in the phone's browser and the nurse scans it at triage), but joining from home never holds a place in line; place in line starts at triage, ordered by triage time. If a called patient does not respond, there is a no-response ladder with placeholder times a clinical lead would set: 0 minutes screen alert; 10 minutes second alert and a "phone this patient" flag (calls are simulated with "Phoned, answered" or "Phoned, no answer" buttons, because no phone numbers are stored); "Phoned, answered" pauses escalation for a set time and never leads to "unable to reach"; 20 minutes second call and "Please return now. Staff will review your visit if you do not respond."; 30 minutes with no answered call, a "Review: unable to reach" flag, and the visit leaves the line only when a nurse confirms (it is not recorded as left without being seen); if the patient arrives later, the visit goes back to triage for reassessment. The app never contacts anyone but the patient.

Stack: Next.js (App Router) with TypeScript and Tailwind CSS; Supabase for the database, realtime updates and staff login, hosted in Canada (Central), ca-central-1; Vercel for hosting; GitHub for the code. No native mobile app; everything runs in a browser. All four have free tiers.

Screens: a start page (emergency check first, links to Health811, the regional virtual urgent care program and THP's own alternatives (the Queensway Urgent Care Centre and the Shoppers Drug Mart pharmacist pilot), a link to THP's wait page, and "Start a visit"), /patient (place in line, simulated wait range, status, "I'm on my way", an "I'm still here" prompt every 30 minutes, language switch, text size, a 0 to 10 survey at the end), /staff (QR scan or typed code, CTAS 4 or 5, eligibility checklist, expected arrivals from home, off-site list, call back, the no-response flags, arrived/removed, "call everyone back" with confirmation), /dashboard (today's counts tied to the charter objectives), and a staff-only demo mode that creates 15 to 20 fake visits.

Data: one main table, visits, with a display code, access token, site (Demo Site A or B), source (home or desk), CTAS level, language, status (pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed, declined, not_eligible), removal reason, timestamps for each step (including offered_at and review_flagged_at), simulated phone attempts, survey score, and an is_demo flag; plus a daily_stats table of totals so the dashboard keeps history after 24-hour deletion. Security: the token reads only its own visit through one database function; patients can do only four things, each through a narrow function or server route (start a visit from home, "I'm on my way", "I'm still here", the survey); only staff can look up a visit by its short code; only logged-in staff see or change the queue. Each visit's totals are added to daily_stats just before it is deleted, so late surveys are never lost. Each dashboard number has a written definition in SPEC.md.

Build phases (estimated 35 to 55 hours over five weeks): Phase 0 setup (about 3 hours); Phase 1 clickable prototype with fake data in the browser, no database, building the core loop first (staff check-in, patient screen, call back, confirm, arrive) and the from-home start after it (8 to 12 hours; if it takes more than about 14 hours, deploy it as the final demo); Phase 2 Supabase, realtime, staff login, row-level security, deploy to Vercel (8 to 12 hours; done when laptop and phone update each other within about 2 seconds); Phase 3 safety and equity features (8 to 12 hours); Phase 4 dashboard, survey and demo mode (4 to 6 hours); Phase 5 testing with three to five real people and a README (5 to 8 hours).

AI tools: Claude Code (running Claude Opus 5.5) is the main builder, with Supabase, Vercel and Playwright MCP servers and context7 for documentation. Open Code running Kimi K3.1 or DeepSeek is a second agent for small jobs (translation drafts, explaining files, reviewing a commit). I also have DeepSeek Harness. Only one agent edits the code at a time. No real data or API keys go into any prompt.

Revisions after review (2026-11-09): alerts labelled as foreground demo alerts; simulated phone calls; nurse confirmation before unable_to_reach; long access tokens plus rate-limited short codes; narrow patient write functions; dashboard definitions and an offered_at field; a daily_stats table; "Join the line" renamed "Start a visit"; core loop built before the from-home start; strategic-alignment wording softened.

Second revision (2026-11-09, after another review and a check of THP's emergency page): starting from home is a fourth patient action through a rate-limited server route; closed_at means virtual waiting ended and reopening clears it; only patients who waited off-site and arrived get the survey; "on the way, not arrived" flag 30 minutes after confirmation; "Phoned, answered" pauses escalation (last_phone_result, followup_paused_until); daily_stats filled per visit at deletion with an is_demo key; "place held until" replaced by "Please return now. Staff will review your visit if you do not respond."; short-code lookup is staff-only; wait range described as time to see a doctor after triage, as THP measures it; staff check-in after triage and registration; THP's own alternatives added to the start page.

Open questions: the app's name; the two extra languages; fluent speakers to check translations; three to five testers for Phase 5.

## Part 3: research already done

Similar projects (all links checked 2026-11-09; a repo with no license can be read but not copied):
1. QueueCare, https://github.com/iahmedmalik/QueueCare (MIT). The closest match: a live clinic queue built in October 2026 on Next.js 16, Supabase and Vercel. Patients follow the queue on their phone without an account. Public pages read the database only through two SQL functions, and live updates go through a one-row queue_ticks table, so the patient page never subscribes to visit rows. Wait estimate: patients ahead times the average of the last five consultations, shown as 80% to 125%, rounded to 5 minutes. It ships a BRD, PRD, test plan, pilot plan and lessons learned.
2. Doctor Standby (McHacks 12, Montreal), https://devpost.com/software/doctor-standby-emergency-room-reimagined: an ER patient status page with queue position, wait and triage category (code: abdougrou/emergency-queue-tracker, no license).
3. QCare (McHacks 12, IFEM Emergency Department Experience Award), https://devpost.com/software/qcare-cx1467 (code: nathan-nw/QCare, no license).
4. Clinic Que (Katy Youth Hacks 2025), https://devpost.com/software/clinic-que: SMS queue with JOIN, STATUS and LEAVE commands (Twilio).
5. Other queue apps: CQS-FE (MIT, Next.js 15, triage levels, English and Kinyarwanda), MediQueue (MIT, React and Supabase, camera QR scanner), Pametni Sistem Cakalnice (browser-only localStorage demo, like my Phase 1), CareSync and QUEUECURE- (Next.js and Supabase Realtime, no license), vetokenio (privacy-safe public display), OpenMRS queue module.
6. Simulation: ER-Flow-Sim (MIT, CTAS-based ER flow notebook), EDSim (Apache-2.0, LLM-agent ED simulator), Kaggle "ER Wait Time" (simulated, CC BY-SA 4.0).
7. Real wait data, for background only: ER Watch Scraper (Ontario ER waits), Wait Time Canada (MIT, compares four provinces), Quebec ER hourly archive (MIT, 120 EDs since 2026-09-02), Queensland ED waits and busyness on Hugging Face (CC BY 4.0).

Research papers:
1. Ehrler F, Rochat J, Siebert JN, Guessous I, Lovis C, Spechbach H. Use of a semiautomatic text message system to improve satisfaction with wait time in the adult emergency department: cross-sectional survey study. JMIR Medical Informatics 2022;10(9):e34488, doi 10.2196/34488. Geneva: low-severity patients waited outside the waiting room and were recalled by text according to the Swiss Emergency Triage Scale. 97 of 100 patients were satisfied; most waited elsewhere in the hospital. The 10 caregivers found it easy to use but said it added workload, which slowed adoption.
2. Xie B, Youash S. The effects of publishing emergency department wait time on patient utilization patterns in a community with two emergency department sites. International Journal of Emergency Medicine 2011;4:29, doi 10.1186/1865-1380-4-29. After wait times were published, waits over 4 hours and the 95th percentile fell, average waits rose slightly, and patients were more likely to choose the site with the shorter wait.

No project found combines triage-ordered place in line, waiting off-site, a no-response follow-up ladder and an unable-to-reach outcome.

## Questions for you

1. What in this plan is unrealistic for a beginner in five weeks, and what would you cut first?
2. Is the security design (long access token in the QR code, staff-only short-code lookup, read and write only through narrow database functions and one rate-limited server route, a one-row change signal, no patient login) safe enough for a public demo? What would you still change?
3. Are the placeholder no-response times (0, 10, 20, 30 minutes, then nurse review) and the "I'm still here" prompt every 30 minutes reasonable, and what safety gaps do you see in the patient flow?
4. Which two languages besides English would you pick for Mississauga and Peel, and why?
5. How should the simulated wait range be calculated so it looks believable?
6. What risks would a hospital privacy officer or ER clinical lead raise about this concept?
7. Is anything in the strategic alignment with THP's Plan to 2030 overstated?

---

## Appendix: SPEC.md (the spec the coding agent follows)

# Virtual ER Waiting Room: concept prototype spec

Read this whole file before writing code. Build one phase at a time and stop at the end of each phase so I can test it. I am new to coding: explain each new file in one plain sentence, and tell me exactly what to click or type when I have to do something myself. Never ask me to paste API keys or passwords into chat; tell me which file or settings page they go in.

## What this is

A demo web app showing how a hospital emergency department could let low-acuity patients (CTAS level 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when called.

It is a concept prototype. It is not affiliated with any hospital, uses only invented (synthetic) patients, and connects to no hospital system. Every page shows this footer:

"Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only."

App name: TBD (I will choose it). Use "Virtual Waiting Room" as a placeholder.

## Stack

- Next.js (App Router) with TypeScript and Tailwind CSS
- Supabase for the database, realtime updates and staff login. Project region: Canada (Central), ca-central-1
- Hosting on Vercel, code on GitHub
- No native mobile app. Everything runs in a phone or laptop browser.

## Tools for the agent

- Use context7 for current Next.js, Tailwind and Supabase documentation before writing code that depends on a library version.
- Supabase MCP: use it to create tables, row-level security policies and to read logs, but show me the SQL and wait for my approval before running anything that changes or deletes data. It must be scoped to this project (project_ref). After Phase 2 it runs read_only.
- Vercel MCP: use it to read build logs and check deployments. Ask before changing any project setting.
- Playwright MCP: after each phase, open the app at phone size (390 x 844) and at laptop size, run the test checklist, and show me screenshots of anything that fails.
- Run /security-review at the end of Phases 2 and 3, and /code-review before the final version.
- Keep a short progress log so a new session can continue where the last one stopped.
- Never ask me to paste keys, tokens or passwords into chat. Tell me which file or dashboard page they go in.

## Hard rules

1. Store no real personal or health information. A visit has two identifiers. The display code is 6 characters (letters and digits, no look-alike characters such as O/0 or I/1) so people can read it aloud or type it at the desk. The access token is long and random (at least 128 bits, for example 22 or more random URL-safe characters); the QR code and the link saved on the phone carry the token, and only the token opens a visit on a patient's phone. Only logged-in staff can look up a visit by its short code. Patients open a visit only with the token: the link saved on their phone or the QR code on a desk slip. No names, health card numbers, phone numbers or symptoms are stored.
2. The app never makes clinical decisions. Staff choose the CTAS level and confirm eligibility. No symptom checker, no AI triage.
3. Every patient screen, in every state and every language, shows: "If your symptoms get worse, call 911 or come back to the emergency department now."
4. Visits older than 24 hours are deleted automatically. Just before a visit is deleted, add its contribution to a daily_stats table, counting each number on the date of its own event (survey responses count on the closed_at date). No survey can arrive after deletion, so no day ever needs reprocessing; do not use a once-a-night summary job. The dashboard shows a day as its daily_stats totals plus the visits still in the visits table. daily_stats holds only totals (no codes, tokens or single-visit times).
5. A patient's token can read only its own visit, through one database function that returns only the fields a patient may see. Patients can do exactly four things, each through its own narrow function or server route: start a visit from home (a rate-limited server route that itself sets source = home and status = pre_arrival; the browser never sets them, and this never grants a place in line), confirm "I'm on my way" (only while called), tap "I'm still here" (only while waiting), and submit the survey score once (only after the visit is closed, and only if the visit waited off-site and arrived). Everything else, including the queue, is staff only (Supabase row-level security). Patient pages learn about changes from a signal that holds no visit data (for example a one-row table touched on every change) and then re-read through the function, so they never subscribe to visit rows.
6. No hospital logos or official branding.
7. Joining from home never holds a place in the doctor's line. A patient's place in line starts when a nurse triages them at the hospital, because urgent patients are always seen first.
8. Do not copy or display THP's wait-time numbers. Link to THP's dashboard on THP's own site (https://trilliumhealthpartners.ca/emergency/a/visit.html, also served at https://www.thp.ca/emergency/A/visit.html). THP's terms prohibit reuse of its site material without written permission. All wait estimates inside the app are simulated.

## Screens

### / start page (patient's own phone, at home or in the waiting room, no login)

- Emergency check first: "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now."
- Other options before travelling: Health811 (call 811 for a free nurse line), the regional virtual urgent care program (https://www.regional-virtual-urgent-care.ca/), and THP's own alternatives listed on its emergency page: the Urgent Care Centre at Queensway Health Centre and the pharmacist assessment pilot at three Mississauga Shoppers Drug Mart locations. Link to THP's pages for both and copy nothing beyond their names; hours change, so send patients to THP's page for them.
- Link: "See current wait times on THP's website" (opens THP's page; nothing copied).
- "Start a visit" button: choose one of two demo sites ("Demo Site A", "Demo Site B") and a language. The app creates the visit code and a QR code and saves the code in the phone's browser storage, so the patient never types it and reopening the site brings the visit back.
- A visit started from home has status "Checked in from home, not yet triaged" and shows: "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
- The footer disclaimer and the 911 line appear here too.

### /patient (phone, no login)

- Opens the visit saved on this phone automatically. For patients who did not start on their own phone, the triage desk prints a slip with a QR code (carrying the token) and the short code. The patient scans the QR code with the phone camera; if that fails, staff show the QR code again from /staff. Typing the short code on /patient does not open a visit.
- Shows: place in line, estimated time to see a doctor after triage, as a range (for example "40 to 60 minutes", simulated; THP's own dashboard also measures waits from triage), and status: Waiting, Please head back now, Ready at the desk.
- "I'm on my way" button after the patient is called.
- Every 30 minutes while waiting off-site, an "I'm still here" button appears. A missed tap (no tap within 10 minutes of the prompt) flags the patient on the staff screen.
- While called but unconfirmed, the screen alerts with sound and vibration where the phone allows. These are on-screen demo alerts: they work only while the page is open and the phone is unlocked, and the demo must say so. Do not claim the app can wake a locked phone. A hospital version would use text messages or push notifications (iPhones allow web push only for sites added to the home screen). After the 20-minute step it shows: "Please return now. Staff will review your visit if you do not respond."
- Language switch: English plus two languages (TBD). All text comes from one translation file so it can be checked by a fluent speaker.
- Text size control. Works on a small phone. Screen-reader labels on all controls.
- After the visit is closed, only for patients who waited off-site and arrived: one survey question, "How would you rate your waiting experience?" on a 0 to 10 scale.
- Updates live without refreshing.

### /staff (tablet or laptop, staff login required)

- Check in a patient after triage and registration (THP's emergency page lists triage first, then registration, where the patient gets an ID band): scan the QR code on the patient's phone (use the device camera) or type the short code (short-code lookup is staff-only). For a patient who did not start a visit, create a new code and show it with a QR code. Then choose CTAS 4 or 5, tick the eligibility checklist (has a phone, can return within 20 minutes, agrees to wait off-site), and choose language.
- "Expected arrivals" list: visits started from home that have not reached triage yet. These are not in the waiting line. Remove them automatically after 6 hours if they never arrive.
- Patient declines or is not eligible: record "offered, declined" or "not eligible" with no other details (for the dashboard), and the patient waits on-site as usual.
- List of patients waiting off-site with minutes waited, sorted by arrival.
- "Call back" button per patient; shows when the patient confirms.
- Confirmed but not arrived: a set time after confirmed_at (a setting, default 30 minutes), flag "On the way, not arrived". Never remove the visit automatically. This is a demo setting, not a clinically validated deadline.
- No-response follow-up after "Call back" (all times are settings so I can shorten them for testing; they are placeholders, and a hospital's clinical lead would set the real ones):
  - 0 minutes: patient screen alert (plus optional text in the Twilio add-on).
  - 10 minutes, no confirmation: second alert on the patient screen; flag on the staff screen: "Phone this patient." The demo stores no phone numbers, so phone calls are simulated: staff record each attempt with a button ("Phoned, answered" or "Phoned, no answer"). A hospital version would take the number from its registration system. "Phoned, answered" saves last_phone_result, clears the phone flag and pauses escalation until followup_paused_until (a setting, default 10 minutes). After the pause, the ladder continues from the time elapsed since called_at; it does not restart. A visit with an answered call that still does not arrive is flagged "Contacted, not yet arrived", never "Review: unable to reach".
  - 20 minutes: flag: "Phone a second time"; the patient screen shows the "Please return now" message.
  - 30 minutes, with no answered call: the visit is flagged "Review: unable to reach" and stays in the line until a nurse confirms. On confirmation the status becomes unable_to_reach and the visit leaves the active line. The app does not record this as left without being seen; staff follow hospital policy outside the app.
  - If an unable_to_reach patient arrives later, staff can reopen the visit, which clears closed_at and sends it back to triage for reassessment (status: needs_reassessment).
- The app never contacts anyone other than the patient. No emergency contacts are stored.
- Mark arrived, mark removed (left, no-show). Actions that end virtual waiting (arrived, removed, unable_to_reach confirmed, declined, not_eligible) set closed_at in the same update. Closed means virtual waiting ended, not that care is finished.
- "Call everyone back" button for a surge or a system problem, with a confirmation step.

### /dashboard (staff login required)

Numbers for the current day:

- Patients waiting off-site now, and patients called but not yet arrived
- Eligible patients offered the option (percentage), and how many declined
- Average minutes from call-back to arrival
- No-shows and patients marked unable to reach
- Visits started from home, and how many of those arrived at triage
- Survey: number of responses, average score, and share scoring 9 or 10

Definitions ("today" means since midnight, America/Toronto time; demo visits count only in demo mode, and daily_stats keeps them apart through its is_demo key):

- Waiting off-site now: visits with status waiting. Called but not arrived: status called or on_the_way.
- Offered (percentage): visits with offered_at today, divided by visits triaged today as CTAS 4 or 5 minus those marked not_eligible. Declined: status declined.
- Average minutes from call-back to arrival: arrived_at minus called_at, averaged over visits that were called and arrived today.
- No-shows: status removed with removed_reason no_show. Unable to reach: status unable_to_reach (nurse-confirmed).
- Visits started from home: source home, created today; of those, arrived at triage means triaged_at is set.
- Survey: responses are visits whose closed_at is today and that have a survey_score; report the count beside the average and the share scoring 9 or 10.

### Demo mode (staff only)

One button that creates 15 to 20 fake visits spread over the last few hours and moves some of them through the statuses, so the screens look like a busy evening. A second button clears all demo data, including demo rows in daily_stats.

## Data (one main table)

visits: id, code (6-character display code), access_token (long random token), site (A or B), source (home or desk), ctas_level (4 or 5, empty until triage), language, status (pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed, declined, not_eligible), removed_reason (left or no_show, only when removed), created_at, triaged_at, offered_at (when staff offered off-site waiting), last_still_here_at, called_at, confirmed_at, review_flagged_at, arrived_at, closed_at, phone_attempts (count of simulated calls), last_phone_result (answered or no_answer), followup_paused_until, survey_score (0 to 10, optional), is_demo.

daily_stats: key (day, site, is_demo), and one total per dashboard number. No codes, tokens or single-visit times.

Place in line is ordered by triaged_at, never by created_at.

Add other fields only if a phase needs them, and tell me why.

## Phases

1. Clickable prototype with in-browser fake data, no Supabase: start page, /patient, /staff, /dashboard. Build the core loop first: staff check in a desk visit, the patient screen shows it, staff press Call back, the patient taps "I'm on my way", staff mark arrived. Add starting a visit from home on the start page only after that loop works. Done when I can run the core loop across two tabs, then start a visit on the start page, check it in on /staff, and watch it change on /patient.
2. Supabase: table, realtime, staff login, row-level security. Then deploy to Vercel. Done when my laptop (staff) and my phone (patient) update each other within about 2 seconds on the vercel.app link.
3. Safety and equity: 911 line, start-page emergency check, no-response follow-up steps, "I'm still here" prompt, call-everyone-back, languages, text size, screen-reader labels, footer, 24-hour deletion.
4. Dashboard, survey and demo mode.
5. Testing with real people and a README explaining how to run the project.

Optional after Phase 5: a Twilio trial that texts only my own verified phone number when a patient is called.
