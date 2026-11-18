# Gemini handoff: translate 3 changed lines (second pass)

Model: Gemini Hydrogen 4, High. Start a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

The first pass is in handoffs/2026-11-17-gemini-translate-equity-lines.md. After it, the owner changed 3 English lines (docs/decisions.md, 2026-11-17, last line).

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
