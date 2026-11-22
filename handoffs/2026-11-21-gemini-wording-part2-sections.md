# Gemini wording: patient card look, Part 2 (new text sections)

Model: Gemini Hydrogen 4, High, in a new chat. If no Hydrogen 4 credits: Gemini 3.6 Flash, High.
Date: 2026-11-21. No keys, tokens, passwords, project IDs or patient data are in this file.

Give it: this file only.

This step is English only. After the owner approves the English, a second handoff asks for the French, Urdu, Arabic and Simplified Chinese drafts, and a fluent human reviewer checks them (safety text first).

## Prompt

You write patient text for a concept prototype: a virtual emergency department waiting room. After a nurse triages a low-acuity patient (CTAS 4 or 5), the patient can wait off-site, follow their place in line on their own phone, and come back when staff call them back. The app uses only invented demo data, connects to no hospital system, and makes no clinical decisions. Patients open their visit from a QR code or a link saved on the phone. There is no login.

Write the English text for 4 new sections (below). Then list every problem you find in your own text and in the facts: a fact that a patient could misread, a promise the app cannot keep, or a sentence that will be hard to translate. Do not tell me the text is good; list problems only.

## Style rules

- Plain language, grade 6 to 8. Short sentences, one idea per sentence, 20 words or fewer.
- No idioms, slang, jokes or wordplay. The text will be translated into French, Urdu, Arabic and Simplified Chinese.
- Calm and direct. Do not frighten. Do not reassure about health ("you're fine", "nothing to worry about").
- Never sound clinical. The app assesses no one; staff decide everything.
- Straight quotes only. No em dashes.
- Short enough for a 390 px phone with text at 200%.
- Match the tone of the current start page text (examples below).

## Fixed sentences: use these word for word, never reword them

- F1 (every patient screen): "If your symptoms get worse, call 911 or come back to the emergency department now."
- F3: "Your place can change if more urgent patients arrive. The most urgent patients are always seen first."
- F4: "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
- F5: "Off-site waiting is paused right now. Please come to the emergency department and wait there."
- F6: "Please return now. Staff will review your visit if you do not respond."
- Button names, quote them exactly: "Start a visit", "I'm still here", "I'm on my way". Status names: "Waiting", "Please head back now", "Ready at the desk".

## Rules the text must keep

1. Starting a visit from home never holds a place in line. The place starts at triage.
2. "I'm still here" only tells staff that the patient still follows the visit. It is not a check of symptoms. Never word it as "How are you feeling?" or a health check.
3. Sound and vibration work only while the page is open and the phone is unlocked. The app cannot wake a locked phone. Do not promise texts, calls from the app, or notifications.
4. Staff phone calls in this demo are pretend. The demo stores no phone numbers. Do not tell the patient that staff will phone them.
5. All wait estimates are simulated, and the text must not suggest they are real.
6. Do not mention the hospital's wait-time numbers.
7. No names, health card numbers, phone numbers or symptoms are stored. Visits are deleted after 24 hours.
8. Staff decide who can wait off-site. The patient cannot choose it alone.

## Facts for the sections (use only these; do not add facts)

- A patient can tap "Start a visit" at home or in the waiting room. This does not hold a place in line.
- At the hospital, a nurse triages the patient. Staff offer off-site waiting only for CTAS 4 or 5, and only if the patient has a phone, can come back within 20 minutes, and agrees to wait off-site.
- Staff can pause off-site waiting at any time (then F5 applies).
- A patient who did not start on their phone gets a paper slip with a QR code and a link. Scanning it opens the visit on the phone.
- The phone shows the place in line, a simulated wait range, and the status.
- Every 30 minutes while waiting off-site, an "I'm still here" button shows. If the patient does not tap it within 10 minutes, staff see a flag.
- When staff call the patient back, the screen says "Please head back now" and asks the patient to tap "I'm on my way" and come back within 20 minutes.
- No reply 10 minutes after the call-back: a second alert shows on the screen. 20 minutes after the call-back: F6 shows.
- At the hospital, the patient goes to the desk. Staff mark them as arrived.
- After the visit, a patient who waited off-site and arrived can answer one survey question.
- The link is saved in the phone's browser. Opening the site again on the same phone brings the visit back. A different phone or a private browser window does not have it.

## The 4 sections to write

Give each item an ID from this list, so the answer can be checked line by line.

### H: "How it works" (start page, under the start box)

A heading and 4 to 6 numbered steps, from starting a visit to arriving at the desk. Each step one or two short sentences. F4 must be in it, or a step that says the same as F4 must quote F4.

### B: "Before you leave" (patient screen, while the status is "Waiting")

A heading and 3 to 5 short points a patient needs before leaving the hospital: keep the page open, phone unlocked and charged, sound on, stay within 20 minutes, keep the slip. Must keep rule 3.

### Q: "Questions" (start page, below "How it works")

A heading and 5 to 7 questions with answers of 1 or 2 sentences. Cover at least:
- Does starting a visit at home hold my place?
- Why did my place in line change? (use F3)
- What happens if I do not tap "I'm still here"?
- What happens if I do not reply after staff call me back? (no promise of a phone call)
- What if my symptoms get worse? (use F1)
- What does the app save about me?
Do not answer any medical question (food, drink, pain medicine, driving).

### N: no-phone line (start page, one or two sentences near "Start a visit")

Off-site waiting needs a phone. A patient without a phone waits in the emergency department as usual.

## Current start page text, for tone (English)

- "This demo cannot choose a service for you. Check the rules and hours on each site before you go."
- "Starting here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
- "The app is too busy right now. Please wait a few minutes and try again. You can also go straight to the emergency department."
- "Off-site waiting is over for this visit. You might still be waiting at the hospital. Open your visit to check."

## Answer format

1. For each item: ID, the English text. Headings first.
2. The character count of the longest item in each section.
3. Problems: each with the ID, the rule or fact it touches, and a fix.
4. Any fact above that you think is unclear or wrong, as a separate note. The owner decides.

## Response

Gemini Hydrogen 4, High, 2026-11-21 (pasted by the owner):

### 1. English text

H: How it works

- H0: How it works
- H1: 1. Tap "Start a visit" at home or in the waiting room. Starting does not hold a place in line.
- H2: 2. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first.
- H3: 3. Staff decide if you can wait off-site. They give you a paper slip if you did not start on your phone.
- H4: 4. Follow your place in line, status, and simulated wait range on your phone. Tap "I'm still here" every 30 minutes.
- H5: 5. When your status is "Please head back now", tap "I'm on my way". Come back within 20 minutes.
- H6: 6. Go to the emergency department desk when you return. Staff mark you as arrived.

B: Before you leave

- B0: Before you leave
- B1: Keep this page open. Sound and vibration work only while the page is open.
- B2: Keep your phone unlocked. The app cannot wake a locked phone.
- B3: Keep your phone charged and turn sound on.
- B4: Stay within 20 minutes of the emergency department.
- B5: Keep your paper slip if you have one.

Q: Questions

- Q0: Questions
- Q1: Does starting a visit at home hold my place? / Starting from home does not hold a place in line. Your place starts when a nurse sees you at triage.
- Q2: Why did my place in line change? / Your place can change if more urgent patients arrive. The most urgent patients are always seen first.
- Q3: What happens if I do not tap "I'm still here"? / After 10 minutes, staff see a notice on your visit. Tapping this button only tells staff you are still waiting.
- Q4: What happens if I do not reply after staff call me back? / A second alert shows on your screen after 10 minutes. After 20 minutes, staff will review your visit if you do not respond.
- Q5: What if my symptoms get worse? / If your symptoms get worse, call 911 or come back to the emergency department now.
- Q6: What does the app save about me? / The app saves no names, health card numbers, phone numbers, or symptoms. Visits are deleted after 24 hours.
- Q7: How do I open my visit again? / Open this site again in the same browser on your phone. A different phone or a private browser window will not have your visit.

N: No-phone line

- N1: Off-site waiting needs a phone. If you do not have one, wait in the emergency department as usual.

### 2. Longest item per section

H4 116 characters; B1 74; Q4 180 (question and answer), Q7 answer alone 127; N1 97.

### 3. Problems (summary of each, with Gemini's fix)

- H1: "in the waiting room" can read as a check-in without triage; "Starting" has no object. Fix: `1. Tap "Start a visit" at home or while waiting at the hospital. Starting a visit does not hold a place in line.`
- H2 / Q1: "triage" is jargon. Fix: keep F4 in H2; Q1 second sentence `Your place starts when a nurse checks you in at the hospital.`
- H3: "off-site" is jargon; reads as if every walk-in gets a slip; leaves out "agree" and "20 minutes". Fix: `3. Staff decide if you can wait away from the hospital. If you agree and can return in 20 minutes, they give you a paper slip to scan if needed.`
- H4: "simulated" is hard and can sound fake; 3 items wrap. Fix: `4. Watch your place in line and demo wait range on your phone. Tap "I'm still here" every 30 minutes.`
- H5 / Q4: "head back" is an idiom (kept, fixed name); "call me back" reads as a phone call (rule 4). Fix Q4 question: `What happens if I do not reply when asked to return?`
- H6: "desk" may not match signs; "Staff mark you as arrived" is a staff action. Fix: `6. Go to the emergency department desk when you return. Tell staff you are back so they can check you in.`
- B1 / B2 / B3: open and unlocked are split; "work" reads as a promise; "turn sound on" is unclear. Fix: `B1: Keep this page open and your phone unlocked. Alerts cannot wake a locked phone.` and `B2: Keep your phone charged and tap to turn sound on, if your phone allows it.`
- B5: no reason given. Fix: `Keep your paper slip if you got one so you can scan the code again.`
- Q3: "flag" is jargon; no answer to what happens next; add "not your symptoms". Fix: `After 10 minutes, staff see a notice on your visit. Tapping this button only tells staff you are still waiting, not how you feel.`
- Q4: "review" is vague; "respond" does not say how. Fix: `A second alert shows after 10 minutes. If you do not tap "I'm on my way" within 20 minutes, staff will review your visit.`
- Q6: "Visits are deleted" can read as the hospital record. Fix: `The app saves no names, health card numbers, phone numbers, or symptoms. App records are deleted after 24 hours.`
- Q7: "browser" and "private browser window" are technical; no mention of the slip. Fix: `Open this website again in the same app on your phone, or scan your paper slip. Another phone or a private window will not have it.`
- N1: "off-site" jargon; "a phone" includes flip phones. Fix: `You need a smartphone with internet to wait away from the hospital. If you do not have one, wait in the emergency department as usual.`

### 4. Notes on the facts (for the owner)

- "Has a phone" should be a smartphone with a web browser and internet.
- Pause (F5) is not explained in "How it works" or "Questions".
- What happens to the place in line after a missed "I'm still here" is not stated.
- Does "I'm on my way" stop F6 at 20 minutes? What does "review your visit" mean for the place in line?
- "Call back" in the spec invites a phone-call reading; "ask the patient to return" is safer.
- A QR scan can open an in-app browser, so the saved visit is not in Safari or Chrome later; a shared phone overwrites the saved link.
- When and where the slip is given is not stated; a patient who started at home has no slip.
- The survey (fact 10) has no section.
- Can a visit near 24 hours be deleted mid-wait, and do totals stay after 24 hours?

## Check of the response (Claude, 2026-11-22)

Facts checked in this session:
- `lib/followUp.test.ts:144`: `patientCallStep("on_the_way", ..., at(25))` is `"first"`. Tapping "I'm on my way" stops the second alert and F6.
- `lib/text/en.ts:165`: the sound button is named "Turn on sound".
- SPEC lines 82-86: 10 min second alert, 20 min "Please return now" (F6), 30 min "Review: unable to reach" after a nurse confirms.

Accepted:
- H1 fix ("at home or while waiting at the hospital. Starting a visit does not hold a place in line.").
- H3 addition "If you agree and can return within 20 minutes".
- Q4 question "What happens if I do not reply when asked to return?" and the answer that names "I'm on my way".
- B1 merge "Keep this page open and your phone unlocked. Alerts cannot wake a locked phone."
- B2, but with the real button name: "Keep your phone charged. Tap "Turn on sound"."
- B5 reason, Q3 "not how you feel", Q6 "App records are deleted after 24 hours.".
- Q7 "or scan your paper slip".
- Note: add a pause question that quotes F5.

Rejected:
- Q1 "checks you in at the hospital": in this app, check-in is the staff step after triage. Keep the F4 wording.
- H6 "so they can check you in": same reason. Proposed: "Go to the emergency department desk when you return. Tell staff you are back."
- Q7 "in the same app": it must be the same browser. Proposed: "Open this website again in the same browser on your phone, or scan your paper slip."
- Survey section: not part of this step.

Owner decisions (open):
1. "off-site" or "away from the hospital" (F5 keeps "Off-site" word for word).
2. "simulated" or "demo" wait range (the patient screen now says "simulated for the demo").
3. N1 "smartphone with internet" in place of "a phone", and the same change in the staff checklist and SPEC.
4. Add the in-app browser note to Q7.
