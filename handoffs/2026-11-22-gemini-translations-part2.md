# Gemini translations: patient card look, Part 2 (new text sections)

Model: Gemini Hydrogen 4, High, in a new chat. If no Hydrogen 4 credits: Gemini 3.6 Flash, High.
Date: 2026-11-22. No keys, tokens, passwords, project IDs or patient data are in this file.

Give it: this file only.

After this step, a fluent human reviewer checks each language before it is used, safety text first (Q5, Q8, Q4, B1).

## Prompt

You translate patient text for a concept prototype: a virtual emergency department waiting room in Mississauga, Ontario, Canada. After a nurse triages a low-acuity patient, the patient can wait off-site, follow their place in line on their own phone, and come back when staff ask them to return. The app uses only invented demo data and makes no clinical decisions.

Translate the English items below into French (Canada), Urdu, Arabic (Modern Standard) and Simplified Chinese. These are drafts: a fluent human checks them later. Then list every problem you find: a sentence whose meaning changes, a word a patient could misread, or a place where a fixed sentence does not match. Do not tell me the text is good; list problems only.

## Rules

- Plain language, grade 6 to 8 level in each language. Short sentences. No idioms.
- Calm and direct. Do not reassure about health.
- Keep the meaning exact. Do not add or remove facts.
- Straight quotes in French. Use the normal quote marks of Urdu, Arabic and Chinese only if a straight quote would be wrong; say which you used.
- Numbers stay as digits (911, 10, 20, 24, 30).
- The app already has these translations. Use them word for word wherever the English item uses the same sentence or name. Never reword them.

## Fixed translations (use word for word)

F1 "If your symptoms get worse, call 911 or come back to the emergency department now."
- fr: Si vos symptômes s'aggravent, appelez le 911 ou revenez immédiatement aux urgences.
- ur: اگر آپ کی علامات خراب ہوتی ہیں، تو ابھی 911 پر کال کریں یا ایمرجنسی ڈیپارٹمنٹ واپس آ جائیں۔
- ar: إذا ساءت الأعراض، اتصل بـ 911 أو عُد إلى قسم الطوارئ الآن.
- zh: 如果您的症状恶化，请立即拨打 911 或回到急诊室。

F3 "Your place can change if more urgent patients arrive. The most urgent patients are always seen first."
- fr: Votre place peut changer si des patients plus urgents arrivent. Les patients les plus urgents sont toujours vus en premier.
- ur: اگر زیادہ ایمرجنسی والے مریض آ جائیں تو آپ کی جگہ بدل سکتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔
- ar: يمكن أن يتغير مكانك إذا وصل مرضى حالاتهم أكثر استعجالاً. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.
- zh: 如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。

F4 "Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first."
- fr: Votre place dans la file commence lorsqu'une infirmière vous voit au triage. Les patients les plus urgents sont toujours vus en premier.
- ur: لائن میں آپ کی جگہ اس وقت شروع ہوتی ہے جب کوئی نرس آپ کو ٹرائیج (triage) میں دیکھتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔
- ar: يبدأ مكانك في الطابور عندما تراك ممرضة في الفرز. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.
- zh: 您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。

F5 "Off-site waiting is paused right now. Please come to the emergency department and wait there."
- fr: L'attente hors site est suspendue pour le moment. Veuillez vous présenter aux urgences et y attendre.
- ur: آف سائٹ (Off-site) انتظار اس وقت روکا ہوا ہے۔ براہ کرم ایمرجنسی ڈیپارٹمنٹ آئیں اور وہاں انتظار کریں۔
- ar: الانتظار خارج الموقع متوقف مؤقتًا في الوقت الحالي. يرجى الحضور إلى قسم الطوارئ والانتظار هناك.
- zh: 目前院外候诊已暂停。请来急诊室并在那里等候。

Button and status names (fr / ur / ar / zh):
- "Start a visit": Commencer une visite / وزٹ شروع کریں / بدء الزيارة / 开始就诊
- "I'm still here": Je suis toujours ici / میں اب بھی یہاں ہوں / أنا لا أزال هنا / 我还在
- "I'm on my way": Je suis en route / میں راستے میں ہوں / أنا في طريقي / 我正在路上
- "Turn on sound": Activer le son / آواز آن کریں / تشغيل الصوت / 开启声音
- "Please head back now": Veuillez revenir maintenant / براہ کرم اب واپس آ جائیں / يرجى العودة الآن / 请现在回来
- "Waiting" (status): En attente / انتظار کر رہے ہیں / قيد الانتظار / 等候中
- "off-site" (word): hors site / آف سائٹ (Off-site) / خارج الموقع / 院外
- "simulated": use the same word for all items; say which word you chose.

## English items to translate

H: How it works
- H0: How it works
- H1: 1. Tap "Start a visit" at home or while waiting at the hospital. Starting a visit does not hold a place in line.
- H2: 2. Your place in line starts when a nurse sees you at triage. The most urgent patients are always seen first. (F4)
- H3: 3. Staff decide if you can wait off-site. You must agree and be able to return within 20 minutes. If you did not start on your phone, staff give you a paper slip.
- H4: 4. Follow your place in line, status, and simulated wait range on your phone. Tap "I'm still here" every 30 minutes.
- H5: 5. When your status is "Please head back now", tap "I'm on my way". Come back within 20 minutes.
- H6: 6. Go to the emergency department desk when you return. Tell staff you are back.

B: Before you leave
- B0: Before you leave
- B1: Keep this page open and your phone unlocked. Alerts cannot wake a locked phone.
- B2: Keep your phone charged and tap "Turn on sound".
- B3: Stay within 20 minutes of the emergency department.
- B4: Keep your paper slip if you got one, so you can scan the code again.

Q: Questions
- Q0: Questions
- Q1: Does starting a visit at home hold my place? / Starting from home does not hold a place in line. Your place in line starts when a nurse sees you at triage.
- Q2: Why did my place in line change? / (F3)
- Q3: What happens if I do not tap "I'm still here"? / After 10 minutes, staff see a notice on your visit. Tapping this button only tells staff you are still waiting, not how you feel.
- Q4: What happens if I do not reply when asked to return? / A second alert shows after 10 minutes. If you do not tap "I'm on my way" within 20 minutes, staff will review your visit.
- Q5: What if my symptoms get worse? / (F1)
- Q6: What does the app save about me? / The app saves no names, health card numbers, phone numbers, or symptoms. App records are deleted after 24 hours.
- Q7: How do I open my visit again? / Open it the same way you first did, on the same phone, or scan your paper slip. A QR code or a message app can open its own browser, and a different phone or a private window will not have your visit.
- Q8: What if staff pause off-site waiting? / You will see this message: "Off-site waiting is paused right now. Please come to the emergency department and wait there." (F5)

N: No-phone line
- N1: You need a smartphone with internet to wait off-site. If you do not have one, wait in the emergency department as usual.

## Rules the translation must keep

1. "I'm still here" is not a health check. Q3 must not read as "how are you feeling".
2. The app cannot wake a locked phone. B1 must not promise alerts on a locked phone.
3. No promise that staff will phone the patient.
4. Do not use the local word for "check in" or "register" for coming back to the desk (H6). In this app, check-in is the staff step after triage.

## Answer format

1. For each language, each ID and its text, in the order above.
2. Problems: each with the language, the ID, the problem and a fix.
3. Any English item that was hard to translate, with the reason.
