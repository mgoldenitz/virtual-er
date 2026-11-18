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

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-17. Pasted by the owner, as given.

**French (`fr`)**

```ts
"announce.called": "C'est votre tour. Veuillez revenir au service des urgences maintenant.",
"secondAlert": "Veuillez revenir au service des urgences immédiatement. Le personnel peut appeler votre téléphone.",
"patient.fromHomeHeading": "Statut : Commencée depuis la maison, pas encore vue par une infirmière",
"patient.fromHomeText[1]": "Cette application ne vous enregistre pas à l'hôpital et ne vous permet pas d'attendre hors de l'hôpital.",
"patient.fromHomeText[2]": "Quand vous arrivez au service des urgences, enregistrez-vous au bureau d'accueil et montrez ce code de visite. Seul le personnel peut vous permettre d'attendre hors de l'hôpital.",
"patient.reassessHeading": "Veuillez vous rendre au bureau d'enregistrement des infirmières",
"announce.reassess": "Veuillez vous rendre au bureau d'enregistrement des infirmières.",
"patient.reassessText": "Une infirmière doit vous examiner de nouveau avant que vous retourniez dans la file d'attente.",
"patient.notSaved": "Votre réponse n'a pas été enregistrée. Le personnel ne sait pas que vous êtes en route. Veuillez réessayer ou vous rendre au bureau.",
"expiredText": "Vous avez commencé cette visite il y a plus de 6 heures. Aucune infirmière ne vous a enregistré. Le personnel ne s'attend plus à ce que vous arriviez.",
"patient.replacedLinkHeading": "Ce lien de visite n'est plus actif",
"patient.replacedLinkText": "Veuillez demander au bureau du service des urgences.",
"language.draftTag": "brouillon",
"language.interpreter": "Besoin d'une autre langue ? Demandez un interprète gratuit au bureau du service des urgences, ou attendez à l'intérieur.",
"announce.expired": "Cette demande de visite a expiré. Si vous avez toujours besoin de soins, veuillez vous rendre au bureau du service des urgences.",
```

**Urdu (`ur`)**

```ts
"announce.called": "اب آپ کی باری ہے۔ براہ کرم ابھی ایمرجنسی ڈیپارٹمنٹ واپس آ جائیں۔",
"secondAlert": "براہ کرم فوراً ایمرجنسی ڈیپارٹمنٹ واپس آ جائیں۔ عملہ آپ کے فون پر کال کر سکتا ہے۔",
"patient.fromHomeHeading": "سٹیٹس: گھر سے شروع کیا گیا، ابھی نرس نے نہیں دیکھا",
"patient.fromHomeText[1]": "یہ ایپ آپ کو ہسپتال میں چیک ان نہیں کرتی اور نہ ہی ہسپتال سے دور انتظار کرنے کی اجازت دیتی ہے۔",
"patient.fromHomeText[2]": "جب آپ ایمرجنسی ڈیپارٹمنٹ پہنچیں، تو فرنٹ ڈیسک پر چیک ان کریں اور یہ وزٹ کوڈ دکھائیں۔ صرف عملہ ہی آپ کو ہسپتال سے دور انتظار کرنے کی اجازت دے سکتا ہے۔",
"patient.reassessHeading": "براہ کرم نرس چیک ان ڈیسک پر جائیں",
"announce.reassess": "براہ کرم نرس چیک ان ڈیسک پر جائیں۔",
"patient.reassessText": "دوبارہ لائن میں جانے سے پہلے ایک نرس کو آپ کو دوبارہ چیک کرنے کی ضرورت ہے۔",
"patient.notSaved": "آپ کا جواب محفوظ نہیں ہوا۔ عملہ نہیں جانتا کہ آپ راستے میں ہیں۔ براہ کرم دوبارہ کوشش کریں یا ڈیسک پر جائیں۔",
"expiredText": "آپ نے یہ وزٹ 6 گھنٹے سے زیادہ پہلے شروع کیا تھا۔ کسی نرس نے آپ کو چیک ان نہیں کیا۔ عملہ اب آپ کے آنے کی توقع نہیں رکھتا۔",
"patient.replacedLinkHeading": "یہ وزٹ لنک اب فعال نہیں ہے",
"patient.replacedLinkText": "براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک سے پوچھیں۔",
"language.draftTag": "ڈرافٹ",
"language.interpreter": "کسی اور زبان کی ضرورت ہے؟ مفت ترجمان کے لیے ایمرجنسی ڈیپارٹمنٹ ڈیسک سے کہیں، یا اندر انتظار کریں۔",
"announce.expired": "اس وزٹ کی درخواست کی میعاد ختم ہو گئی ہے۔ اگر آپ کو اب بھی دیکھ بھال کی ضرورت ہے، تو براہ کرم ایمرجنسی ڈیپارٹمنٹ ڈیسک پر جائیں۔",
```

**Arabic (`ar`)**

```ts
"announce.called": "حان دورك. يرجى العودة إلى قسم الطوارئ الآن.",
"secondAlert": "يرجى العودة إلى قسم الطوارئ في الحال. قد يتصل الموظفون بهاتفك.",
"patient.fromHomeHeading": "الحالة: بدأت من المنزل، لم تفحصك ممرضة بعد",
"patient.fromHomeText[1]": "هذا التطبيق لا يسجلك في المستشفى ولا يسمح لك بالانتظار خارج المستشفى.",
"patient.fromHomeText[2]": "عندما تصل إلى قسم الطوارئ، سجل في مكتب الاستقبال واعرض رمز الزيارة هذا. الموظفون فقط هم من يمكنهم السماح لك بالانتظار خارج المستشفى.",
"patient.reassessHeading": "يرجى الذهاب إلى مكتب تسجيل الممرضات",
"announce.reassess": "يرجى الذهاب إلى مكتب تسجيل الممرضات.",
"patient.reassessText": "تحتاج ممرضة إلى فحصك مرة أخرى قبل أن تعود إلى الطابور.",
"patient.notSaved": "لم يتم حفظ إجابتك. الموظفون لا يعلمون أنك في طريقك. يرجى المحاولة مرة أخرى أو الذهاب إلى المكتب.",
"expiredText": "لقد بدأت هذه الزيارة منذ أكثر من 6 ساعات. لم تقم أي ممرضة بتسجيلك. لم يعد الموظفون يتوقعون وصولك.",
"patient.replacedLinkHeading": "رابط الزيارة هذا لم يعد نشطًا",
"patient.replacedLinkText": "يرجى سؤال مكتب قسم الطوارئ.",
"language.draftTag": "مسودة",
"language.interpreter": "هل تحتاج إلى لغة أخرى؟ اطلب مترجمًا فوريًا مجانيًا من مكتب قسم الطوارئ، أو انتظر في الداخل.",
"announce.expired": "انتهت صلاحية طلب هذه الزيارة. إذا كنت لا تزال بحاجة إلى رعاية، يرجى الذهاب إلى مكتب قسم الطوارئ.",
```

**Mandarin (`zh`)**

```ts
"announce.called": "轮到您了。请现在回到急诊室。",
"secondAlert": "请立即回到急诊室。工作人员可能会拨打您的电话。",
"patient.fromHomeHeading": "状态：在家开始，还没有护士看过您",
"patient.fromHomeText[1]": "此应用不会为您在医院登记，也不会让您在医院外等候。",
"patient.fromHomeText[2]": "当您到达急诊室时，请在前台登记并出示此就诊代码。只有工作人员才能让您在医院外等候。",
"patient.reassessHeading": "请前往护士登记台",
"announce.reassess": "请前往护士登记台。",
"patient.reassessText": "在您重新排队之前，护士需要再次为您检查。",
"patient.notSaved": "您的回答未保存。工作人员不知道您正在路上。请重试或前往前台。",
"expiredText": "您在6小时前开始了这次就诊。一直没有护士为您登记。工作人员不再预计您会前来。",
"patient.replacedLinkHeading": "此就诊链接已失效",
"patient.replacedLinkText": "请询问急诊室前台。",
"language.draftTag": "草稿",
"language.interpreter": "需要其他语言？请向急诊室前台申请免费翻译人员，或在里面等候。",
"announce.expired": "此就诊请求已过期。如果您仍需要护理，请前往急诊室前台。",
```

### Problems in the English Lines

- Line 2 (`secondAlert`): "Please come back to the emergency department right now. Staff may call your phone."
  - "Call" collides with the app's recall term: across the interface, "called" means being summoned back to the desk, whereas here "call your phone" means a telephone call. In French (`appeler`), Urdu (`کال کرنا` vs. `بلانا`), and Arabic (`يتصل` vs. `يستدعي`), translators have to switch verbs so patients do not misread it as an app alert.
  - Weak modal ("may"): under stress, "Staff may call your phone" can read as permission ("staff are allowed to") rather than a warning ("staff might telephone you").
- Line 3 (`patient.fromHomeHeading`): "Status: Started from home, not seen by a nurse yet"
  - Too long for a mobile heading: at 51 characters, it expands to 70 characters in French (`Statut : Commencée depuis la maison, pas encore vue par une infirmière`) and wraps across multiple lines at 150% text size on narrow phones.
  - Omitted grammatical subject: dropping the subject ("Started from home...") forces gendered languages like French and Arabic to guess whether the implied subject is the visit (feminine) or the patient (masculine/feminine).
- Lines 4 and 5 (`patient.fromHomeText[1]` and `[2]`): "This app does not check you in at the hospital or let you wait away from the hospital." / "When you get to the emergency department, check in at the front desk and show this visit code. Only staff can let you wait away from the hospital."
  - Wordy and repetitive: shown back-to-back on the same screen, these two lines repeat "at the hospital" / "away from the hospital" three times in 43 words, creating a dense block at large text sizes.
  - "Check in" shifts meaning across the set: English uses "check in" for hospital registration (line 4), reception arrival (line 5), and nurse triage intake (lines 6, 7, and 10). French, Arabic, and Mandarin do not have one everyday verb that spans both front-desk registration and clinical nurse intake, forcing a vocabulary split.
  - Vague "let you wait": "Only staff can let you wait away from the hospital" sounds like personal permission rather than clinical approval after an assessment.
- Lines 6 and 7 (`patient.reassessHeading` and `announce.reassess`): "Please go to the nurse check-in desk" / "Please go to the nurse check-in desk."
  - Unclear real-world hospital sign: replacing "triage desk" removes medical jargon, but Canadian emergency departments post signs for "Triage" or "Registration / Check-in", not "Nurse check-in desk". Patients looking for that exact sign may not know which window to approach.
  - Ambiguous noun stack in translation: compound phrases like "nurse check-in desk" translate literally into French (`bureau d'enregistrement des infirmières`), Urdu (`نرس چیک ان ڈیسک`), and Arabic (`مكتب تسجيل الممرضات`), where they can be misread as the desk where nurses clock in for their shift.
- Line 8 (`patient.reassessText`): "A nurse needs to check you again before you go back in line."
  - "Check" changes meaning from lines 4-7: in lines 4-7, "check in" means administrative registration, while "check you again" here means a clinical examination. In Arabic (`فحص`), Mandarin (`检查`), and Urdu (`چیک`), using a clinical verb here weakens the link to the "nurse check-in desk" in lines 6-7.
- Line 9 (`patient.notSaved`): "Your answer did not save. Staff do not know you are on your way. Please try again or go to the desk."
  - Unclear noun ("Your answer"): the patient tapped an action button ("I'm on my way") rather than answering a question, so "Your answer" can confuse patients who do not think of tapping a button as giving an answer.
- Line 10 (`expiredText`): "You started this visit over 6 hours ago. A nurse never checked you in. Staff no longer expect you to arrive."
  - Blame-sounding phrasing ("A nurse never checked you in"): when a patient started a visit from home and simply never went to the hospital, saying "A nurse never checked you in" makes it sound like a nurse neglected to see them.
  - Contradictory expectation: if the patient never went to the hospital (per line 4), stating "Staff no longer expect you to arrive" implies staff were previously waiting for them.
- Lines 11 and 12 (`patient.replacedLinkHeading` and `patient.replacedLinkText`): "This visit link is no longer active" / "Please ask the emergency department desk."
  - Incomplete instruction in line 12: "Please ask the emergency department desk" leaves out what to ask for (a new link, a new paper slip, or whether the visit was closed).
  - Technical term ("visit link"): patients who opened the page by scanning a QR code on a paper slip may not understand what a "visit link" is.
- Line 13 (`language.draftTag`): "draft"
  - Context-free single word: translating a bare tag without sentence context risks grammatical gender/number mismatch when appended to language names, and low-literacy patients may not understand what "(draft)" means inside a dropdown menu before seeing the full notice.
- Line 14 (`language.interpreter`): "Need another language? Ask the emergency department desk for a free interpreter, or wait inside."
  - Illogical "or" pairing: combining "Ask the emergency department desk for a free interpreter" with ", or wait inside" makes waiting inside sound like a substitute for an interpreter rather than an alternative to using the English app.
  - Too long for a dropdown helper line: at 105 characters (and over 120 characters in French and Arabic), it wraps into several lines directly under the language menu on mobile screens.
- Line 15 (`announce.expired`): "This visit request has expired. If you still need care, please go to the emergency department desk."
  - Terminology shift ("visit request" vs. "visit"): other lines refer to "this visit" or "visit link", whereas line 15 switches to "visit request". Translators must shift terms (`demande de visite`, `وزٹ کی درخواست`, `طلب هذه الزيارة`, `就诊请求`), which can make screen-reader users think a "visit request" is a different record from their visit.
