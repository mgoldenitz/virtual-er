// Patient text in Mandarin (Simplified Chinese). DRAFT: written by Gemini 3.1 Pro on 2026-11-10/11
// (handoffs/archive/2026-11-10-gemini-translations-phase3.md) and not yet approved by a
// fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
// handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
// Same shape as lib/text/en.ts; words in {braces} are filled in by the app.
// The hour and minute words (waitRangeLong and the Duration words at the end) are a draft by
// Gemini Hydrogen 4 (2026-11-15, handoffs/archive/2026-11-15-gemini-hours-units.md), not yet approved.
// The 2 new announce lines (waiting, onsite) are a draft by Claude, 2026-11-16, not yet approved.

import type { DurationWords } from "./durationWords";
import type { PatientText } from "./en";

export const zh: PatientText = {
  emergencyLine: "如果您的症状恶化，请立即拨打 911 或回到急诊室。",
  footer: "概念原型。与 Trillium Health Partners 无关，也未获得其认可。仅为演示数据。",
  appName: "WaitWell",
  appSubtitle: "虚拟候诊室",
  visitCode: "就诊代码",
  siteName: "Demo Site {site}",
  newTab: "（在新标签页中打开）",
  start: {
    emergencyCheck:
      "胸痛、呼吸困难、中风迹象、大出血或其他紧急情况？请立即拨打 911。",
    careHeading: "了解您的护理选择",
    careIntro: "此演示无法为您选择服务。去之前请在每个网站上查看规则和时间。",
    health811Before: "Health811：拨打",
    health811After: "免费咨询护士。",
    virtualCare: "虚拟紧急护理",
    urgentCare: "位于 Etobicoke 的 Queensway Health Centre 的紧急护理中心。",
    pharmacist:
      "药剂师可以在 Mississauga 的三家 Shoppers Drug Mart 门店为您进行评估。这是一项试点计划，所以去之前请确认它是否仍在运行。",
    hoursBefore: "有关时间和地址，请参阅",
    hoursLink: "THP 的急诊网页",
    waitTimesLink: "在 THP 网站上查看当前等待时间",
    startHeading: "开始就诊",
    startIntro:
      "在这里开始并不会保留您的排队位置。您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。",
    siteQuestion: "您要去哪个急诊室？",
    startButton: "开始就诊",
    starting: "正在开始…",
    paused: "目前院外候诊已暂停。请来急诊室并在那里等候。",
    busy: "该应用程序目前太忙。请等待几分钟再试一次。您也可以直接去急诊室。",
    notSaved: "您的就诊信息未保存。请重试。或者，去急诊室前台。",
    checkingSaved: "正在此手机上检查已保存的就诊信息…",
    unavailableHeading: "我们无法打开此手机上已保存的就诊信息",
    unavailableText:
      "您保存的就诊信息现在无法加载。您不能在这里开始新的就诊。如果您需要护理，请前往急诊室前台。",
    openHeading: "您在此手机上有一个未完成的就诊",
    openVisit: "打开您的就诊",
    closedHeading: "您在此手机上过去的就诊",
    closedText:
      "该次就诊的院外候诊已经结束。您可能仍在医院里等候。打开您的就诊页面查看。",
    expiredHeading: "您的就诊请求已过期",
    startNew: "开始一次新的演示就诊",
    noPhone: "您需要一部能上网的智能手机才能在院外等候。如果您没有，请像往常一样在急诊室等候。",
    howHeading: "使用方法",
    // Step 2 is patient.fromHomeText[0] (SPEC), so it is not here.
    howSteps: [
      "在家或在医院等候时，点击“开始就诊”。开始就诊不会为您保留排队位置。",
      "工作人员会决定您是否可以在院外等候。您必须同意，并且能够在 20 分钟内返回。如果您之前没有在手机上开始就诊，工作人员会给您一张纸质凭条。",
      "在手机上查看您的排队位置、状态和模拟等待时间范围。每 30 分钟点击一次“我还在”。",
      "当您的状态显示为“请现在回来”时，点击“我正在路上”。请在 20 分钟内回来。",
      "回来时请前往急诊室前台。告诉工作人员您回来了。",
    ],
    questionsHeading: "问题",
    questions: {
      holdPlace: {
        q: "在家开始就诊会保留我的排队位置吗？",
        a: "在家开始就诊不会保留排队位置。{triage}",
      },
      placeChanged: { q: "为什么我的排队位置变了？" },
      stillHere: {
        q: "如果我没有点击“我还在”会怎样？",
        a: "10 分钟后，工作人员会在您的候诊信息上看到提示。点击此按钮只是告诉工作人员您仍在等候，而不是告诉工作人员您感觉如何。",
      },
      noReply: {
        q: "如果工作人员请我回来时我没有回复会怎样？",
        a: "10 分钟后会显示第二次提醒。如果您在 20 分钟内没有点击“我正在路上”，工作人员将查看您的就诊情况。",
      },
      worse: { q: "如果我的症状恶化怎么办？" },
      saves: {
        q: "这个应用会保存关于我的哪些信息？",
        a: "这个应用不保存姓名、健康卡号、电话号码或症状。应用记录会在 24 小时后删除。",
      },
      reopen: {
        q: "如何再次打开我的就诊页面？",
        a: "请在手机上用第一次打开时的相同方式重新打开，或扫描您的纸质凭条。二维码、短信或聊天软件可能会打开自带的浏览器，而另一部手机或隐私浏览窗口中不会有您的就诊记录。",
      },
      paused: { q: "如果工作人员暂停院外候诊怎么办？", a: "您会看到以下消息：“{message}”" },
    },
    demoScreens: "演示屏幕",
    staffScreen: "工作人员屏幕",
    patientScreen: "患者屏幕",
    dashboard: "仪表板",
  },
  expiredText:
    "您在6个多小时前开始了这次就诊。没有护士为这次就诊看过您。工作人员不再预计您会前来。",
  patient: {
    loading: "正在加载您的就诊信息…",
    unavailableHeading: "我们无法加载您的就诊信息",
    unavailableText:
      "我们目前无法显示您的就诊信息。如果您需要治疗，请前往急诊室前台。",
    noVisitHeading: "在此手机上未找到就诊信息",
    brokenLinkHeading: "此链接无效",
    brokenLinkText: "链接可能错误或被截断。没有打开任何就诊。",
    replacedLinkHeading: "这个就诊链接无法打开或已经不能用了",
    replacedLinkText: "请向急诊室前台寻求帮助。",
    findVisitHelp:
      "扫描凭条上的 QR 码。您也可以输入打印在它下方的链接。如果仍然失败，请要求前台再次出示 QR 码。",
    waitingHeading: "状态：等候中",
    placeInLine: "您的排队位置：",
    placeCanChange: "如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。",
    waitLabel: "预计还需多久叫您回来：",
    // The wait range line. Under an hour, {low} is a bare number and {high} has the minute word;
    // from an hour, each end is built from the Duration words below.
    waitRangeLong: "{low} 到 {high}",
    simulated: "此估计时间是为演示而模拟的。",
    beforeHeading: "离开前",
    beforeItems: [
      "请保持此页面打开，并让手机保持解锁状态。锁屏状态下，提醒无法唤醒手机。",
      "请保持手机电量充足，并保持声音开启。",
      "请留在 20 分钟内能回到急诊室的地方。",
      "如果您拿到了纸质凭条，请保存好，以便再次扫描上面的二维码。",
    ],
    calledHeading: "请现在回来",
    calledText: "请回到急诊室前台。",
    onMyWay: "我正在路上",
    sending: "正在发送…",
    confirmed: "谢谢。工作人员知道您正在路上。",
    notSaved: "您的回答未保存。工作人员不知道您正在路上。请重试或前往前台。",
    fromHomeHeading: "状态：在家开始，还没有护士看过您",
    fromHomeText: [
      "您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。",
      "此应用不会为您在医院登记，也不会让您在医院外等候。",
      "当您到达急诊室时，请在前台登记并出示此就诊代码。只有工作人员才能让您在医院外等候。",
    ],
    reassessHeading: "请前往分诊台",
    reassessText: "在您重新排队之前，护士需要再次为您检查。",
    arrivedHeading: "状态：在前台准备就绪",
    arrivedText: "工作人员知道您回来了。请在候诊区等候，直到有人叫您。",
    onsiteHeading: "状态：在急诊室内等候",
    onsiteText: "您正在医院内等候。工作人员准备好后会叫您。",
    endedHeading: "您的院外候诊已结束",
    endedText: "请前往急诊室前台。",
    unableText:
      "工作人员无法联系到您，因此这次就诊已离开院外候诊队列。如果您仍需要护理，请来急诊室前台。",
    removedText:
      "工作人员已结束此次就诊的院外候诊。如果您仍需要护理，请来急诊室前台。",
    expiredHeading: "此就诊请求已过期",
    expiredHelp: "如果您仍需要护理，请前往急诊室前台。",
    expiredNewVisit: "或者在起始页开始一次新的演示就诊。",
  },
  progress: {
    label: "您的就诊",
    triage: "分诊",
    waiting: "等候",
    headBack: "返回",
    atDesk: "到达服务台",
    minutesLeft: "{minutes} 分钟",
    leftToTap: "内点击我在路上",
  },
  announce: {
    called: "轮到您了。请现在回到急诊室。",
    onTheWay: "谢谢。工作人员知道您正在路上。",
    arrived: "工作人员已将您标记为回到急诊室。",
    ended: "您的院外候诊已结束。",
    reassess: "请前往分诊台。",
    stillHere: "请点击按钮确认您还在这里。",
    secondAlert: "紧急：请立即回到急诊室。",
    waiting: "您现在已进入院外候诊队列。此页面显示您在队列中的位置。",
    onsite: "请在急诊室内等候。工作人员准备好后会叫您。",
    expired: "此就诊请求已过期。如果您仍需要护理，请前往急诊室前台。",
  },
  slip: {
    typeLink: "或者在手机浏览器中输入此链接：",
  },
  stillHere: {
    heading: "您还在关注您的就诊吗？",
    button: "我还在",
    thanks: "谢谢。",
    meaning: "这告诉工作人员您仍在等待。这不是对您健康状况的检查。",
    notSaved: "您的点击未保存。工作人员可能不知道您仍在等待。请重试。",
  },
  secondAlert: "请立即回到急诊室。工作人员可能会拨打您的电话。",
  returnNow: {
    lead: "我们没有收到您的消息。",
    text: "请现在回来。如果您不回复，工作人员将审查您的就诊。",
  },
  sound: {
    notice:
      "当您被叫到时，此演示可以播放声音。如果您的手机允许，它也会振动。警报仅在此页面打开且手机未锁定时有效。请关闭手机的静音模式，以便听到声音。",
    turnOn: "开启声音",
    on: "声音已开启",
    failed: "此手机无法启动声音。请留意此屏幕，查看何时叫到您。",
    turnOff: "关闭声音",
    offWhileCalled: "声音已关闭。点击“开启声音”以接收声音警报。",
  },
  pausedHeading: "院外候诊已暂停",
  textSize: { label: "文本大小", normal: "正常", large: "大", extraLarge: "超大" },
  language: {
    label: "选择语言",
    draftNotice: "此翻译是草稿。流利的母语人士尚未检查过它。",
    draftTag: "草稿",
    interpreter: "需要其他语言？请向急诊室前台申请免费翻译人员。",
  },
  survey: {
    question: "您如何评价您的等待体验？",
    low: "0 = 非常差",
    high: "10 = 极好",
    submit: "提交",
    thanks: "感谢您的反馈。",
    note: "回答是可选的。您的名字不会被保存。",
    notSaved: "您的回答未保存。请重试。",
  },
  offline: "您已离线。请重新连接到互联网以查看您的状态。",
};

/** Hour and minute words for the wait range (lib/waitText.ts). */
export const zhDuration: DurationWords = {
  locale: "zh",
  hour: { other: "{n} 小时" },
  minute: { other: "{n} 分钟" },
  join: "{h} {m}",
};
