# Gemini review: presentation deck (Phase 5)

Model: Gemini Hydrogen 4, High, in a new chat. If no Hydrogen 4 credits: Gemini 3.6 Flash, High.

## Prompt to paste

You review a 14-slide deck for a 15-minute talk to a mixed audience (some clinical, some technical, some neither). The deck presents a concept prototype: a virtual ER waiting room for CTAS 4 and 5 patients, with synthetic data only. Find problems. Do not confirm what is good. For each problem, give the slide id, the exact words, why it is a problem, and a fix in plain English.

Look for:
1. Claims that a mixed audience could misread as clinical advice, a real result, or a link to a real hospital.
2. Words a non-technical listener does not know (for example "row-level security", "token", "lint"), and whether the speaker notes explain them.
3. Slides with too much text for about 1 minute each.
4. Places where the slide text and the speaker notes disagree.
5. A missing point the audience will ask about (for example: patients without a smartphone, what happens if the page is closed).
6. The order of the slides: does the story flow from problem to idea to safety to proof to limits?

Rules for your fixes: straight quotes, no em dashes, plain short sentences. Do not change the 911 sentence: "If your symptoms get worse, call 911 or come back to the emergency department now."

## Not checked

- The visual layout of slides 5 to 14 (no screenshot this session).
- "Updates arrive in about two seconds" (journey notes).
- "A text size switch goes up to extra large" (access).
- "Each flag says what to do next" (staff).
- The test counts 873, 39 and 3 are from earlier in this session, not from a new run.

## Deck text

Paste everything from "## Prompt to paste" to the end of the close slide into Gemini.

## Slide: cover
Concept prototype · synthetic data only
Virtual Waiting Room
After triage, wait where you are comfortable. Follow your place in line on your phone. Come back when staff recall you.
[Presenter name] · [Course] · [Date]
Phone mock-up: Your place in line 3. Estimated wait 40 minutes to 1 hour (simulated). If your symptoms get worse, call 911 or come back to the emergency department now.
Speaker notes: Good [morning]. This is the Virtual Waiting Room, a concept prototype I built this term. The idea is simple: after a nurse triages a less urgent patient, that patient can wait somewhere more comfortable, follow their place in line on their phone, and come back when staff recall them. Everything you will see uses invented patients. It connects to no hospital system, and it is not affiliated with any hospital. The phone on the right shows the three things a waiting patient always sees: their place, a simulated wait range, and the 911 line.

## Slide: problem
The problem
Less urgent patients can wait a long time in a crowded room.
CTAS cards: 1 Resuscitation, 2 Emergent, 3 Urgent, 4 Less urgent (Can wait off-site), 5 Non-urgent (Can wait off-site).
Canadian Triage and Acuity Scale (CTAS): 1 is the most urgent, 5 the least.
They do not need the room. They need to know when to come back.
Speaker notes: In a Canadian emergency department, a nurse sorts every patient with the Canadian Triage and Acuity Scale, CTAS. Level 1 is the most urgent and level 5 the least. The most urgent patients are always seen first, so patients at levels 4 and 5 often wait the longest. Many of them could wait somewhere else, if they had a safe way to know when it is their turn. This project only looks at levels 4 and 5, and only after a nurse has triaged them.

## Slide: idea
The idea
Triage first. Then wait where you like.
1 A nurse triages you. Your place in line starts at triage, as it does today. The app never decides who is urgent.
2 You wait off-site. Staff check that you can come back within 20 minutes. You follow your place in line on your phone.
3 You come back when recalled. Staff press "Recall patient". Your phone shows "Please head back now". You tap "I'm on my way".
No app to install. It runs in the phone's browser. A patient can also start a visit from home, but that does not hold a place in line.
Speaker notes: Here is the whole idea in three steps. One: a nurse triages the patient at the hospital, exactly as today. The place in line starts at that moment. Two: if the patient is CTAS 4 or 5 and staff confirm they have a smartphone with internet, can come back within 20 minutes and agree to wait off-site, they get a slip with a QR code and leave. Three: when it is nearly their turn, staff press Recall patient, the phone says Please head back now, and the patient taps I'm on my way. Nothing to install: it is a web page.

## Slide: rules
Hard rules
Four things the app never does
No clinical decisions. Staff choose the CTAS level and check eligibility. No symptom checker, no AI triage.
No personal information. No names, health card numbers, phone numbers or symptoms. A visit is a short code and a random token.
No place held from home. The line starts at triage, because the most urgent patients are always seen first.
No screen without the 911 line. Every patient screen, in every state and language: "If your symptoms get worse, call 911 or come back to the emergency department now."
Speaker notes: Before any code, I wrote hard rules that win over everything else. These four matter most. The app never makes a clinical decision: staff choose the CTAS level. It stores no personal or health information: no names, no health card numbers, no phone numbers, no symptoms. Starting a visit from home never holds a place in line. And every patient screen, in every state and every language, shows the 911 line. Automated tests check the 911 line on each screen.

## Slide: journey
The patient's journey
From triage back to the desk
Started from home (optional, dashed box): The patient taps "Start a visit". No place in line yet.
Waiting: A nurse triages. Staff check the patient in. The place in line starts.
Please head back now: Staff press "Recall patient". Sound, vibration and words on screen.
On the way: The patient taps "I'm on my way". Staff see it at once.
Ready at the desk: Staff mark the patient arrived. Virtual waiting ends.
Other ways a visit ends: declined, not eligible, left, no-show, unable to reach. Each one ends virtual waiting, not care. The patient can still be seen at the hospital.
Speaker notes: This is the life of one visit. The dashed box is optional: a patient can start a visit from home before they travel, but it holds no place in line. The real line starts when a nurse triages them and staff check them in. Then the status is Waiting. When staff press Recall patient, the phone changes to Please head back now. The patient taps I'm on my way, and staff mark them arrived at the desk. Updates arrive live, in about two seconds, without a refresh. There are other endings too, and each one only ends virtual waiting. It never means care is finished.

## Slide: patient
On the patient's phone
Clear words, honest estimates
Phone mock-up: Your place in line 3. Estimated wait (simulated) 40 minutes to 1 hour. Button: I'm still here.
Place in line, with a reminder: "Your place can change if more urgent patients arrive."
A range, marked as simulated: The app never copies a hospital's real wait times.
"I'm still here" every 30 minutes: No tap in 10 minutes flags the visit for staff. It is not a health check.
A recall you can see and hear: Sound and vibration while the page is open, always with words on screen.
Speaker notes: This is what the patient sees while they wait. Their place in line, always with the reminder that the place can change if more urgent patients arrive. A wait range counted from now, clearly marked as simulated: the app never copies a hospital's real numbers. Every 30 minutes an I'm still here button appears. If the patient does not tap it within 10 minutes, staff see a flag. We were careful with the words: it only says the patient is still following the visit. It is not a health check. When staff recall the patient, the phone uses sound and vibration where it can, but only while the page is open and the phone is unlocked, and the words are always on screen too.

## Slide: ladder
If a patient does not answer
Clear steps, then a nurse decides
0 min: Recall alert on the patient's screen.
10 min: Second alert. Staff see: "Phone the patient now."
20 min: Staff phone again. The patient sees "Please return now."
30 min: "Review: unable to reach". The visit stays in line until a nurse confirms.
All times are demo settings. A hospital's clinical lead would set the real ones. Phone calls are simulated: the demo stores no phone numbers, so staff record "Phoned, answered" or "Phoned, no answer".
Speaker notes: What if a recalled patient does not answer? The app follows a fixed ladder. At zero minutes, the alert on the phone. At 10 minutes with no reply, a second alert, and staff see Phone the patient now. At 20 minutes, staff phone again and the patient's screen says Please return now. At 30 minutes with no answered call, the visit is flagged Review: unable to reach, but it stays in line until a nurse confirms. The app never removes a patient by itself. These times are placeholders: in a real hospital a clinical lead would set them.

## Slide: staff
On the staff screen
Staff stay in control
Check in: A checklist: has a smartphone with internet, can return within 20 minutes, agrees to wait off-site.
Recall, then mark: "Recall patient", then "On the way" or "Seen". Each change reaches the phone live.
Flags to act on: No reply to a recall, or no "I'm still here" tap. Each flag says what to do next.
Pause off-site waiting: For downtime or a contact problem. No new off-site sign-ups. Patients already off-site keep their place.
Recall all off-site patients: One action for a surge or an emergency, with a confirm step.
Issue a new link: If a patient loses the page. The old link stops working at once.
Speaker notes: This is the staff side. Staff check a patient in with a short checklist: a smartphone with internet, able to come back within 20 minutes, and willing to wait off-site. They recall patients and mark them on the way or seen, and the phone changes live. Flags show who needs attention, and each flag says the next step. For downtime or a contact problem, staff can pause off-site waiting: no new off-site sign-ups, and patients already off-site keep working. For a surge, staff can recall everyone who is off-site in one action. If a patient loses their page, staff issue a new link and the old one stops working. Every decision stays with staff.

## Slide: access
Access for everyone
Five languages, readable by all
Chips: English, Français, اردو, العربية, 中文
WCAG 2.2 AA: The target for every screen. Automated checks run on phone and laptop sizes.
Never sound or colour alone: Each alert also has words on screen. Each status has a name, not only a colour.
Right to left and large text: Urdu and Arabic read right to left. A text size switch goes up to extra large.
Speaker notes: Patients can use the app in five languages: English, French, Urdu, Arabic and Chinese. Urdu and Arabic read right to left, and the whole layout turns around for them. The target is WCAG 2.2 level AA, and automated accessibility checks run on phone and laptop sizes. No message depends on sound or colour alone: each alert has words on screen too. Patients can also make the text bigger. The translations are drafts: a fluent human reviewer must approve them before real use, safety messages first.

## Slide: privacy
Privacy by design
Nothing to leak
A short code: K7QPM4. 6 characters, with no look-alike characters. Staff read it out and see it on the slip.
A random token: 128+ bits. In the patient's link. It opens only that one visit, and staff can replace it.
Row-level security: The database itself checks who can read and change each visit.
5 patient actions: A patient can do exactly 5 things. Everything else is for staff only.
Deleted after 24 hours: Visits go. Only daily totals stay, for the dashboard.
Speaker notes: The safest data is data you never collect. A visit has no name and no health information. It has two identifiers: a 6-character code for staff, with no characters that look alike, and a random token of at least 128 bits in the patient's link. The token opens only that one visit. The database enforces the rules itself with row-level security, and a patient can do exactly five things. Every visit is deleted after 24 hours. Only daily totals stay, for the dashboard.

## Slide: dashboard
Measuring it
Numbers with a clear definition
Offered off-site waiting: 80%, 8 of 10 triaged.
Accepted: 75%, 6 of 8 offered.
Recall to arrival: 14 min, average over 5 visits.
Waiting experience: 0 to 10, one survey question after arrival.
Example numbers from the spec, not results.
Each number shows its count: "8 of 10", not only "80%", so a small day does not look like a trend.
Real and demo never mix: A switch shows one or the other. A simulator fills the 2 demo sites.
From daily totals only: The dashboard keeps working after visits are deleted.
Speaker notes: A pilot needs numbers, so the app has a small staff dashboard. These are example numbers from the spec, not results: there were no real patients. How many triaged patients were offered off-site waiting, how many accepted, the average minutes from recall to arrival, and one survey question on a 0 to 10 scale. Each number shows its count next to the percentage, so a small day does not look like a trend. Real and demo visits never mix. The numbers come from the daily totals, so they stay after the visits themselves are deleted.

## Slide: built
How it was built
A small stack, many checks
The stack: Next.js web pages, a Supabase database with live updates, hosted on Vercel.
The AI workflow: Claude Code plans and checks. Small worker agents write code to a brief. Gemini reviews each step in a new chat, to find problems. I approve every decision.
Tests first for each bug: A failing test shows the bug before the fix. No test is weakened to pass.
873 unit tests. 39 end-to-end browser tests, on phone and laptop sizes. 3 checks on every push: tests, lint and build.
Speaker notes: I am new to coding, so the process mattered as much as the code. The stack is small: Next.js for the pages, Supabase for the database and the live updates, and Vercel for hosting. Claude Code acted as the planner and checker, small worker agents wrote code to written briefs, and Gemini reviewed each step in a fresh chat, asked to find problems rather than confirm. I approved every decision. Each bug got a failing test first. Today there are 873 unit tests and 39 end-to-end browser tests, and three checks run on every push.

## Slide: limits
Honest limits
What this is not, yet
Limits today: Synthetic data only. No hospital systems, no real patients. Wait ranges and phone calls are simulated. The ladder times are demo settings, not clinically validated. Alerts work only while the page is open. The translations are drafts, not yet approved by fluent reviewers.
Next steps: Fluent reviewers approve the translations, safety text first. 3 to 5 testers try the full flow. A clinical lead sets the real times and rules. Privacy and security review before any pilot.
Speaker notes: I want to be clear about what this is not. It is a concept prototype with synthetic data only. It is not connected to any hospital system, and it has had no real patients. The wait ranges and phone calls are simulated, the follow-up times are demo settings, and alerts only work while the page is open. The translations are still drafts. The next steps are fluent reviewers for the translations, a small group of testers, a clinical lead to set the real rules, and a proper privacy and security review before any pilot.

## Slide: close
Questions?
[demo link or QR code]
A concept prototype with synthetic data only. Not for clinical use. If your symptoms get worse, call 911 or come back to the emergency department now.
Speaker notes: Thank you. I am happy to take questions, and I can show the demo live: the patient phone and the staff screen side by side. As a reminder, this is a concept prototype with synthetic data only, and it is not for clinical use.

## What to bring back

Paste Gemini's full answer here. I add it under a "Response" heading at the bottom of this file, then check each point against SPEC.md.
