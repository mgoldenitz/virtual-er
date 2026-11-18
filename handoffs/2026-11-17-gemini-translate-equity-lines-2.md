# Gemini handoff: translate 3 changed lines (second pass)

Model: Gemini Hydrogen 4, High. Start a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

The first pass is in handoffs/archive/2026-11-17-gemini-translate-equity-lines.md. After it, the owner changed 3 English lines (docs/decisions.md, 2026-11-17, last line).

## What to paste into Gemini

Everything from "Prompt" to the end of this section.

### Prompt

You translate patient text for a concept prototype of a virtual emergency department waiting room in Canada. All data is synthetic. The 4 non-English languages are drafts that a fluent human reviewer checks later.

Below are 3 English lines that changed. For each, I give the earlier draft of the same line in French, Urdu, Arabic and Mandarin (Simplified Chinese). Keep the same words for the same things. Change only what the new English changes.

Rules: plain words for a low reading level; do not add, drop or soften meaning; straight quotes only; Mandarin uses full-width punctuation.

Then find problems, do not confirm: say if a new English line is unclear or hard to translate, and why. Also say if any earlier draft below has a fault.

Answer format: one block per language, as TypeScript key and value pairs, in the order below, then the list of problems.

### Lines

1. `expiredText` (a visit started at home that no nurse saw within 6 hours)
   New English: "You started this visit over 6 hours ago. No nurse has seen you for this visit. Staff no longer expect you to arrive."
   Earlier fr: "Vous avez commencé cette visite il y a plus de 6 heures. Aucune infirmière ne vous a enregistré. Le personnel ne s'attend plus à ce que vous arriviez."
   Earlier ur: "آپ نے یہ وزٹ 6 گھنٹے سے زیادہ پہلے شروع کیا تھا۔ کسی نرس نے آپ کو چیک ان نہیں کیا۔ عملہ اب آپ کے آنے کی توقع نہیں رکھتا۔"
   Earlier ar: "لقد بدأت هذه الزيارة منذ أكثر من 6 ساعات. لم تقم أي ممرضة بتسجيلك. لم يعد الموظفون يتوقعون وصولك."
   Earlier zh: "您在6小时前开始了这次就诊。一直没有护士为您登记。工作人员不再预计您会前来。" (Note: "6小时前" says "6 hours ago", not "over 6 hours ago". Please fix this too.)

2. `patient.replacedLinkText` (under the heading "This visit link is no longer active")
   New English: "Please ask the emergency department desk for help."
   Earlier fr: "Veuillez demander au bureau du service des urgences."
   Earlier ur: "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک سے پوچھیں۔"
   Earlier ar: "يرجى سؤال مكتب قسم الطوارئ."
   Earlier zh: "请询问急诊室前台。"

3. `language.interpreter` (one line under the language menu)
   New English: "Need another language? Ask the emergency department desk for a free interpreter."
   Earlier fr: "Besoin d'une autre langue ? Demandez un interprète gratuit au bureau du service des urgences, ou attendez à l'intérieur."
   Earlier ur: "کسی اور زبان کی ضرورت ہے؟ مفت ترجمان کے لیے ایمرجنسی ڈیپارٹمنٹ ڈیسک سے کہیں، یا اندر انتظار کریں۔"
   Earlier ar: "هل تحتاج إلى لغة أخرى؟ اطلب مترجمًا فوريًا مجانيًا من مكتب قسم الطوارئ، أو انتظر في الداخل."
   Earlier zh: "需要其他语言？请向急诊室前台申请免费翻译人员，或在里面等候。"

## What to bring back

Paste Gemini's whole answer into the Claude Code chat. Claude adds it below under "Response" and checks it.

## Not checked

- These lines are not in a language file yet.

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-17. Pasted by the owner, as given.

**French (fr)**

```ts
"expiredText": "Vous avez commencé cette visite il y a plus de 6 heures. Aucune infirmière ne vous a vu pour cette visite. Le personnel ne s'attend plus à ce que vous arriviez.",
"patient.replacedLinkText": "Veuillez demander de l'aide au bureau du service des urgences.",
"language.interpreter": "Besoin d'une autre langue ? Demandez un interprète gratuit au bureau du service des urgences.",
```

**Urdu (ur)**

```ts
"expiredText": "آپ نے یہ وزٹ 6 گھنٹے سے زیادہ پہلے شروع کیا تھا۔ کسی نرس نے اس وزٹ کے لیے آپ کو نہیں دیکھا ہے۔ عملہ اب آپ کے آنے کی توقع نہیں رکھتا۔",
"patient.replacedLinkText": "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک سے مدد مانگیں۔",
"language.interpreter": "کسی اور زبان کی ضرورت ہے؟ مفت ترجمان کے لیے ایمرجنسی ڈیپارٹمنٹ ڈیسک سے کہیں۔",
```

**Arabic (ar)**

```ts
"expiredText": "لقد بدأت هذه الزيارة منذ أكثر من 6 ساعات. لم تَرَكَ أي ممرضة لهذه الزيارة. لم يعد الموظفون يتوقعون وصولك.",
"patient.replacedLinkText": "يرجى طلب المساعدة من مكتب قسم الطوارئ.",
"language.interpreter": "هل تحتاج إلى لغة أخرى؟ اطلب مترجمًا فوريًا مجانيًا من مكتب قسم الطوارئ.",
```

**Mandarin (zh)**

```ts
"expiredText": "您在6个多小时前开始了这次就诊。没有护士为这次就诊看过您。工作人员不再预计您会前来。",
"patient.replacedLinkText": "请向急诊室前台寻求帮助。",
"language.interpreter": "需要其他语言？请向急诊室前台申请免费翻译人员。",
```

### Problems Found

#### 1. New English Lines

- `expiredText`: "You started this visit over 6 hours ago. No nurse has seen you for this visit. Staff no longer expect you to arrive."
  - Ambiguity of "seen you": in everyday English, "seen you" can mean either physically spotting the patient in the waiting room or formally examining/triaging them. Translators in Mandarin (`看过您` vs. `见到您`), Arabic (`تَرَكَ` vs. `تفحصك`), and French (`vu` vs. `examiné`) have to pick between a visual verb and a clinical assessment verb. If a patient walked past a nurse or spoke briefly at reception without being triaged, "No nurse has seen you" can sound inaccurate.
  - Tense mismatch ("started" vs. "has seen"): sentence 1 uses simple past ("started this visit over 6 hours ago") and sentence 3 confirms the visit is closed ("Staff no longer expect you to arrive"), whereas sentence 2 uses present perfect ("No nurse has seen you"), which implies the visit is still active. Simple past ("No nurse saw you for this visit") fits the expired state better and maps more cleanly into aspect-based languages like Mandarin and Arabic.
  - Repetition of "this visit": using "this visit" in two consecutive sentences ("started this visit... for this visit") adds prepositional bulk in Urdu (`اس وزٹ کے لیے`) and Arabic (`لهذه الزيارة`).
  - Logical tension for home-started visits: because the app explicitly tells patients that starting from home does not check them in at the hospital, stating "Staff no longer expect you to arrive" implies staff were previously expecting them at a set time.
- `patient.replacedLinkText`: "Please ask the emergency department desk for help."
  - Unspecified action ("for help"): shown under "This visit link is no longer active", telling patients only to "ask ... for help" does not explain what to ask for (a new link, a new paper slip, or checking whether their visit is still open). Patients under stress or with limited English may not know how to explain why their screen stopped working when they reach the counter.
  - Technical term in the paired heading ("visit link"): patients who opened the page by scanning a QR code on a printed slip may not understand what a "visit link" is.
- `language.interpreter`: "Need another language? Ask the emergency department desk for a free interpreter."
  - Language barrier catch-22: a patient who cannot read English (or one of the five supported languages) still has to read this instruction in a language they may not understand in order to learn that a free interpreter is available. In addition, Canadian emergency departments typically sign desks as "Registration", "Check-in", or "Triage" rather than "emergency department desk".
  - In-person vs. remote interpretation: "Ask ... for a free interpreter" can lead patients to expect an in-person interpreter beside them, whereas many emergency departments provide phone or tablet interpretation; "free help in your language" or "free interpreter service" avoids overpromising an in-person person.

#### 2. Faults in the Earlier Drafts

- Mandarin (`zh`) `expiredText` dropped "over": `"您在6小时前开始了这次就诊。"` meant "You started this visit 6 hours ago" rather than "over 6 hours ago" (fixed above to `"6个多小时前"`). The earlier draft also added `"一直"` ("all along"), which was not in the English source, and used `"登记"` ("register"), which sounds like clerical registration rather than nurse intake.
- French (`fr`), Urdu (`ur`), and Arabic (`ar`) `expiredText` translated nurse intake as clerical registration: earlier `fr` (`"ne vous a enregistré"`), `ur` (`"چیک ان نہیں کیا"`), and `ar` (`"بتسجيلك"`) all rendered the old English `"checked you in"` as front-desk registration rather than clinical intake. Updating to "seen you" (`vu`, `دیکھا`, `تَرَكَ`, `看过您`) removes that false administrative meaning.
- French (`fr`) `expiredText` and `language.interpreter` default to masculine forms: `"ne vous a vu"` uses the unmarked masculine past participle (feminine would be `"vue"`), and `"un interprète"` uses the masculine article, which a fluent Canadian French reviewer should check against the rest of the file's gender convention.
- Arabic (`ar`) `expiredText` homograph risk without vowel marks: in unvocalized Arabic, `"لم ترك"` ("did not see you", jussive of `رأى` + `-ك`) looks identical to `"لم تترك"` / `"ترك"` ("left / abandoned"). Adding diacritics (`"لم تَرَكَ"`) prevents patients from misreading the line as "No nurse left you".
- Urdu (`ur`), Arabic (`ar`), and Mandarin (`zh`) `patient.replacedLinkText` used "ask a question" verbs: because the earlier English read `"Please ask the emergency department desk."` with no object, the earlier drafts used `"پوچھیں"` (pūchheṅ) in Urdu, `"سؤال"` (su'āl) in Arabic, and `"询问"` (xúnwèn) in Mandarin, all of which mean "ask a question" and cannot grammatically take "help" as an object, requiring a verb change to `"مدد مانگیں"`, `"طلب المساعدة"`, and `"寻求帮助"`.
- All four earlier drafts of `language.interpreter` included the illogical `", or wait inside"` option: translating `", or wait inside"` (`"ou attendez à l'intérieur"`, `"یا اندر انتظار کریں"`, `"أو انتظر في الداخل"`, `"或在里面等候"`) made waiting inside sound like a substitute for an interpreter rather than an alternative to using the app; removing it in the new English resolves this across all four languages.
