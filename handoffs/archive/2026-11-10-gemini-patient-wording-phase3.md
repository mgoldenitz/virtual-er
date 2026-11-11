# Handoff: patient-facing wording and survey question (Phase 3)

For: Gemini 3.1 Pro, High (or Gemini 3.6 Flash, High, if there are no 3.1 Pro credits). This replaces the GPT-6.1 Terra step.
Date: 2026-11-10. No keys, tokens, passwords or patient data are in this file.

## What the app is

A concept prototype of a virtual emergency department waiting room. After a nurse triages a low-acuity patient (CTAS 4 or 5), the patient can wait off-site, follow their place in line on their own phone, and come back when called. It uses only invented demo data, connects to no hospital system, and makes no clinical decisions. Patients open their visit from a QR code or a saved link; there is no login.

## Your task

Rewrite the patient-facing text below so it is clear, calm and short, and draft the new Phase 3 messages and the survey question. The text will later be translated into two other languages and checked by a fluent speaker, so:

- Plain language, about grade 6 to 8 reading level. Short sentences. One idea per sentence.
- No idioms, slang, jokes or wordplay that would not translate.
- Calm and direct. Do not frighten, and do not reassure about health ("you're fine", "nothing to worry about").
- Never sound clinical: the app does not assess anyone. Staff decide everything.
- Words on screen carry every alert. Never rely on colour or sound alone.
- Keep the text short for a small phone screen and for text enlarged to 200%.

## Fixed sentences: keep these word for word

These come from the project's rules. Do not change them. If you think one is unclear, say so in a separate note; the owner decides.

- F1 (every patient screen, every state): "If your symptoms get worse, call 911 or come back to the emergency department now."
- F2 (start page, top): "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now."
- F3 (under place in line): "Your place can change if more urgent patients arrive. The most urgent patients are always seen first."
- F4 (started from home): "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
- F5 (paused): "Off-site waiting is paused right now. Please come to the emergency department and wait there."
- F6 (20 minutes after call-back, no answer): "Please return now. Staff will review your visit if you do not respond."
- F7 (survey): "How would you rate your waiting experience?" on a 0 to 10 scale.
- F8 (footer, every page): "Concept prototype. Not affiliated with or endorsed by Trillium Health Partners. Demo data only."
- F9 (start page): "Urgent Care Centre at Queensway Health Centre in Etobicoke."
- F10 (start page): "A pharmacist can assess you at three Shoppers Drug Mart stores in Mississauga. This is a pilot, so check that it is still running before you go."
- F11 (start page, under the list): "For hours and addresses, see THP's emergency page."
- F12 (start page link): "See current wait times on THP's website"
- F13 (desk slip, under the QR code): "Or type this link into your phone's browser"
- Status names: "Waiting", "Please head back now", "Ready at the desk". Button labels: "I'm on my way", "I'm still here", "Start a visit".

## Rules the wording must respect

1. Starting a visit from home never holds a place in line. The place starts at triage.
2. "I'm still here" only tells staff the patient is still following the visit. It is NOT a check of symptoms or a reassessment. Never word it that way (no "How are you feeling?", no "check-in on your health").
3. "Seen" means the called screen was shown on an open phone, not that the patient read it. Never tell the patient "we know you saw this".
4. Alerts (sound, vibration) only work while the page is open and the phone is unlocked. The app cannot wake a locked phone, and the screen must say so. Do not promise texts or notifications.
5. The app never contacts anyone other than the patient. The demo stores no phone numbers; staff phone calls are pretend.
6. All wait estimates are simulated, and the screen says so.
7. Do not mention THP's wait-time numbers.

## Current text, by screen

Give each item a new version (or "keep") in the answer table. IDs are for the answer.

### Start page (/)

- S1 Heading: "Virtual Waiting Room" (placeholder app name; leave it)
- S2 "Official information about care options"
- S3 "This demo cannot tell which service is right for you. Check eligibility, availability and hours on each linked site before you go."
- S4 "Health811: call 811 for a free nurse line."
- S5 "Regional virtual urgent care" (link)
- S6 Start box heading: "Start a visit"
- S7 "Starting a visit here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
- S8 Question: "Which emergency department are you going to?" (choices "Demo Site A", "Demo Site B")
- S9 Label: "Language"
- S10 Button while working: "Starting…"
- S11 Busy: "Too many visits have been started just now. Please wait a few minutes and try again, or go to the emergency department."
- S12 Not saved: "Your visit was not saved. Please try again, or go to the emergency department desk."
- S13 Loading: "Checking this phone for a saved visit…"
- S14 Heading: "We cannot read the visit saved on this phone"
- S15 "The visit saved on this phone cannot be loaded right now, so a new visit is not offered. If you need care, go to the emergency department and follow its normal arrival and triage steps."
- S16 Heading: "You have a visit on this phone"; line "Visit code ABC234 · Demo Site A"; link "Open your visit"
- S17 Heading: "Your last visit on this phone"
- S18 "Off-site waiting has ended for this visit. You may still be waiting in the emergency department: open your visit to see its status."
- S19 Heading: "Your visit request on this phone has expired"
- S20 "It was started more than 6 hours ago and was never checked in at triage, so staff no longer expect it."
- S21 Button: "Start a new demo visit instead"

### Patient screen (/patient)

- P1 Loading: "Loading your visit…"
- P2 Heading: "We cannot load your visit right now"
- P3 "Nothing you do on this page can be saved at the moment, so staff may not see it. Please contact the emergency department desk."
- P4 Heading (no link): "No visit found on this phone"
- P5 Heading (bad link): "This link did not work"
- P6 "The link may have been cut short or mistyped, so no visit was opened."
- P7 "Scan the QR code on your desk slip with your phone's camera, or type the link printed under it. If that doesn't work, ask the desk to show the QR code again."
- P8 "Visit code: ABC234 · Demo Site A"
- P9 Waiting heading: "Status: Waiting"
- P10 "Your place in line: 3"
- P11 "Estimated time until you're called back: 40 to 60 minutes"
- P12 "This estimate is simulated for the demo."
- P13 Called heading: "Please head back now"
- P14 "Please return to the emergency department and go to the desk."
- P15 After the tap: "Thank you. Staff know you are on your way."
- P16 Button while working: "Sending…"
- P17 "Demo limits: alerts on this page only work while it is open and your phone is unlocked."
- P18 Tap not saved: "Your answer was not saved, so staff have not been told. Please try again, or come back to the desk."
- P19 Started from home, heading: "Status: Checked in from home, not yet triaged" (an earlier review asked for a shorter heading; suggest one)
- P20 Started from home, three paragraphs (an earlier review asked to shorten these; F4 must stay):
  - F4
  - "Starting this demo visit does not register you with a hospital, reserve a place, or give permission to wait off-site."
  - "If you go to the emergency department, follow its normal arrival, triage and registration steps. Show this visit code when staff ask. Only staff can approve waiting off-site."
- P21 Needs reassessment: heading "Please go to the triage desk", text "A nurse will check you again before you rejoin the line."
- P22 Arrived: heading "Status: Ready at the desk", text "Staff have marked you as back. Please stay in the waiting area until staff call you."
- P23 Declined or not eligible (waits on-site): heading "Status: Waiting in the emergency department", text "You are waiting on-site as usual. Staff will call you in the waiting area."
- P24 Any other ended visit (removed, unable to reach): heading "Your off-site wait has ended", text "Please check with the emergency department desk."
- P25 Expired (from home, never triaged in 6 hours): heading "This visit request has expired", then S20, then "If you still need care, go to the emergency department and follow its normal arrival and triage steps. You can also start a new demo visit on the start page."

### Screen-reader announcements (heard, not seen)

Spoken only when the status changes. Keep them to one short sentence.

- A1 Called (urgent): "You have been called back. Please head back to the emergency department now."
- A2 On the way: "Thank you. Staff know you are on your way."
- A3 Arrived: "Staff have marked you as back at the emergency department."
- A4 Ended: "Your off-site wait has ended."
- A5 Needs reassessment: "Please go to the triage desk."

### Desk slip (printed or shown by staff)

- D1 "Visit code: ABC234"
- D2 F13, then the link written out.

## New text to draft (Phase 3)

- N1 "I'm still here" prompt. Shows every 30 minutes while waiting off-site; if there is no tap within 10 minutes, staff see a flag. Need: a heading or line asking the patient to tap, the button (fixed: "I'm still here"), a thank-you after the tap, and a line saying what the tap means (see rule 2).
- N2 Second alert, 10 minutes after call-back with no "I'm on my way": a more urgent line on the called screen. Staff may phone the patient now (pretend in the demo), so you could say staff may try to reach them, but do not mention phone numbers.
- N3 After 20 minutes: F6 is fixed. If F6 needs a line before or after it, draft it.
- N4 Sound and vibration notice: a short line that this demo plays a sound and vibrates when you are called, only while the page is open and the phone is unlocked (replaces or merges with P17). Also a button label for turning sound on (phones only allow sound after a tap) and its "Sound is on" state.
- N5 Paused while starting from home: F5 is fixed. Draft nothing else unless it needs a heading.
- N6 Text size control: a label and the three choices (for example normal, large, extra large) and a screen-reader label.
- N7 Language switch: a label for the menu, and the sentence shown before the translations are approved by a fluent speaker (for example that the translation is a draft).
- N8 Survey (after the visit closes, only for patients who waited off-site and came back): an intro line, F7 with labels for 0 and 10 (for example "0 = very poor", "10 = excellent"), a submit button, a thank-you, and a line saying the answer is optional and anonymous (no name is stored).
- N9 Unable to reach (staff confirmed they could not reach the patient; the visit leaves the line): heading and text telling the patient to come to the desk if they still need care. Do not say "you missed your turn" or "you left without being seen".
- N10 Removed (staff removed the visit: left or no-show): heading and text. Neutral, no blame.
- N11 Called everyone back (staff call every patient at once, for example during a system problem): the patient just sees the normal called screen. Say whether P13 and P14 also fit this case, or suggest one extra line.
- N12 New announcements for screen readers, if N1, N2 or N9 need one (one sentence each).

## What to send back

1. A table with columns: ID, current text, new text (or "keep"), reason (one short phrase).
2. The new texts N1 to N12 with their IDs.
3. Any fixed sentence (F1 to F13) you think is unclear, with the reason. Do not rewrite it in the table.
4. Any state you think is missing a message.
