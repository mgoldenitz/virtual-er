# Virtual Waiting Room: Phase 1 flow review (labels and missing states)

A concept prototype of an emergency department virtual waiting room. Low-acuity patients (CTAS 4 or 5) wait off-site after triage, follow their place in line on their phone, and come back when called. Phase 1 is a clickable demo: all data stays in one browser (localStorage), so two tabs stand in for a staff laptop and a patient phone. Demo data only; this file contains no keys, tokens, passwords or patient data.

## The Phase 1 goal (now working)

Run the core loop across two tabs, then start a visit on the start page, check it in on /staff, and watch it change on /patient. Checked with Playwright: patient screens at 390 × 844, staff at 1280 × 900 and 390 × 844, no sideways scrolling on any screen.

## Screens and their wording

**/ start page (patient's phone)**
- Red box: "Chest pain, trouble breathing, signs of stroke, heavy bleeding or another emergency? Call 911 now."
- "Other options before you travel": Health811 (call 811), Regional virtual urgent care (link), the Urgent Care Centre at Queensway Health Centre and the pharmacist assessment pilot at three Mississauga Shoppers Drug Mart locations ("For hours and details, see THP's emergency page"), and "See current wait times on THP's website". Nothing is copied from THP's site.
- "Start a visit" box: "Starting a visit here does not hold a place in line. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first." Choose Demo Site A or B, language (English only until Phase 3), button "Start a visit", which opens /patient.
- If this phone already has an open visit, the box says "You have a visit on this phone", shows the code and site, and offers "Open your visit" instead.
- 911 line: "If your symptoms get worse, call 911 or come back to the emergency department now."

**/patient (patient's phone)**, which opens with the token from the QR code or link, or the one saved on the phone. The 911 line shows in every state.
- Before triage: "Status: Checked in from home, not yet triaged" / "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first. After triage, show your visit code to staff."
- Waiting: "Your place in line: N", "Your place can change if more urgent patients arrive…", "Estimated time until you're called back: X to Y minutes", "This estimate is simulated for the demo."
- Called: "Please head back now", button "I'm on my way", "Demo limits: alerts on this page only work while it is open and your phone is unlocked." After the tap: "Thank you. Staff know you are on your way."
- Arrived: "Status: Ready at the desk". Declined or not eligible: "Status: Waiting in the emergency department".
- No visit: "No visit found on this phone". Broken link: "This link did not work". Damaged storage: "We cannot load your visit right now".

**/staff (laptop)**
- "Expected arrivals (N)": "Started from home, not yet triaged. Not in the waiting line." Each row shows the code, "started N min ago" and a "Check in" button. There is also a "Visit code" box with a "Find visit" button. Lookup messages: no such code / other site / older than 6 hours / already checked in.
- "Check in a patient after triage" (or "Check in visit CODE after triage", with "Started from home. The patient already has this visit on their phone." and "Cancel: check in a new patient instead"): CTAS 4 or 5, a three-item eligibility checklist, language, and the buttons "Start off-site waiting", "Offered, declined", "Not eligible". New desk visits get a slip with a QR code, the code and the written-out link.
- "Waiting off-site (N)": each row shows the code, CTAS, minutes waited, progress ("Waiting off-site" or "Called N min ago · Seen (screen shown, not necessarily read) · On the way"), and the buttons Call back, Mark arrived, Show QR again, and "Remove from list" (Left, No-show).
- "Recently closed": Undo for each, with no time limit, and "Show older closures".

**/dashboard**: a placeholder that lists the six numbers coming in Phase 4.

## Not in Phase 1 by design (SPEC phases)

Staff login and a real database (Phase 2); camera QR scanning on /staff (typed code works now); no-response follow-up steps, "I'm still here", pause switch, call everyone back, languages, text size, 24-hour deletion (Phase 3); dashboard numbers, survey and demo mode (Phase 4).

## Questions for you

1. Which labels or messages would confuse a patient on a phone, or a nurse at a busy triage desk? Suggest clearer wording.
2. Which states or transitions are missing a screen or message (for example a patient who opens the start page while their visit is declined, or staff whose chosen expected arrival is checked in from another tab)?
3. Is anything on the start page or the patient screen likely to be read as holding a place in line, or as clinical advice?
