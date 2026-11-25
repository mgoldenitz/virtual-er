# WaitWell tester kit

## 1. What WaitWell is

WaitWell is a student concept for a virtual emergency room waiting room. It is not a real hospital service. The idea: a patient with a low-urgency problem (CTAS level 4 or 5) waits away from the hospital after triage. They follow their place in line on their phone. They come back when staff recall them.

**Use made-up information only. Never type real health details, real names or real phone numbers.** WaitWell does not ask for any of these, so you should not need to.

## 2. What you need

- A phone with a browser and internet.
- For the staff part: a laptop.
- Live link: https://virtual-er-izpf.vercel.app
- The staff test account is given to you in person by the project owner. It is not written in this kit.
- Optional: a second person, so one of you can use the phone and the other the laptop.

Two things to know before you start:
- Some patients on the staff screen carry a "Demo" tag. They are fake. Only recall and mark arrived **your own visit code**.
- When staff recall a real (non-demo) visit, the project owner gets a message on their phone. It shows only the visit code and the site. This is expected.

## 3. Patient steps (on your phone)

1. Open the live link. Read the emergency check at the top. It says to call 911 for an emergency.
2. Under "Select language", look at the choices. French, Urdu, Arabic and Mandarin say "draft". A draft notice appears: "This translation is a draft. A fluent speaker has not checked it yet." Try one, then switch back to English. Urdu and Arabic flip the page to right to left.
3. Under "Text size", try "Normal", "Large" and "Extra large". Scroll the whole page at "Extra large". Does anything get cut off or hard to tap? Leave it on the size you like best.
4. Under "Start a visit", choose "Demo Site A" or "Demo Site B". Tell the person at the laptop which one you chose. Tap "Start a visit".
5. Write down your visit code (the label is "Visit code"). The status says "Status: Started from home, not seen by a nurse yet". Starting here does not hold a place in line.
6. Wait for staff to check you in (Section 4). Your screen changes to "Status: Waiting" without a refresh.
7. Find "Your place in line:". Find "Estimated time until you're called back:" and the wait range. The page says the estimate is simulated.
8. Read "Before you leave". Find the sound box. Tap "Turn on sound". You should see "Sound is on". You can tap "Turn off sound". The page says sound works only while the page is open and the phone is unlocked.
9. "I'm still here": this prompt ("Are you still following your visit?") appears 30 minutes after check-in. If you can wait that long, tap "I'm still here". Staff see that you are still waiting. It is not a health check. If you cannot wait, skip this step.
10. Staff recall you (Section 4). Your screen shows "Please head back now" and "Please go back to the emergency department desk." Your phone may play a sound and vibrate. Tap "I'm on my way". You should see "Thank you. Staff know you are on your way."
11. Staff mark you arrived. The status becomes "Status: Ready at the desk". A survey appears: "How would you rate your waiting experience?" The scale is 0 ("Very poor") to 10 ("Excellent"). Pick a score and tap "Submit". You should see "Thank you for your feedback."

## 4. Staff steps (on a laptop)

Go to the live link and open /staff. Sign in with the account you were given ("Sign in"). Pick the same site as the patient in "Site".

1. **Check a patient in.** Under "Expected arrivals", find the patient's code. You can type it under "Visit code" and press "Find visit", or press "Check in" next to it. The panel is called "Check in visit [code] after triage".
2. Choose "CTAS 4" or "CTAS 5". Tick all three boxes under "Eligibility checklist": "Has a smartphone with internet", "Can return within 20 minutes" and "Agrees to wait off-site". Check the language. Press "Start off-site waiting". You should see "Visit [code] is now waiting off-site." The patient appears under "Off-site: waiting or called back".
3. **Recall.** Find your own code. Press "Recall patient". Staff are asked to confirm: press "Yes, recall patient". There is no undo for a recall. The row then says "Called … ago". It adds "Seen" when the patient's phone showed the screen, and "On the way" after they tap "I'm on my way".
4. **Mark arrived.** Press "Mark arrived" on your row. The patient's survey should appear.
5. **Undo.** Find your code under "Recently closed". Press "Undo". The patient goes back to where they were. Then press "Mark arrived" again.
6. **Pause a site.** Press "Pause off-site waiting at Demo Site A…" (or B). Press "Yes, pause off-site waiting". A red banner appears. On the phone, the start page now says "Off-site waiting is paused right now. Please come to the emergency department and wait there." Turn it back on: press "Turn off-site waiting back on…", tick the box, and press "Yes, turn it back on". **Turn off-site waiting back on before you finish, so other testers are not blocked. Pause only when the owner says it is OK.**

## 5. What to look for

- **Confusing words.** Any word or sentence you had to read twice.
- **Missing states.** A moment when you did not know where you were in the process, or what to do next.
- **Medical advice.** Anything that sounds like advice about your health or what to do about symptoms. WaitWell should not give any.
- **Small screens.** Buttons too small to tap, text cut off, sideways scrolling.
- **Large text.** Set "Extra large" and go through every screen again.
- **Sound and colour.** Could you tell what was happening without sound or colour?
- **Languages.** If you read another language, do the words make sense? Remember, they are drafts.

## 6. Screen reader check (VoiceOver or TalkBack users)

This check needs a phone with VoiceOver (iPhone) or TalkBack (Android) turned on. Reach the survey first (Section 3, steps 4 to 11).

1. When the survey shows, pick a score (do not tap "Submit" yet).
2. Turn on airplane mode. The page may say "You are offline. Reconnect to the internet to see your status."
3. Press "Submit".
4. Listen. Does your reader say "Your answer did not save."? (The full message is "Your answer did not save. Please try again.")
5. Press "Submit" a second time.
6. Listen again. Does it say the message **both** times, or only the first time?
7. Turn airplane mode off. Press "Submit" once more. You should hear "Thank you for your feedback."

Write down your answer in the feedback form.

## 7. Safety

**In an emergency, call 911. WaitWell is not for emergencies.** Every WaitWell screen says: "If your symptoms get worse, call 911 or come back to the emergency department now."

## 8. Feedback form

Please do not write any health details in your answers.

**About you (no names)**
- Device (for example, "iPhone 14" or "Pixel 7"):
- Browser (for example, Safari or Chrome):
- Language you used:
- Did you use a screen reader? If yes, which one:

**Rate each from 1 (strongly disagree) to 5 (strongly agree)**
1. The words on the screen were easy to understand.
2. I always knew what to do next.
3. My place in line and the wait range were clear.
4. The app was easy to use on my phone's small screen.
5. The app still worked well when I made the text bigger.
6. (Staff part only) The staff screen was easy to use.

**Tell us in your own words**
7. Which words or sentences confused you?
8. Was there a moment when you did not know what was happening, or something was missing?
9. Did anything sound like medical advice? If yes, what?
10. What is one thing you would change?

## Notes for the project owner

- Written by the swarm Content Writer on 2026-11-24 from the code on `main` (bae896d). Every quoted label was checked against `app/`, `components/` and `lib/` (53 labels, all found).
- The survey in the app is 0 to 10. The 1 to 5 scale is only for this kit's own questions.
- Left out on purpose: the dashboard, "Issue a new link", "Recall all off-site patients", the phone-call buttons and "Clear demo data".
- The steps come from the code, not from a run in a browser. A tester should confirm they match what they see.
