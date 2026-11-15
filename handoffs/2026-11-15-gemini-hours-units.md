# Gemini handoff: hour words for the patient wait range (2026-11-15)

Model: Gemini Hydrogen 4, High, in a new chat. If there are no Hydrogen 4 credits: Gemini 3.6 Flash, High.

## What to paste into Gemini

You are checking patient-facing text for a concept prototype of a virtual emergency department waiting room. Patients with low-acuity problems wait away from the hospital and follow their place in line on their own phone. All data is synthetic. Your job is to find problems, not to confirm the text is fine.

The patient screen shows an estimated wait as a range. Today it is always in minutes: "{low} to {high} minutes" (for example "20 to 45 minutes"). Long waits give numbers like "95 to 140 minutes", which are hard to read. The staff screens now show times from 60 minutes as "1h 35min" and whole hours as "2h". We want the same idea on the patient screen, in five languages.

The app fills in the numbers. The words around them come from one line per language. Current lines:
- English: "{low} to {high} minutes"
- French (Canada): "{low} à {high} minutes"
- Urdu: "{low} سے {high} منٹ"
- Arabic (Modern Standard): "من {low} إلى {high} دقيقة"
- Mandarin (Simplified): "{low} 到 {high} 分钟"

Rules for the text: plain language at about a grade 6 reading level; no medical advice; the range is an estimate, not a promise; numbers stay as digits (0-9) in every language.

Please do these, in order:

A. For English, say whether patients read "1h 35min to 2h 20min" easily, or whether a longer form ("1 hour 35 minutes") or a rounder form ("about 1.5 to 2.5 hours") is clearer. List the problems with each choice. Note that a range may cross the hour (for example "45 min to 1h 20min").
B. For your chosen form, give in each of French (Canada), Urdu, Arabic and Mandarin: the word or short form for hours, the word or short form for minutes, the word order, whether a space goes between the number and the unit, and whether the unit changes for 1, 2, or 3 to 10 (for example Arabic dual and plural forms). Give three examples in each language: 45 minutes, 1 hour 35 minutes, and 2 hours.
C. For each language, mark anything a fluent reviewer must check first. All words stay marked "draft" until a fluent human approves them.

Give the answer as plain text, one language per section.

## What to bring back to Claude

Paste Gemini's full answer into the chat. Claude adds it below under "Response", checks it, and plans the change to the patient wait range with you before any code.

## Not checked

- Nothing in this file is checked yet.
