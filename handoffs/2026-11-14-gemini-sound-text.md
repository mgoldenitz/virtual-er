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

## Response

Gemini Hydrogen 4, High, new chat, 2026-11-15. Pasted by the owner.

A. English
- notice: "This demo can play a sound when you are called. It also vibrates if your phone allows it. Alerts work only while this page is open and your phone is unlocked. Take your phone off silent so you can hear it." (Reasons: "plays" promised the sound; the inserted clause was hard to scan; "It" was unclear; "off silent" had no reason.)
- failed: "Sound could not start on this phone. Watch this screen to see when you are called." (Reason: dead end with no next step.)
- turnOff: "Turn off sound" (no problem found).
- offWhileCalled: "Sound is off. Tap "Turn on sound" for sound alerts." (Reasons: button name not marked; "to hear the alert" promised the sound.)

B. Drafts (all "draft" until a fluent human approves them)
- fr notice: Cette démonstration peut émettre un son quand vous êtes appelé. Elle vibre aussi si votre téléphone le permet. Les alertes fonctionnent seulement quand cette page est ouverte et que votre téléphone est déverrouillé. Désactivez le mode silencieux de votre téléphone pour entendre le son.
- fr failed: Le son n'a pas pu démarrer sur ce téléphone. Regardez cet écran pour voir quand vous êtes appelé.
- fr turnOff: Désactiver le son
- fr offWhileCalled: Le son est désactivé. Appuyez sur « Activer le son » pour avoir des alertes sonores.
- ur notice: جب آپ کو بلایا جاتا ہے تو یہ ڈیمو آواز بجا سکتا ہے۔ اگر آپ کا فون اجازت دے تو یہ وائبریٹ بھی کرتا ہے۔ الرٹس صرف اس وقت کام کرتے ہیں جب یہ پیج کھلا ہو اور آپ کا فون ان لاک ہو۔ آواز سننے کے لیے اپنے فون کو سائلنٹ سے ہٹا دیں۔
- ur failed: اس فون پر آواز شروع نہیں ہو سکی۔ یہ دیکھنے کے لیے اس اسکرین کو دیکھتے رہیں کہ آپ کو کب بلایا جاتا ہے۔
- ur turnOff: آواز آف کریں
- ur offWhileCalled: آواز آف ہے۔ آواز والے الرٹس کے لیے "آواز آن کریں" پر ٹیپ کریں۔
- ar notice: يمكن لهذا العرض التجريبي تشغيل صوت عند استدعائك. كما أنه يهتز إذا كان هاتفك يسمح بذلك. تعمل التنبيهات فقط عندما تكون هذه الصفحة مفتوحة وهاتفك غير مقفل. أوقف الوضع الصامت في هاتفك لتتمكن من سماع الصوت.
- ar failed: تعذّر تشغيل الصوت على هذا الهاتف. راقب هذه الشاشة لمعرفة متى يتم استدعاؤك.
- ar turnOff: إيقاف الصوت
- ar offWhileCalled: الصوت متوقف. اضغط على "تشغيل الصوت" للحصول على تنبيهات صوتية.
- zh notice: 当您被叫到时，此演示可以播放声音。如果您的手机允许，它也会振动。警报仅在此页面打开且手机未锁定时有效。请关闭手机的静音模式，以便听到声音。
- zh failed: 此手机无法启动声音。请留意此屏幕，查看何时叫到您。
- zh turnOff: 关闭声音
- zh offWhileCalled: 声音已关闭。点击“开启声音”以接收声音警报。

C. What the fluent reviewer checks first
- fr: "quand" or "lorsque"; masculine "appelé" or a neutral form; « » spacing and button fit at 150% text size.
- ur: English loanwords (ڈیمو، وائبریٹ، الرٹس، پیج، سائلنٹ، آف، ٹیپ) or plain Urdu (for example صفحہ); quotation marks in right-to-left text; tall letters clipped at Extra large text.
- ar: "العرض التجريبي" and "تعذّر" plain enough, or "لم يتمكن هذا الهاتف من تشغيل الصوت"; one verb for "tap" across ar.ts; "تشغيل الصوت" in right-to-left text.
- zh: Simplified or Traditional for the patients; "此演示" and "关闭手机的静音模式" natural; “” marks on iOS and Android, button width.

### Claude's check (2026-11-15)

- Checked: each offWhileCalled draft contains the exact `sound.turnOn` words of its language file (fr "Activer le son", ur "آواز آن کریں", ar "تشغيل الصوت", zh "开启声音"). A test in lib/text/translations.test.ts now checks this.
- Checked: ar.ts has no other word for "tap" (no "انقر" or "اضغط"), so "اضغط على" has nothing to clash with. fr.ts already uses "appelé" in the old notice.
- Accepted all four English lines and all drafts as written. They go into lib/text/ marked as drafts in the file headers.
- Not checked: the real-phone points in C (clipping, quotation marks, button width). These stay for the fluent reviewers and the phone test.
