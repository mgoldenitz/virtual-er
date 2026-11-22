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

## Response

Gemini Hydrogen 4, High, 2026-11-22 (pasted by the owner). Translations verbatim; problems and hard items in short form.

Quote marks: straight for fr, ur, ar; Chinese full-width quotes for zh. "simulated": fr `simulé`, ur `فرضی`, ar `المحاكى`, zh `模拟`.

### fr

- H0: Comment ça fonctionne
- H1: 1. Appuyez sur "Commencer une visite" à la maison ou en attendant à l'hôpital. Commencer une visite ne réserve pas de place dans la file.
- H2: 2. Votre place dans la file commence lorsqu'une infirmière vous voit au triage. Les patients les plus urgents sont toujours vus en premier.
- H3: 3. Le personnel décide si vous pouvez attendre hors site. Vous devez accepter et pouvoir revenir dans les 20 minutes. Si vous n'avez pas commencé sur votre téléphone, le personnel vous remet un feuillet papier.
- H4: 4. Suivez votre place dans la file, votre statut et l'intervalle d'attente simulé sur votre téléphone. Appuyez sur "Je suis toujours ici" toutes les 30 minutes.
- H5: 5. Lorsque votre statut est "Veuillez revenir maintenant", appuyez sur "Je suis en route". Revenez dans les 20 minutes.
- H6: 6. Allez au comptoir des urgences à votre retour. Dites au personnel que vous êtes de retour.
- B0: Avant de partir
- B1: Gardez cette page ouverte et votre téléphone déverrouillé. Les alertes ne peuvent pas réveiller un téléphone verrouillé.
- B2: Gardez votre téléphone chargé et appuyez sur "Activer le son".
- B3: Restez à moins de 20 minutes des urgences.
- B4: Gardez votre feuillet papier si vous en avez reçu un, pour pouvoir scanner le code de nouveau.
- Q0: Questions
- Q1: Est-ce que commencer une visite depuis la maison réserve ma place? / Commencer depuis la maison ne réserve pas de place dans la file. Votre place dans la file commence lorsqu'une infirmière vous voit au triage.
- Q2: Pourquoi ma place dans la file a-t-elle changé? / Votre place peut changer si des patients plus urgents arrivent. Les patients les plus urgents sont toujours vus en premier.
- Q3: Que se passe-t-il si je n'appuie pas sur "Je suis toujours ici"? / Après 10 minutes, le personnel voit un avis sur votre visite. Appuyer sur ce bouton indique seulement au personnel que vous attendez toujours, et non comment vous vous sentez.
- Q4: Que se passe-t-il si je ne réponds pas quand on me demande de revenir? / Une deuxième alerte s'affiche après 10 minutes. Si vous n'appuyez pas sur "Je suis en route" dans les 20 minutes, le personnel examinera votre visite.
- Q5: Que faire si mes symptômes s'aggravent? / Si vos symptômes s'aggravent, appelez le 911 ou revenez immédiatement aux urgences.
- Q6: Qu'est-ce que l'application enregistre à mon sujet? / L'application n'enregistre aucun nom, numéro de carte santé, numéro de téléphone ni symptôme. Les dossiers de l'application sont supprimés après 24 heures.
- Q7: Comment ouvrir ma visite de nouveau? / Ouvrez-la de la même façon que la première fois, sur le même téléphone, ou scannez votre feuillet papier. Un code QR ou une application de messagerie peut ouvrir son propre navigateur, et un autre téléphone ou une fenêtre de navigation privée n'aura pas votre visite.
- Q8: Que se passe-t-il si le personnel suspend l'attente hors site? / Vous verrez ce message : "L'attente hors site est suspendue pour le moment. Veuillez vous présenter aux urgences et y attendre."
- N1: Vous avez besoin d'un téléphone intelligent avec accès à Internet pour attendre hors site. Si vous n'en avez pas, attendez aux urgences comme d'habitude.

### ur

- H0: یہ کیسے کام کرتا ہے
- H1: 1. گھر پر یا ہسپتال میں انتظار کرتے ہوئے "وزٹ شروع کریں" پر ٹیپ کریں۔ وزٹ شروع کرنے سے لائن میں جگہ محفوظ نہیں ہوتی۔
- H2: 2. لائن میں آپ کی جگہ اس وقت شروع ہوتی ہے جب کوئی نرس آپ کو ٹرائیج (triage) میں دیکھتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔
- H3: 3. عملہ فیصلہ کرتا ہے کہ آیا آپ آف سائٹ (Off-site) انتظار کر سکتے ہیں۔ آپ کا راضی ہونا اور 20 منٹ کے اندر واپس آنے کے قابل ہونا ضروری ہے۔ اگر آپ نے اپنے فون پر شروع نہیں کیا، تو عملہ آپ کو کاغذ کی ایک پرچی دیتا ہے۔
- H4: 4. اپنے فون پر لائن میں اپنی جگہ، صورتحال، اور انتظار کے فرضی وقت کی حد دیکھیں۔ ہر 30 منٹ بعد "میں اب بھی یہاں ہوں" پر ٹیپ کریں۔
- H5: 5. جب آپ کی صورتحال "براہ کرم اب واپس آ جائیں" ہو، تو "میں راستے میں ہوں" پر ٹیپ کریں۔ 20 منٹ کے اندر واپس آئیں۔
- H6: 6. واپس آنے پر ایمرجنسی ڈیپارٹمنٹ کے ڈیسک پر جائیں۔ عملے کو بتائیں کہ آپ واپس آ گئے ہیں۔
- B0: جانے سے پہلے
- B1: یہ صفحہ کھلا رکھیں اور اپنا فون ان لاک رکھیں۔ الرٹ لاک شدہ فون کی اسکرین کو آن نہیں کر سکتے۔
- B2: اپنا فون چارج رکھیں اور "آواز آن کریں" پر ٹیپ کریں۔
- B3: ایمرجنسی ڈیپارٹمنٹ سے 20 منٹ کے فاصلے کے اندر رہیں۔
- B4: اگر آپ کو کاغذ کی پرچی ملی ہے تو اسے سنبھال کر رکھیں، تاکہ آپ کوڈ کو دوبارہ اسکین کر سکیں۔
- Q0: سوالات
- Q1: کیا گھر سے وزٹ شروع کرنے سے میری جگہ محفوظ ہو جاتی ہے؟ / گھر سے شروع کرنے سے لائن میں جگہ محفوظ نہیں ہوتی۔ لائن میں آپ کی جگہ اس وقت شروع ہوتی ہے جب کوئی نرس آپ کو ٹرائیج (triage) میں دیکھتی ہے۔
- Q2: لائن میں میری جگہ کیوں بدل گئی؟ / اگر زیادہ ایمرجنسی والے مریض آ جائیں تو آپ کی جگہ بدل سکتی ہے۔ سب سے زیادہ ایمرجنسی والے مریضوں کو ہمیشہ پہلے دیکھا جاتا ہے۔
- Q3: اگر میں "میں اب بھی یہاں ہوں" پر ٹیپ نہ کروں تو کیا ہوگا؟ / 10 منٹ کے بعد، عملے کو آپ کے وزٹ پر ایک اطلاع نظر آتی ہے۔ اس بٹن پر ٹیپ کرنے سے عملے کو صرف یہ پتہ چلتا ہے کہ آپ ابھی بھی انتظار کر رہے ہیں، نہ کہ یہ کہ آپ کیسا محسوس کر رہے ہیں۔
- Q4: اگر مجھے واپس آنے کے لیے کہا جائے اور میں جواب نہ دوں تو کیا ہوگا؟ / 10 منٹ کے بعد دوسرا الرٹ دکھائی دیتا ہے۔ اگر آپ 20 منٹ کے اندر "میں راستے میں ہوں" پر ٹیپ نہیں کرتے، تو عملہ آپ کے وزٹ کا جائزہ لے گا۔
- Q5: اگر میری علامات خراب ہو جائیں تو کیا کروں؟ / اگر آپ کی علامات خراب ہوتی ہیں، تو ابھی 911 پر کال کریں یا ایمرجنسی ڈیپارٹمنٹ واپس آ جائیں۔
- Q6: ایپ میرے بارے میں کیا محفوظ کرتی ہے؟ / ایپ کوئی نام، ہیلتھ کارڈ نمبر، فون نمبر، یا علامات محفوظ نہیں کرتی۔ ایپ کا ریکارڈ 24 گھنٹوں کے بعد مٹا دیا جاتا ہے۔
- Q7: میں اپنا وزٹ دوبارہ کیسے کھولوں؟ / اسے اسی طرح کھولیں جیسے آپ نے پہلی بار کھولا تھا، اسی فون پر، یا اپنی کاغذ کی پرچی اسکین کریں۔ کوئی QR کوڈ یا میسج ایپ اپنا براؤزر خود کھول سکتی ہے، اور کسی دوسرے فون یا پرائیویٹ ونڈو میں آپ کا وزٹ نہیں ہوگا۔
- Q8: اگر عملہ آف سائٹ (Off-site) انتظار روک دے تو کیا ہوگا؟ / آپ کو یہ پیغام نظر آئے گا: "آف سائٹ (Off-site) انتظار اس وقت روکا ہوا ہے۔ براہ کرم ایمرجنسی ڈیپارٹمنٹ آئیں اور وہاں انتظار کریں۔"
- N1: آف سائٹ (Off-site) انتظار کرنے کے لیے آپ کو انٹرنیٹ والا اسمارٹ فون چاہیے۔ اگر آپ کے پاس یہ نہیں ہے، تو معمول کے مطابق ایمرجنسی ڈیپارٹمنٹ میں انتظار کریں۔

### ar

- H0: كيف يعمل
- H1: 1. اضغط على "بدء الزيارة" في المنزل أو أثناء الانتظار في المستشفى. بدء الزيارة لا يحجز لك مكانًا في الطابور.
- H2: 2. يبدأ مكانك في الطابور عندما تراك ممرضة في الفرز. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.
- H3: 3. يقرر الموظفون ما إذا كان يمكنك الانتظار خارج الموقع. يجب أن توافق وتكون قادرًا على العودة خلال 20 دقيقة. إذا لم تبدأ على هاتفك، يعطيك الموظفون قسيمة ورقية.
- H4: 4. تابع مكانك في الطابور، وحالتك، ونطاق الانتظار المحاكى على هاتفك. اضغط على "أنا لا أزال هنا" كل 30 دقيقة.
- H5: 5. عندما تكون حالتك "يرجى العودة الآن"، اضغط على "أنا في طريقي". عُد خلال 20 دقيقة.
- H6: 6. اذهب إلى مكتب قسم الطوارئ عند عودتك. أخبر الموظفين أنك قد عدت.
- B0: قبل أن تغادر
- B1: أبقِ هذه الصفحة مفتوحة وهاتفك غير مقفل. لا يمكن للتنبيهات إيقاظ هاتف مقفل.
- B2: أبقِ هاتفك مشحونًا واضغط على "تشغيل الصوت".
- B3: ابقَ ضمن مسافة 20 دقيقة من قسم الطوارئ.
- B4: احتفظ بقسيمتك الورقية إذا حصلت على واحدة، حتى تتمكن من مسح الرمز مرة أخرى.
- Q0: الأسئلة
- Q1: هل بدء الزيارة من المنزل يحجز مكاني؟ / البدء من المنزل لا يحجز لك مكانًا في الطابور. يبدأ مكانك في الطابور عندما تراك ممرضة في الفرز.
- Q2: لماذا تغير مكاني في الطابور؟ / يمكن أن يتغير مكانك إذا وصل مرضى حالاتهم أكثر استعجالاً. يتم دائمًا فحص المرضى ذوي الحالات الأكثر استعجالاً أولاً.
- Q3: ماذا يحدث إذا لم أضغط على "أنا لا أزال هنا"؟ / بعد 10 دقائق، يرى الموظفون ملاحظة على زيارتك. الضغط على هذا الزر يخبر الموظفين فقط بأنك لا تزال تنتظر، وليس كيف تشعر.
- Q4: ماذا يحدث إذا لم أردّ عندما يُطلب مني العودة؟ / يظهر تنبيه ثانٍ بعد 10 دقائق. إذا لم تضغط على "أنا في طريقي" خلال 20 دقيقة، فسيراجع الموظفون زيارتك.
- Q5: ماذا لو ساءت الأعراض؟ / إذا ساءت الأعراض، اتصل بـ 911 أو عُد إلى قسم الطوارئ الآن.
- Q6: ماذا يحفظ التطبيق عني؟ / لا يحفظ التطبيق أي أسماء أو أرقام بطاقات صحية أو أرقام هواتف أو أعراض. يتم حذف سجلات التطبيق بعد 24 ساعة.
- Q7: كيف أفتح زيارتي مرة أخرى؟ / افتحها بنفس الطريقة التي فتحتها بها أول مرة، على نفس الهاتف، أو امسح قسيمتك الورقية. قد يفتح رمز QR أو تطبيق الرسائل متصفحًا خاصًا به، ولن يحتوي هاتف آخر أو نافذة التصفح الخاص على زيارتك.
- Q8: ماذا لو أوقف الموظفون الانتظار خارج الموقع مؤقتًا؟ / سترى هذه الرسالة: "الانتظار خارج الموقع متوقف مؤقتًا في الوقت الحالي. يرجى الحضور إلى قسم الطوارئ والانتظار هناك."
- N1: تحتاج إلى هاتف ذكي متصل بالإنترنت للانتظار خارج الموقع. إذا لم يكن لديك واحد، فانتظر في قسم الطوارئ كالمعتاد.

### zh

- H0: 使用方法
- H1: 1. 在家或在医院等候时，点击“开始就诊”。开始就诊不会为您保留排队位置。
- H2: 2. 您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。
- H3: 3. 工作人员会决定您是否可以在院外等候。您必须同意，并且能够在 20 分钟内返回。如果您没有在手机上开始，工作人员会给您一张纸质凭条。
- H4: 4. 在手机上查看您的排队位置、状态和模拟等待时间范围。每 30 分钟点击一次“我还在”。
- H5: 5. 当您的状态显示为“请现在回来”时，点击“我正在路上”。请在 20 分钟内回来。
- H6: 6. 回来时请前往急诊室前台。告诉工作人员您回来了。
- B0: 离开前
- B1: 请保持此页面打开，并让手机保持解锁状态。锁屏状态下，提醒无法唤醒手机。
- B2: 请保持手机电量充足，并点击“开启声音”。
- B3: 请留在距离急诊室 20 分钟以内的地方。
- B4: 如果您拿到了纸质凭条，请保存好，以便再次扫描上面的二维码。
- Q0: 问题
- Q1: 在家开始就诊会保留我的排队位置吗？ / 在家开始就诊不会保留排队位置。您的排队位置从护士在分诊处（triage）看到您时开始算起。
- Q2: 为什么我的排队位置变了？ / 如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。
- Q3: 如果我没有点击“我还在”会怎样？ / 10 分钟后，工作人员会在您的就诊记录上看到提示。点击此按钮只是告诉工作人员您仍在等候，而不是告诉工作人员您感觉如何。
- Q4: 如果工作人员请我回来时我没有回复会怎样？ / 10 分钟后会显示第二次提醒。如果您在 20 分钟内没有点击“我正在路上”，工作人员将查看您的就诊情况。
- Q5: 如果我的症状恶化怎么办？ / 如果您的症状恶化，请立即拨打 911 或回到急诊室。
- Q6: 这个应用会保存关于我的哪些信息？ / 这个应用不保存姓名、健康卡号、电话号码或症状。应用记录会在 24 小时后删除。
- Q7: 如何再次打开我的就诊页面？ / 请在手机上用第一次打开时的相同方式重新打开，或扫描您的纸质凭条。二维码或消息应用可能会打开自带的浏览器，而另一部手机或隐私浏览窗口中不会有您的就诊记录。
- Q8: 如果工作人员暂停院外候诊怎么办？ / 您会看到以下消息：“目前院外候诊已暂停。请来急诊室并在那里等候。”
- N1: 您需要一部能上网的智能手机才能在院外等候。如果您没有，请像往常一样在急诊室等候。

### Problems (short form, with Gemini's fix)

fr:
- H3/Q8/N1 "hors site" is jargon. Fix: keep (F5), or "à l'extérieur de l'hôpital" everywhere.
- H4 "simulé", "intervalle" are hard. Fix: "de démonstration".
- H6 "comptoir des urgences" may not match signs. Fix: confirm the desk name; never "enregistrement".
- B1 "réveiller" sounds odd. Fix: "Les alertes ne peuvent pas allumer un téléphone verrouillé."
- Q3 ends on "comment vous vous sentez". Fix: "et ce n'est pas une question sur votre état de santé."
- Q7 tech words; "messagerie" can read as SMS only. Fix: "une application de texto ou de messagerie", "une fenêtre privée (navigation privée)".
- F5 "vous présenter" is formal. Fix: ask the reviewer about "Veuillez venir aux urgences et y attendre."

ur:
- F1 "علامات خراب ہوتی ہیں" is unnatural. Fix for the reviewer: "اگر آپ کی علامات بڑھ جائیں".
- F4 "ٹرائیج (triage)" unknown to many. Fix later: "ٹرائیج (ابتدائی معائنہ)".
- "آف سائٹ (Off-site)" mixes English into RTL. Fix later: "ہسپتال سے باہر".
- "پرچی" can read as a scrap note. Fix: "پرنٹ شدہ پرچی" in H3, B4, Q7.
- H4 "فرضی" can read as duty or fake; "صورتحال" is broader than status. Fix: reviewer to choose "ڈیمو"; "اسٹیٹس (صورتحال)".
- B1 adds "اسکرین". Fix: reviewer chooses.
- Q3 ends on how you feel. Fix: "آپ کی طبیعت کا نہیں۔"
- Q4 "جائزہ لے گا" vague. Fix: reviewer to check.
- Q7 tech words. Fix: add plain hints.

ar:
- F4 "الفرز" can mean sorting. Fix for the reviewer: "الفرز الطبي".
- F3/F4 high register. Fix: flag for simpler wording.
- "قسيمة" can read as a coupon. Fix: "ورقة مطبوعة" in H3, B4, Q7.
- H4 "نطاق", "المحاكى" are formal. Fix: reviewer, "التجريبي", "مدة الانتظار التقريبية".
- B1 "إيقاظ" is literal. Fix: "لا يمكن للتنبيهات تشغيل شاشة هاتف مقفل."
- Q3 "كيف تشعر" at the end. Fix: "ولا يعرض حالتك الصحية."
- Q7 "تطبيق الرسائل" can mean SMS only. Fix: "تطبيق المراسلة أو الرسائل", "نافذة التصفح الخاص (المتخفي)".

zh:
- "开始就诊" (fixed button) reads as "start treatment". Fix for the reviewer: "开始登记候诊" or "开始此次访问".
- H3 "开始" has no object. Fix: "如果您之前没有在手机上开始就诊".
- H4 "模拟" can read as a real forecast. Fix: "演示示例".
- B3 vague distance. Fix: "请留在 20 分钟内能回到急诊室的地方。"
- B4 adds "二维码". Fix: confirm the slip has a QR code.
- Q3 "就诊记录" reads as a medical record; ends on how you feel. Fix: "候诊信息"; end "这并不询问您的身体感受。"
- Q7 "消息应用" is unfamiliar. Fix: "短信或聊天软件".

### Hard to translate (short form)

"simulated" (H4), "wake a locked phone" (B1), "off-site", "paper slip" and "the code", H6 without "check in", Q3 "not how you feel" at the end of the sentence, Q4 "review your visit", Q7 tech words, "hold a place in line".

## Check of the response (Claude, 2026-11-22)

Checked in this session:
- All fixed sentences (F1, F3, F4, F5) and button names match the current `lib/text/fr.ts`, `ur.ts`, `ar.ts`, `zh.ts` word for word, by eye against the lines printed from those files.
- Chinese full-width quotes are correct: translations keep their own quote marks (decisions.md, 2026-11-15). `zh.ts` already has 103 lines with them.
- The paper slip has a QR code (SPEC line 59), so zh B4 "二维码" is right.

Accepted (I make these changes in the drafts that go into the text files):
- fr H6: "Allez au bureau du service des urgences à votre retour." The app already uses "bureau" (`expiredHelp`, `arrivedHeading`), not "comptoir".
- fr B1: "Les alertes ne peuvent pas allumer un téléphone verrouillé."
- fr Q7: "une application de texto ou de messagerie".
- ur H3, B4, Q7: "پرنٹ شدہ پرچی".
- ar H3, B4, Q7: "ورقة مطبوعة".
- ar B1: "لا يمكن للتنبيهات تشغيل شاشة هاتف مقفل."
- ar Q7: "تطبيق المراسلة أو الرسائل".
- zh H3: "如果您之前没有在手机上开始就诊".
- zh B3: "请留在 20 分钟内能回到急诊室的地方。"
- zh Q3: "就诊记录" becomes "候诊信息"; the end stays as is.
- zh Q7: "短信或聊天软件".

Rejected:
- Every change to a fixed translation (ur F1, ur and ar F4, ar F3, F5 in fr, zh "开始就诊", ur "آف سائٹ"): fixed text changes only through the fluent human reviewer. These go on the reviewer's list.
- A word other than "simulated" or "off-site": owner choice (2026-11-22). The ur "فرضی" and zh "模拟" doubt goes on the reviewer's list.
- New Q3 endings that name health ("état de santé", "حالتك الصحية", "طبیعت", "身体感受"): the English says "not how you feel", and the reviewer decides. On the reviewer's list.

For the fluent human reviewer (safety text first: Q5, Q8, Q4, B1):
- ur F1 "خراب ہوتی ہیں"; ar F4 "الفرز"; zh button "开始就诊"; fr F5 "vous présenter".
- ur "فرضی" and zh "模拟" for "simulated"; ur "آف سائٹ (Off-site)".
- The Q3 ending in all 4 languages.
