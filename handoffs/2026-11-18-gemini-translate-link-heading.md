# Gemini translation: one changed heading (2026-11-18)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Text to paste into Gemini

You translate one line of patient text for a concept prototype of a virtual emergency department waiting room in Ontario, Canada. The patient reads it on their phone. No real patient data is in this request.

The line is a heading. It shows when the patient's visit link does not open a visit. This can happen for 2 reasons: hospital staff made a new link (the old one stops), or the patient typed the link from the paper slip with a mistake. The app cannot tell these apart. Under the heading, the patient reads "Please ask the emergency department desk for help."

English heading (new): "This visit link does not work or is no longer active"

The old English heading was "This visit link is no longer active". The old drafts were:

- French: "Ce lien de visite n'est plus actif"
- Urdu: "یہ وزٹ لنک اب فعال نہیں ہے"
- Arabic: "رابط الزيارة هذا لم يعد نشطًا"
- Mandarin (Simplified): "此就诊链接已失效"

Please write the new heading in French, Urdu, Arabic and Mandarin (Simplified). Rules:

1. Plain words, about grade 6 reading level. No blame on the patient.
2. Straight quotes and apostrophes only (' and "), no curly quotes. No em dashes.
3. Keep the word for "visit link" the same as in the old draft, so the screens match.
4. Find problems: if a word in a language reads as "broken" in a way that scares the patient, say so and give a calmer option.

Give one line per language, then any problems you found.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-18. Pasted by the owner:

* French: "Ce lien de visite ne fonctionne pas ou n'est plus actif"
* Urdu: "یہ وزٹ لنک کام نہیں کر رہا یا اب فعال نہیں ہے"
* Arabic: "رابط الزيارة هذا لا يعمل أو لم يعد نشطًا"
* Mandarin (Simplified): "此就诊链接无法使用或已失效"

### Problems found and calmer options

* Urdu ("خراب" and "فعال"):
  * Problem: Translating "broken" or "does not work" as "خراب" (kharaab) in Urdu is risky in a hospital setting because "خراب" also means "bad", "ruined", or "in critical/worsening condition" (as in a patient's health deteriorating). Also, "فعال" (fa'aal, "active") from the old draft is formal, bookish Urdu above a grade 6 reading level and can sound like the patient's visit itself was cancelled.
  * Calmer option: "یہ وزٹ لنک کام نہیں کر رہا یا اب استعمال میں نہیں ہے" ("This visit link is not working or is no longer in use"). It uses plain everyday words and avoids both "خراب" and "فعال".
* Mandarin (Simplified) ("坏了" / "损坏" and "已失效"):
  * Problem: Using words like "坏了" (huai le, "broken/spoiled") or "损坏" (sunhuai, "damaged/corrupted") makes it sound like the hospital system crashed or the patient's record was damaged. In addition, "已失效" (yi shixiao, "void/invalidated") from the old draft is used for voided tickets or cancelled registrations, which can frighten an anxious patient into thinking they lost their place in line, and "此" (ci) is formal written Chinese rather than grade 6 plain language.
  * Calmer option: "这个就诊链接无法打开或已经不能用了" ("This visit link cannot be opened or can no longer be used"). It replaces formal "此" with everyday "这个" and replaces "已失效" with a calmer explanation that the link simply cannot be used anymore.
* Arabic ("معطّل" / "تالف" and "لم يعد نشطًا"):
  * Problem: Using "معطّل" (mu'attal, "out of service/broken down") or "تالف" (taalif, "damaged/corrupted") makes it sound like the emergency department's system is broken. Keeping "لا يعمل" ("does not work") avoids that issue, though "لم يعد نشطًا" ("is no longer active") from the old draft can still sound slightly clinical, as if the patient's visit itself was deactivated.
  * Calmer option: "رابط الزيارة هذا لا يعمل أو لم يعد صالحًا للاستخدام" ("This visit link does not work or is no longer valid for use"). It keeps the focus clearly on the link rather than the patient's visit status.
* French ("brisé" / "cassé" and "actif"):
  * Problem: Using "brisé" or "cassé" (common Canadian French words for "broken") can sound like the app or phone is damaged. "Ne fonctionne pas" is calm and neutral, though "n'est plus actif" from the old draft is slightly formal for a grade 6 reading level.
  * Calmer option: "Ce lien de visite ne fonctionne pas ou ne sert plus" ("This visit link does not work or is no longer used") if you want an even simpler alternative to "n'est plus actif".

## Claude's check

- Rule 3 (same word for "visit link"): all 4 main lines and all 4 calmer options keep the old word: "lien de visite", "وزٹ لنک", "رابط الزيارة", "就诊链接". Checked against line 69 of `lib/text/fr.ts`, `ur.ts`, `ar.ts`, `zh.ts`.
- The words Gemini calls a problem in the old drafts ("فعال", "نشط", "已失效", "actif") are only on line 69 in each file (grep of the 4 files, 2026-11-18). A calmer option changes no other screen.
- Rule 2: the French apostrophe is straight. No curly quotes, no em dashes.
- The "broken" words Gemini warns about ("خراب", "معطّل", "تالف", "坏了", "损坏", "brisé", "cassé") are in none of the 8 lines.
- The Mandarin calmer option says "无法打开" (cannot be opened). The page does open; it is the visit that does not open. "无法使用" (cannot be used) in the main line is closer to what happens.
- I cannot check the meaning or the reading level myself. A fluent human reviewer must approve these lines before real use, as the Phase 3 plan says.
