# Virtual Waiting Room: can these screens be simpler?

This is a concept prototype. Low-acuity emergency patients (CTAS 4 or 5) can wait off-site after triage, follow their place in line on their phone, and come back when called. It is Phase 1, a browser-only demo with invented data. This file contains no keys, tokens, passwords or patient data.

## Rules the screens must keep (cannot be removed)

- Every patient screen shows: "If your symptoms get worse, call 911 or come back to the emergency department now."
- The app makes no clinical decisions. Staff choose CTAS and eligibility.
- Starting from home never holds a place in line. The line starts at triage.
- Patients open a visit only with the link or QR code, never by typing the short code.
- A footer disclaimer on every page.
- WCAG 2.2 AA. Every status is shown as words, not colour or sound alone.

## The screens today

**Start page (patient's phone)**
1. Red box: "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now."
2. "Official information about care options". A note that the demo can't choose a service for you, then Health811 (call 811), regional virtual urgent care, and THP's urgent care centre and pharmacist pilot (link to THP for hours). A link: "See current wait times on THP's website".
3. Visit box, one of:
   - No visit yet: "Start a visit" with a short note that this holds no place in line, a choice of Demo Site A or B, a language menu (English only for now) and a Start button.
   - Open visit: "You have a visit on this phone", the code, and "Open your visit".
   - Ended or expired visit: a note about it, "Open your visit", and a separate "Start a new demo visit instead".
   - Storage unreadable: an explanation and no form.
4. The 911 line, links to the demo screens, and the footer.

**Patient screen (phone)**
- Title, the 911 line, the visit code and site.
- One status block:
  - Not yet triaged (three short paragraphs: line starts at triage; this doesn't register you; follow normal arrival steps and show the code).
  - Waiting (place in line, a note that the place can change, a simulated wait range).
  - "Please head back now" with an "I'm on my way" button and a note about the demo's alert limits.
  - Ready at the desk.
  - Waiting on-site.
  - Expired.
  - Ended.
- Error states: visit can't be loaded, no visit found, broken link.

**Staff screen (laptop or tablet)**
- Site selector and a demo-only notice.
- Left column:
  - "Expected arrivals": a code search box plus a list of visits started from home, each with a "Check in" button.
  - Check-in form: CTAS 4 or 5, three eligibility ticks, language, then "Start off-site waiting", "Offered, declined" or "Not eligible". This form becomes "Check in visit CODE" for a home visit, with a cancel button. It shows a red alert if the visit changed on another screen.
  - A printable slip with a QR code after an off-site check-in.
- Right column:
  - "Off-site: waiting or called back (N)": one card per patient with minutes waited, progress ("Called 5 min ago · Seen · On the way") and buttons (Call back, Mark arrived, Remove: left, Remove: no-show, Show slip).
  - "Recently closed" with Undo.
  - Storage warnings.

## Question for you

Suggest up to five ways to make these screens simpler for a patient or a busy triage nurse. Examples: text to cut, steps to merge, things to hide until needed, or a clearer order. For each one, say which screen it is on, what to change, and why it helps. Don't suggest removing anything in the rules list above. Keep each suggestion to two or three sentences.
