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

- No fluent human has approved any word in this file.
- Gemini's screen-reader claim (VoiceOver and TalkBack read "1h" as "one aitch") is not tested on a phone.

## Response

Gemini Hydrogen 4, High, new chat, pasted back by the owner on 2026-11-15.

A. English: comparing the three wait-range forms

Verdict: Patients do not read "1h 35min to 2h 20min" easily under stress. The longer spelled-out form ("1 hour 35 minutes to 2 hours 20 minutes", and "45 minutes to 1 hour 20 minutes" when crossing the hour) is the clearest and safest choice for a Grade 6 reading level, screen readers, and translation across all five languages.

1. Problems with the short staff form ("1h 35min to 2h 20min", "45 min to 1h 20min", "2h")

* Hard to scan when sick, anxious, or using large text: Jamming digits and letters together without spaces ("1h 35min") creates dense visual blocks that slow down reading on small phone screens, especially at 125% or 150% text size.
* Screen-reader mispronunciation: Mobile screen readers (iOS VoiceOver and Android TalkBack) often read "1h" as "one-huh" or "one aitch" and "35min" as "thirty-five min" (rhyming with tin) instead of speaking "hours" and "minutes".
* Inconsistent spacing across the hour boundary: In "45 min to 1h 20min", "min" has a space when alone ("45 min") but no space when paired with hours ("1h 20min"). Removing the space ("45min") makes it even harder to read.
* False precision: Showing exact minutes inside a 2-hour range makes a rough queue estimate look like an exact countdown clock.
* Does not translate cleanly: Urdu, Arabic, and Mandarin do not have 1-to-3-letter unit symbols that attach directly to digits, and mixing Latin abbreviations with right-to-left scripts causes text-order bugs.

2. Problems with the rounder decimal form ("about 1.5 to 2.5 hours", "about 1 to 1.5 hours")

* Fails Grade 6 numeracy and plain-language goals: Many patients (especially those reading in a second language, older adults, or people under stress) misread "1.5 hours" as "1 hour 50 minutes" or struggle to convert ".25" and ".75" into minutes.
* Awkward when crossing the hour boundary: A wait of 45 minutes to 1 hour 20 minutes forces either mixed units ("45 minutes to about 1.5 hours"), confusing decimals ("0.75 to 1.5 hours"), or heavy rounding ("about 1 to 1.5 hours") that makes a 45-minute wait look like at least a full hour.
* Locale-specific punctuation: French (Canada) uses a decimal comma ("1,5") instead of a decimal point ("1.5"), adding extra formatting rules.
* Double hedging: The screen already labels the line as an estimate ("Estimated wait time:" / "Estimated time until you're called back:") and notes that it is simulated. Adding "about" inside the range repeats the hedge.

3. Problems with the chosen longer form ("1 hour 35 minutes to 2 hours 20 minutes", "45 minutes to 1 hour 20 minutes", "2 hours")

* Longer line length on small screens: "1 hour 35 minutes to 2 hours 20 minutes" is 39 characters and will wrap onto 2 or 3 lines on a 390 px phone screen at 150% text size, especially if preceded by a long label.
* Singular and plural grammar rules: Unlike the current "{low} to {high} minutes", the code must choose singular ("1 hour", "1 minute") versus plural ("2 hours", "35 minutes"), and in languages like Arabic, dual and plural forms as well.
* False precision if unrounded: Displaying arbitrary minutes like "1 hour 37 minutes" still implies minute-level accuracy on a rough estimate unless the calculation rounds multi-hour waits to the nearest 5 minutes.
* Requires changing the one-line template structure: Because a range can cross the hour ("45 minutes to 1 hour 20 minutes") or land on a whole hour ("2 hours"), one static "{low} to {high} minutes" string per language is no longer enough. Each language needs a range wrapper ("{low} to {high}") plus hour and minute unit forms to build each endpoint before joining them.

B. Chosen form rules and examples (all words marked "draft" until reviewed by a fluent speaker)

French (Canada), status: draft

* Word for hours: "heure" (singular), "heures" (plural). (Note: Canadian French short form would be "h" with a space, as in "1 h 35 min", not attached to digits.)
* Word for minutes: "minute" (singular), "minutes" (plural).
* Word order: Number before unit; hours before minutes; joined in a range as "{low} à {high}".
* Space between number and unit: Yes, always one space between the digit and the unit word.
* Unit changes for 1, 2, or 3 to 10: Changes for 0 and 1 (singular: "0 heure", "1 heure", "1 minute") versus 2 and above (plural with -s: "2 heures", "3 heures", "10 heures", "35 minutes", "45 minutes").
* Examples: 45 minutes: 45 minutes. 1 hour 35 minutes: 1 heure 35 minutes. 2 hours: 2 heures. Crossing the hour (45 minutes to 1 hour 20 minutes): 45 minutes à 1 heure 20 minutes.

Urdu, status: draft

* Word for hours: "گھنٹہ" (singular, 1), "گھنٹے" (plural, 2 or more; also the oblique form used directly before "سے" when there are no minutes).
* Word for minutes: "منٹ" (unchanged for all numbers).
* Word order: Right-to-left overall, with multi-digit numbers reading left-to-right; number before unit in reading order; hours before minutes; joined in a range as "{low} سے {high}".
* Space between number and unit: Yes, always one space between the digit and the Urdu word.
* Unit changes for 1, 2, or 3 to 10: Minutes ("منٹ") never changes for 1, 2, 3 to 10, or higher. Hours changes between 1 ("1 گھنٹہ") and 2 or more ("2 گھنٹے", "3 گھنٹے", "10 گھنٹے"). There is no separate dual form for 2.
* Examples: 45 minutes: 45 منٹ. 1 hour 35 minutes: 1 گھنٹہ 35 منٹ. 2 hours: 2 گھنٹے. Crossing the hour: 45 منٹ سے 1 گھنٹہ 20 منٹ.

Arabic (Modern Standard), status: draft

* Word for hours: "ساعة" (singular, used for 1 and for 11 and above), "ساعتان" / "ساعتين" (dual for 2), "ساعات" (plural for 3 to 10).
* Word for minutes: "دقيقة" (singular, used for 1 and for 11 and above), "دقيقتان" / "دقيقتين" (dual for 2), "دقائق" (plural for 3 to 10).
* Word order: Right-to-left overall, with multi-digit numbers reading left-to-right; for 3 and above, number comes before the unit in reading order; for 1 and 2, standard Arabic expresses the count through the noun/dual form (or "ساعة واحدة" for 1) without a leading digit; hours before minutes joined by "و" attached directly to the minutes part (no space after "و"); joined in a range as "من {low} إلى {high}".
* Space between number and unit: Yes, one space between the digit and the unit word ("45 دقيقة", "3 ساعات"). When "و" ("and") joins hours and minutes, there is a space before "و" and no space after "و" ("ساعة و35 دقيقة").
* Unit changes for 1, 2, or 3 to 10: Yes, Arabic has four forms. 1: singular noun without a leading digit, optionally with "واحدة" ("ساعة" or "ساعة واحدة"; "دقيقة" or "دقيقة واحدة"); if the app strictly requires a leading digit, "1 ساعة" and "1 دقيقة" are used as a UI compromise. 2 (dual): "ساعتان" / "دقيقتان" standalone, changing to "ساعتين" / "دقيقتين" after the prepositions "من" and "إلى" in a range (if a leading digit is enforced by code: "2 ساعة" / "2 دقيقة"). 3 to 10 (plural): "3 ساعات" to "10 ساعات", "3 دقائق" to "10 دقائق". 11 and above (back to singular): "11 ساعة", "35 دقيقة", "45 دقيقة".
* Examples: 45 minutes: 45 دقيقة. 1 hour 35 minutes: ساعة و35 دقيقة (or "ساعة واحدة و35 دقيقة"; if a leading digit is required by code: "1 ساعة و35 دقيقة"). 2 hours: ساعتان standalone, or ساعتين inside "من ... إلى ..." (if a leading digit is required by code: "2 ساعة"). Crossing the hour: من 45 دقيقة إلى ساعة و20 دقيقة.

Mandarin (Simplified), status: draft

* Word for hours: "小时" (no separate short form; avoid "点", which means o'clock).
* Word for minutes: "分钟" (keep full "分钟" rather than "分" so durations are not mistaken for clock times).
* Word order: Left-to-right; number before unit; hours before minutes; joined in a range as "{low} 到 {high}".
* Space between number and unit: Standard Chinese typography uses no space ("45分钟", "1小时35分钟", "2小时"), though the existing string in the app uses spaces around digits ("{low} 到 {high} 分钟"). Either keep spaces consistently ("45 分钟", "1 小时 35 分钟", "2 小时") or omit spaces throughout.
* Unit changes for 1, 2, or 3 to 10: No. Chinese units never change for 1, 2, 3 to 10, or higher. (In speech, 2 hours is read "liǎng xiǎoshí", but with digits 0-9 it is always written "2 小时" / "2小时".)
* Examples: 45 minutes: 45 分钟 (or 45分钟). 1 hour 35 minutes: 1 小时 35 分钟 (or 1小时35分钟). 2 hours: 2 小时 (or 2小时). Crossing the hour: 45 分钟 到 1 小时 20 分钟 (or 45分钟到1小时20分钟).

C. What a fluent reviewer must check first (all words remain "draft" until approved)

English, status: draft
* Mobile wrapping at 150% text size: Check the full label plus range (for example "Estimated wait time: 1 hour 35 minutes to 2 hours 20 minutes") on a 390 px screen to make sure it wraps cleanly without crowding the card.
* 5-minute rounding for waits over 1 hour: Confirm whether waits of 60 minutes or more should round to the nearest 5 minutes so the app never displays overly exact strings like "1 hour 1 minute to 1 hour 37 minutes".
* Screen-reader pacing: Test VoiceOver and TalkBack on "45 minutes to 1 hour 20 minutes" to confirm natural pauses between the two endpoints.

French (Canada), status: draft
* Connector between hours and minutes: Confirm whether Canadian patients find "1 heure 35 minutes" or "1 heure et 35 minutes" more natural and easier to scan at a Grade 6 level.
* Singular vs. plural edge cases: Verify that 1 takes singular ("1 heure", "1 minute"), 2 and above take plural ("2 heures", "35 minutes"), and 0 (if ever rendered) takes singular.
* Line wrapping on narrow screens: Check "Temps d'attente estimé : 1 heure 35 minutes à 2 heures 20 minutes" at Extra large text size to verify line breaks around "à".

Urdu, status: draft
* Case change before "سے" ("1 گھنٹہ" vs. "1 گھنٹے سے"): Check how a whole-hour lower bound reads in Urdu. Strictly, "گھنٹہ" inflects to "گھنٹے" directly before the postposition "سے" ("1 گھنٹے سے 2 گھنٹے"), whereas "1 گھنٹہ 35 منٹ سے" keeps "گھنٹہ" because "منٹ" precedes "سے". Confirm which form reads most naturally to patients.
* Connector between hours and minutes: Check whether "1 گھنٹہ 35 منٹ" or "1 گھنٹہ اور 35 منٹ" ("1 hour and 35 minutes") is clearer for patients.
* Right-to-left digit order and line height: Verify on a real phone that "45 منٹ سے 1 گھنٹہ 20 منٹ" keeps {low} on the right and {high} on the left without bidirectional swapping, and does not clip vertically at 150% text size.

Arabic (Modern Standard), status: draft
* Handling 1 and 2 under the digits rule: Decide whether to use natural grammatical Arabic without leading digits for 1 and 2 ("ساعة و35 دقيقة", "ساعتين") or enforce digits ("1 ساعة و35 دقيقة", "2 ساعة") to match the "digits 0-9" rule and simplify plural rules.
* Genitive dual case inside "من ... إلى ...": If using the Arabic dual form, confirm that "ساعتين" and "دقيقتين" (required after the prepositions "من" and "إلى") are used rather than nominative "ساعتان" and "دقيقتان".
* Four-way count agreement (1, 2, 3 to 10, 11+): Verify that counts 3 to 10 use plural ("3 ساعات", "5 دقائق") while 11 and above return to singular ("35 دقيقة", "45 دقيقة").
* Right-to-left bidirectional rendering: Test "من 45 دقيقة إلى ساعة و20 دقيقة" on iOS Safari and Android Chrome to confirm "من" stays with the lower bound on the right and "إلى" stays with the upper bound on the left.

Mandarin (Simplified), status: draft
* Keeping "分钟" after "小时": Confirm using "1 小时 35 分钟" rather than shortening to "1 小时 35 分" so patients do not confuse a wait duration with a clock time (1:35).
* Spacing around digits: Decide whether to keep spaces around digits ("1 小时 35 分钟", matching the existing "{low} 到 {high} 分钟") or remove spaces ("1小时35分钟") to match standard Simplified Chinese typography.
* Digit "2" before "小时": Confirm that "2 小时" (written with the digit 2 rather than "两小时") reads naturally to Mandarin speakers while keeping digits 0-9 consistent across languages.

### Claude's check (2026-11-15)

Checked against the code:
- Rounding is already done. `waitRange` in `lib/queue.ts` rounds `low` down and `high` up to 5 minutes, and `low` is at least 5. So "1 hour 37 minutes" cannot show, and the minutes part of an hour value is always 0, 5, 10, ... 55.
- Because of that, many grammar cases never happen. Minutes are never 1 or 2, so the French singular "minute", the Arabic singular and dual for minutes, and "1 دقيقة" never show. Minutes 5 and 10 take the Arabic plural "دقائق"; 15 to 55 take "دقيقة". Hours can be 1, 2, 3 to 10, or 11 and more.
- The English label is "Estimated time until you're called back:" (`lib/text/en.ts`), not "Estimated wait time:". The point about double hedging still holds.
- Gemini's answer follows the brief: A, B and C are there, with the 3 examples in each language.

Problems in the answer:
- The Arabic "UI compromise" forms "2 ساعة" and "2 دقيقة" are wrong grammar (a count of 2 takes the dual form). I do not use them. The choice for 1 and 2 hours is between the dual without a digit ("ساعتين") and a form such as "2 ساعات" that a fluent reviewer must check. This goes to the owner.
- The Urdu case change before "سے" means the low end needs its own word form ("1 گھنٹے سے" with no minutes). One "{low} سے {high}" line cannot do this unless the low end has its own hour word. The fluent reviewer must decide.
- The screen-reader claim about "1h" is not tested. It is a reason given by Gemini, not a checked fact.
- The French note on "1 h 35 min" (the official Canadian short form) shows that the short form is correct French; Gemini still chose the long form for clarity. That is a choice, not an error.

Decision for the owner: the long form ("1 hour 35 minutes to 2 hours 20 minutes") in all five languages, built from per-language hour and minute words, or keep minutes on the patient screen. The change touches `lib/text/`, `lib/` and `components/patient/`, so it starts in plan mode.
