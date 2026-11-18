# Gemini handoff: translate the new and changed safety lines

Model: Gemini Hydrogen 4, High. Start a new chat. If you have no Gemini Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## What to paste into Gemini

Everything from "Prompt" to the end of this section.

### Prompt

You translate patient text for a concept prototype of a virtual emergency department waiting room in Canada. Low-acuity patients wait away from the hospital after a nurse sees them at triage, follow their place in line on their phone, and come back when staff call them. All data is synthetic.

The app has 5 languages: English (source), French, Urdu, Arabic and Mandarin (Simplified Chinese). The 4 non-English files are drafts. A fluent human reviewer checks them later, safety messages first.

Below are 15 English lines. Some are new. Some replace an old line. For each changed line, I give the old English and the old draft in each language, so you can keep the same words for the same things (for example the word each language already uses for "emergency department", "triage", "nurse", "desk" and "visit code").

Rules:

1. Plain words that a patient with a low reading level understands. Short sentences. No medical jargon. Do not add or drop any meaning, and do not soften an instruction.
2. Use straight quotes only (" and '), never curly quotes.
3. Keep "{n}" or other braces as they are (none are in this set).
4. "draft" (line 13) is a short tag shown after a language name in a menu, for example "Francais (brouillon)". Give only the word, no brackets.
5. Arabic and Urdu: right-to-left text, normal punctuation for that language.
6. Mandarin: Simplified Chinese, full-width punctuation.

Then find problems, do not confirm: list any English line that is unclear, too long, or hard to translate without a change of meaning, and say why.

Answer format: one block per language, as TypeScript key and value pairs, in the order below, then the list of problems.

### Lines

1. `announce.called` (read by a screen reader when staff call the patient)
   New English: "It is your turn. Please come back to the emergency department now."
   Old English: "You have been called back. Please head back to the emergency department now."
   Old fr: "Vous avez été rappelé. Veuillez retourner au service des urgences maintenant."
   Old ur: "آپ کو واپس بلایا گیا ہے۔ براہ کرم ابھی ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔"
   Old ar: "لقد تم استدعاؤك للعودة. يرجى العودة إلى قسم الطوارئ الآن."
   Old zh: "您已被叫回。请现在回到急诊室。"

2. `secondAlert` (shown when the patient has not answered a call)
   New English: "Please come back to the emergency department right now. Staff may call your phone."
   Old English: "Please return to the emergency department right now. Staff may try to reach you."
   Old fr: "Veuillez retourner au service des urgences immédiatement. Le personnel peut essayer de vous joindre."
   Old ur: "براہ کرم فوراً ایمرجنسی ڈیپارٹمنٹ واپس جائیں۔ عملہ آپ تک پہنچنے کی کوشش کر سکتا ہے۔"
   Old ar: "يرجى العودة إلى قسم الطوارئ في الحال. قد يحاول الموظفون الوصول إليك."
   Old zh: "请立即回到急诊室。工作人员可能会试图联系您。"

3. `patient.fromHomeHeading` (a patient who started the visit at home and has not been to triage)
   New English: "Status: Started from home, not seen by a nurse yet"
   Old English: "Status: Started from home, not yet triaged"
   Old fr: "Statut : Commencée depuis la maison, pas encore triée"
   Old ur: "سٹیٹس: گھر سے شروع کیا گیا، ابھی ٹرائیج نہیں ہوا"
   Old ar: "الحالة: بدأت من المنزل، لم يتم الفرز بعد"
   Old zh: "状态：在家开始，尚未分诊"

4. `patient.fromHomeText[1]`
   New English: "This app does not check you in at the hospital or let you wait away from the hospital."
   Old English: "This app does not register you or give permission to wait off-site."
   Old fr: "Cette application ne vous inscrit pas ni ne vous donne la permission d'attendre hors site."
   Old ur: "یہ ایپ آپ کو رجسٹر نہیں کرتی یا آف سائٹ انتظار کرنے کی اجازت نہیں دیتی۔"
   Old ar: "هذا التطبيق لا يسجلك أو يمنحك الإذن بالانتظار خارج الموقع."
   Old zh: "此应用程序不会为您注册或允许您在院外候诊。"

5. `patient.fromHomeText[2]`
   New English: "When you get to the emergency department, check in at the front desk and show this visit code. Only staff can let you wait away from the hospital."
   Old English: "If you go to the emergency department, follow its normal steps. Show this visit code to staff. Only staff can approve off-site waiting."
   Old fr: "Si vous vous rendez au service des urgences, suivez ses étapes normales. Montrez ce code de visite au personnel. Seul le personnel peut approuver l'attente hors site."
   Old ur: "اگر آپ ایمرجنسی ڈیپارٹمنٹ جاتے ہیں، تو اس کے عام مراحل پر عمل کریں۔ عملے کو یہ وزٹ کوڈ دکھائیں۔ صرف عملہ آف سائٹ انتظار کی منظوری دے سکتا ہے۔"
   Old ar: "إذا ذهبت إلى قسم الطوارئ، فاتبع خطواته المعتادة. اعرض رمز الزيارة هذا للموظفين. الموظفون فقط هم من يمكنهم الموافقة على الانتظار خارج الموقع."
   Old zh: "如果您去急诊室，请遵循其正常步骤。向工作人员出示此就诊代码。只有工作人员才能批准院外候诊。"

6. `patient.reassessHeading` (a heading, no full stop)
   New English: "Please go to the nurse check-in desk"
   Old English: "Please go to the triage desk"
   Old fr: "Veuillez vous rendre au bureau de triage"
   Old ur: "براہ کرم ٹرائیج ڈیسک پر جائیں"
   Old ar: "يرجى الذهاب إلى مكتب الفرز"
   Old zh: "请前往分诊台"

7. `announce.reassess` (same as line 6, read by a screen reader, with a full stop)
   New English: "Please go to the nurse check-in desk."
   Old English: "Please go to the triage desk."
   (Old drafts: the same as line 6 with a full stop.)

8. `patient.reassessText`
   New English: "A nurse needs to check you again before you go back in line."
   Old English: "A nurse needs to check you again. This happens before you rejoin the line."
   Old fr: "Une infirmière doit vous examiner à nouveau. Cela se produit avant que vous ne rejoigniez la file d'attente."
   Old ur: "ایک نرس کو آپ کو دوبارہ چیک کرنے کی ضرورت ہے۔ یہ آپ کے دوبارہ لائن میں شامل ہونے سے پہلے ہوتا ہے۔"
   Old ar: "تحتاج ممرضة إلى فحصك مرة أخرى. يحدث هذا قبل أن تعود للانضمام إلى الطابور."
   Old zh: "护士需要再次为您检查。这将在您重新加入队伍之前进行。"

9. `patient.notSaved` (after the patient taps "I'm on my way" and the save fails)
   New English: "Your answer did not save. Staff do not know you are on your way. Please try again or go to the desk."
   Old English: "Your answer did not save. Staff do not know you tapped it. Please try again or go to the desk."
   Old fr: "Votre réponse n'a pas été enregistrée. Le personnel ne sait pas que vous avez appuyé dessus. Veuillez réessayer ou vous rendre au bureau."
   Old ur: "آپ کا جواب محفوظ نہیں ہوا۔ عملہ نہیں جانتا کہ آپ نے اسے دبایا ہے۔ براہ کرم دوبارہ کوشش کریں یا ڈیسک پر جائیں۔"
   Old ar: "لم يتم حفظ إجابتك. الموظفون لا يعلمون أنك نقرت عليها. يرجى المحاولة مرة أخرى أو الذهاب إلى المكتب."
   Old zh: "您的回答未保存。工作人员不知道您点击了它。请重试或去前台。"

10. `expiredText` (a visit started at home that no nurse checked in within 6 hours)
    New English: "You started this visit over 6 hours ago. A nurse never checked you in. Staff no longer expect you to arrive."
    Old English: "You started this visit over 6 hours ago. It was never checked in at triage. Staff no longer expect you to arrive."
    Old fr: "Vous avez commencé cette visite il y a plus de 6 heures. Elle n'a jamais été enregistrée au triage. Le personnel ne s'attend plus à ce que vous arriviez."
    Old ur: "آپ نے یہ وزٹ 6 گھنٹے سے زیادہ پہلے شروع کیا تھا۔ اسے کبھی بھی ٹرائیج میں چیک ان نہیں کیا گیا۔ عملہ اب آپ کے آنے کی توقع نہیں رکھتا۔"
    Old ar: "لقد بدأت هذه الزيارة منذ أكثر من 6 ساعات. لم يتم تسجيلها مطلقًا في الفرز. لم يعد الموظفون يتوقعون وصولك."
    Old zh: "您在 6 小时前开始了这次就诊。它从未在分诊处登记过。工作人员不再期望您的到来。"

11. `patient.replacedLinkHeading` (new; staff gave the patient a new link, or closed the visit, so the old link no longer works)
    English: "This visit link is no longer active"

12. `patient.replacedLinkText` (new; under line 11)
    English: "Please ask the emergency department desk."

13. `language.draftTag` (new; see rule 4)
    English: "draft"
    For reference, the current draft notice in each language:
    fr: "Cette traduction est un brouillon. Un locuteur courant ne l'a pas encore vérifiée."
    ur: "یہ ترجمہ ایک ڈرافٹ ہے۔ کسی روانی سے بولنے والے نے ابھی اسے چیک نہیں کیا ہے۔"
    ar: "هذه الترجمة عبارة عن مسودة. لم يقم متحدث طليق بمراجعتها بعد."
    zh: "此翻译是草稿。流利的母语人士尚未检查过它。"

14. `language.interpreter` (new; under the language menu)
    English: "Need another language? Ask the emergency department desk for a free interpreter, or wait inside."

15. `announce.expired` (new; read by a screen reader when the visit request expires)
    English: "This visit request has expired. If you still need care, please go to the emergency department desk."

## What to bring back

Paste Gemini's whole answer into the Claude Code chat. Claude adds it below under "Response", checks it, and then puts the lines into the 4 language files.

## Not checked

- None of these lines is in a language file yet. The English lines are the owner's choice from docs/decisions.md (2026-11-17, last line), not yet in lib/text/en.ts.
