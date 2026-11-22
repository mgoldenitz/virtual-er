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
