# WaitWell: A virtual ER waiting room

WaitWell is a concept prototype. It shows how a hospital emergency department could let some patients wait off-site after triage. Triage is the first check a nurse does when a patient arrives. Patients who are not very sick, rated CTAS level 4 or 5 (the Canadian Triage and Acuity Scale), can go home or wait elsewhere. They follow their place in line on their phone. When staff are ready, they recall the patient, and the patient comes back to the hospital.

This is a concept prototype. It uses only invented (synthetic) patients and demo data. It connects to no hospital system. It is not for real patients, and it is not affiliated with any hospital.

## What it does

Patient screens (on a phone, no login):

- The start page has an emergency check, other care options and a "Start a visit" button. The app makes a visit code and a QR code, and saves them in the phone's browser.
- The patient screen (/patient) shows the place in line, an estimated wait range and the status: "Waiting", "Please head back now" or "Ready at the desk". The wait range is simulated.
- When the patient is called, they tap "I'm on my way". While they wait off-site, a prompt asks them to tap "I'm still here" every 30 minutes.
- After a visit is closed, a patient who waited off-site and arrived answers one survey question, from 0 to 10.

Staff screens (login needed):

- /staff: check in a patient after triage. Staff scan the QR code or type the short code, choose CTAS 4 or 5, tick the eligibility checklist and choose a language.
- Staff can recall a patient, mark a patient arrived or removed, and follow up when a patient does not reply. They can issue a new link for a lost phone, pause off-site waiting for one site, and recall all off-site patients at once.
- /dashboard: counts for today and the past 7 days, a funnel of today's counts, wait bands and a CSV download. It has a Real view and a Demo view. Real and demo visits are never mixed.
- A demo simulator plays both sides at Demo Site A and Demo Site B, so the screens look busy. Staff can clear all demo data with one button.

Languages: English, French, Urdu, Arabic and Chinese (Simplified). Urdu and Arabic screens run right to left. Only English is marked as checked by a fluent speaker. The other four show a draft notice until a fluent speaker checks them.

Accessibility features:

- Text size control at 100%, 125% and 150%.
- Labels on all controls, and visible focus.
- Status changes are read out by screen readers. The "called back" message is announced at once.
- Every alert also appears as words on the screen. Sound and vibration are extra.
- An offline banner shows when the phone loses its connection.
- Pages reflow on a small phone, without sideways scrolling.

## Safety rules

These rules come from SPEC.md. They always apply.

1. No real personal or health information. Each visit has a 6-character display code and a long random token. Names, health card numbers, phone numbers and symptoms are not stored. Only staff can look up a visit by its short code.
2. The app never makes clinical decisions. Staff choose the CTAS level and confirm eligibility. There is no symptom checker and no AI triage.
3. Every patient screen, in every state and every language, shows this line: "If your symptoms get worse, call 911 or come back to the emergency department now."
4. Visits older than 24 hours are deleted automatically. Their totals are kept in a daily statistics table, with no codes, tokens or single-visit times.
5. A patient's token can read only its own visit. Everything else, including the queue, is for staff only.
6. Joining from home never holds a place in the line. A place in line starts when a nurse triages the patient.
7. No hospital logos or official branding.
8. The app does not copy or show any hospital's wait-time numbers. All wait estimates in the app are simulated.
9. The accessibility target is WCAG 2.2 AA. That means keyboard access, visible focus, labelled controls, enough colour contrast and a layout that still works at 200% text size.

The only message that leaves the app is a Pushover alert to the project owner's phone when staff recall a real visit. It carries only the display code and the site. It never carries the token, a link, the language or the CTAS level.

The footer on every page says the app is a concept prototype, not affiliated with any hospital, with demo data only.

## Tech stack

- Next.js 16.4.6 (App Router) with React 19.3.0 and TypeScript.
- Tailwind CSS 4.3.3 for styling.
- Supabase for the database, realtime updates and staff login. The packages are supabase-js 2.119.0 and supabase ssr 0.12.7.
- Vercel for hosting. The file vercel.json sets two scheduled jobs. Vercel Web Analytics is also included.
- Pushover for the recall alert. The Anthropic SDK (version 1.12 or later) powers the dashboard summary button.
- Vitest 5.1 for unit tests, with happy-dom for page tests.
- Playwright 1.65 for end-to-end tests, and axe-core 4.14.0 for accessibility checks.
- ESLint 9 for lint.
- GitHub for the code and for the checks that run on every push.

## Run it on your computer

You need:

- Node.js version 22. This is the version GitHub uses (see .github/workflows/checks.yml).
- A Supabase project, and a Vercel account if you want to put the app online.

Steps:

1. Download or clone the project folder. Open a terminal in that folder.
2. Run `npm install`. This downloads the packages listed in package.json into a folder called node_modules.
3. Make the settings file. Copy `.env.example` and name the copy `.env.local`. Keep it in the same folder. Git does not save `.env.local`, so keys stay off GitHub. Fill in only the values you need:
   - NEXT_PUBLIC_SUPABASE_URL: in Supabase, Project Settings, Data API.
   - NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: in Supabase, Project Settings, API Keys.
   - SUPABASE_SECRET_KEY: in Supabase, Project Settings, API Keys, Secret keys. This key is for the server only.
   - CRON_SECRET: any long random value. Use the same name in the Vercel settings.
   - PUSHOVER_APP_TOKEN and PUSHOVER_USER_KEY: from the Pushover website. Leave both empty to turn the recall alert off.
   - ANTHROPIC_API_KEY: from the Anthropic console, API Keys. Leave it empty to turn the dashboard summary off.
   - E2E_STAFF_EMAIL and E2E_STAFF_PASSWORD: a test staff account, used only by the end-to-end tests. Leave them empty if you do not run those tests.
   Never paste these values into chat, into a shared file or into a screenshot.
4. Set up the database. In Supabase, open the SQL Editor. Open each file in supabase/migrations/ and run it in order. Sort the files by name, lowest first. Each name starts with a timestamp.
5. Create a staff user in Supabase, under Authentication, Users. Then give the user the staff role. In the SQL Editor, run this line, with the user's email in place of STAFF_EMAIL:
   `update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role":"staff"}' where email = 'STAFF_EMAIL';`
   The app reads this role from `app_metadata` (see supabase/migrations/20261110060756_tables_and_security.sql). Users cannot change it themselves. If the user is signed in, they must sign out and sign in again before the role works.
6. Start the app with `npm run dev`. This runs scripts/dev.mjs. It starts the Next.js development server. Before it starts, it tells Node to trust the same certificates as Windows. This stops an antivirus that checks secure web traffic (the file names Norton) from blocking the app's calls to the database.
7. Open the address that the terminal shows. It is usually http://localhost:3000. Open /staff to sign in, or /patient on a phone.

## Checks

Run these in the project folder. Each one is a script in package.json.

- `npm test` runs the unit tests with Vitest. There are 974 unit tests. The output lines that matter are the "Test Files" and "Tests" lines.
- `npm run lint` checks the code with ESLint. A clean run prints nothing.
- `npm run build` makes the production version of the app. It stops with an error if the build fails.
- `npm run e2e` runs 39 end-to-end tests with Playwright. The tests open the app at phone size (390 by 844) and at laptop size. They start their own server on port 3100, and they need the E2E_ settings in `.env.local`.
- `npm run e2e:cleanup` reads the file .e2e-codes.txt, which lists the test visits. It prints SQL lines. Run the first line in the Supabase SQL Editor to delete the test visits. Run the second line, which counts them. The count must be 0. Then delete .e2e-codes.txt. The script is scripts/e2e-cleanup.mjs.

GitHub runs `npm test`, `npm run lint` and `npm run build` on every push and every pull request. The file is .github/workflows/checks.yml. GitHub needs no keys for these checks.

## Folder map

- app/: the screens (one folder per screen, each with a page.tsx file) and the api/ routes that run on the server.
- components/: shared pieces, such as buttons, the footer, the 911 line, and the staff and dashboard parts.
- data/: saving and loading. This holds the Supabase calls, the browser storage and the demo data.
- lib/: the rules that decide things. Each rule is a small function with a test. lib/text/ holds all patient text, one file per language.
- supabase/: migrations/ holds the database changes, and checks/ holds the permission checks.
- scripts/: dev.mjs starts the development server, and e2e-cleanup.mjs prints the test cleanup steps.
- e2e/: the end-to-end tests, run with Playwright.
- docs/: progress.md (where the project stands), decisions.md (settled choices) and known-issues.md (gotchas and their fixes).
- handoffs/: reviews waiting for an answer from an AI model. handoffs/archive/ holds the finished ones.
- notes/, research_notes/ and reports/: earlier research.
- screenshots/: test screenshots.
- .claude/: settings for Claude Code, its worker agents and its skills.
- .github/workflows/: the checks that GitHub runs.

## Status and limits

- The project is in Phase 5: testing with real people and writing this README. Phases 2, 3 and 4 are closed. Phase 4 added the dashboard, the survey and the demo mode.
- The translations for French, Urdu, Arabic and Mandarin wait for a fluent human reviewer. Safety messages are checked first.
- Wait ranges are simulated. They do not come from a real hospital.
- Sound and vibration work only while the page is open and the phone is unlocked. The app cannot wake a locked phone. The Pushover alert is the only message that can reach a locked phone, and it goes to the project owner's phone only.
- The "I'm still here" tap tells staff the patient is still following the visit. It is not a clinical check. If symptoms change, the 911 line applies.
- Before real testers use the app, staff must clear the demo data.
- The app has no login for patients. A patient opens a visit with the link saved on their phone, or with the QR code on a desk slip.
