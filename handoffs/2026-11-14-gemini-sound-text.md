# Gemini handoff: sound text for the patient screen (2026-11-14)

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Hydrogen 4 credits: Gemini 3.6 Flash, High.

## What to paste into Gemini

You are checking patient-facing text for a concept prototype of a virtual emergency department waiting room. Patients with low-acuity problems wait away from the hospital and follow their place in line on their own phone. All data is synthetic. Your job is to find problems, not to confirm the text is fine.

The patient screen has a small sound box. The patient taps "Turn on sound" so the phone can play an alert and vibrate when staff call them back. Phones only allow this after a tap, only while the page is open, and only while the phone is unlocked. Some phones (for example iPhones) do not vibrate from a web page, and a phone on silent may not play the sound.

Four English lines (one changed, three new):

1. notice (shown above the button, replaces the current line): "This demo plays a sound, and vibrates where the phone allows, when you are called. It works only while this page is open and your phone is unlocked. Take your phone off silent."
2. failed (shown when the phone does not let the sound start): "Sound could not start on this phone."
3. turnOff (a button under "Sound is on"): "Turn off sound"
4. offWhileCalled (shown on the "please come back" screen when sound is off): "Sound is off. Tap Turn on sound to hear the alert."

The current line that 1 replaces: "This demo plays a sound and vibrates when you are called. This only works while this page is open and your phone is unlocked."

The existing button and status words, for context only: "Turn on sound", "Sound is on".

Rules for the text: plain language at about a grade 6 reading level; short sentences; no medical advice; do not promise that the alert will always work; words, not colour alone; the button name in line 4 must match the button exactly in each language.

Please do these, in order:

A. List every problem you find in the four English lines (unclear words, too long, a promise the app cannot keep, a mismatch with the button names). Suggest a better line only where you found a problem.
B. Draft each of the four lines (as you would fix them in A) in French (Canada), Urdu, Arabic (Modern Standard) and Mandarin Chinese (Simplified). Use the existing words for "Turn on sound" in each language so the button names match:
   - French: "Activer le son"; Urdu: "آواز آن کریں"; Arabic: "تشغيل الصوت"; Mandarin: "开启声音"
C. For each language, mark anything a fluent reviewer must check first. All translations stay marked "draft" until a fluent human approves them.

Give the answer as plain text, one language per section, with the keys notice, failed, turnOff, offWhileCalled.

## What to bring back to Claude

Paste Gemini's full answer into the chat. Claude adds it below under "Response", checks it, and puts the lines into lib/text/en.ts, fr.ts, ur.ts, ar.ts and zh.ts.

## Not checked

- Whether vibration works from a web page on the owner's iPhone (the real phone test is still open).
