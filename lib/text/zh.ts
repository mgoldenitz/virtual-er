// Patient text in Mandarin (Simplified Chinese). DRAFT: written by Gemini 3.1 Pro on 2026-11-10/11
// (handoffs/archive/2026-11-10-gemini-translations-phase3.md) and not yet approved by a
// fluent speaker. The sound lines are a later draft by Gemini Hydrogen 4 (2026-11-15,
// handoffs/archive/2026-11-14-gemini-sound-text.md), also not yet approved.
// Same shape as lib/text/en.ts; words in {braces} are filled in by the app.

import type { PatientText } from "./en";

export const zh: PatientText = {
  emergencyLine: "如果您的症状恶化，请立即拨打 911 或回到急诊室。",
  footer: "概念原型。与 Trillium Health Partners 无关，也未获得其认可。仅为演示数据。",
  appName: "虚拟候诊室",
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
    demoScreens: "演示屏幕",
    staffScreen: "工作人员屏幕",
    patientScreen: "患者屏幕",
    dashboard: "仪表板",
  },
  expiredText:
    "您在 6 小时前开始了这次就诊。它从未在分诊处登记过。工作人员不再期望您的到来。",
  patient: {
    loading: "正在加载您的就诊信息…",
    unavailableHeading: "我们无法加载您的就诊信息",
    unavailableText:
      "您在此页面上的操作没有被保存。工作人员可能看不到它们。请前往急诊室前台。",
    noVisitHeading: "在此手机上未找到就诊信息",
    brokenLinkHeading: "此链接无效",
    brokenLinkText: "链接可能错误或被截断。没有打开任何就诊。",
    findVisitHelp:
      "扫描凭条上的 QR 码。您也可以输入打印在它下方的链接。如果仍然失败，请要求前台再次出示 QR 码。",
    waitingHeading: "状态：等候中",
    placeInLine: "您的排队位置：",
    placeCanChange: "如果有更紧急的患者到达，您的位置可能会改变。最紧急的患者总是优先就诊。",
    waitLabel: "预计还需多久叫您回来：",
    waitRange: "{low} 到 {high} 分钟",
    simulated: "此估计时间是为演示而模拟的。",
    calledHeading: "请现在回来",
    calledText: "请回到急诊室前台。",
    onMyWay: "我正在路上",
    sending: "正在发送…",
    confirmed: "谢谢。工作人员知道您正在路上。",
    notSaved: "您的回答未保存。工作人员不知道您点击了它。请重试或去前台。",
    fromHomeHeading: "状态：在家开始，尚未分诊",
    fromHomeText: [
      "您的排队位置从护士在分诊处（triage）看到您时开始算起。最紧急的患者总是优先就诊。",
      "此应用程序不会为您注册或允许您在院外候诊。",
      "如果您去急诊室，请遵循其正常步骤。向工作人员出示此就诊代码。只有工作人员才能批准院外候诊。",
    ],
    reassessHeading: "请前往分诊台",
    reassessText: "护士需要再次为您检查。这将在您重新加入队伍之前进行。",
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
  announce: {
    called: "您已被叫回。请现在回到急诊室。",
    onTheWay: "谢谢。工作人员知道您正在路上。",
    arrived: "工作人员已将您标记为回到急诊室。",
    ended: "您的院外候诊已结束。",
    reassess: "请前往分诊台。",
    stillHere: "请点击按钮确认您还在这里。",
    secondAlert: "紧急：请立即回到急诊室。",
  },
  slip: {
    typeLink: "或者在手机浏览器中输入此链接：",
  },
  stillHere: {
    heading: "您还在关注您的就诊吗？",
    button: "我还在",
    thanks: "谢谢。",
    meaning: "这告诉工作人员您仍在等待。这不是对您健康状况的检查。",
  },
  secondAlert: "请立即回到急诊室。工作人员可能会试图联系您。",
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
  },
  survey: {
    question: "您如何评价您的等待体验？",
    low: "0 = 非常差",
    high: "10 = 极好",
    submit: "提交",
    thanks: "感谢您的反馈。",
    note: "回答是可选的。您的名字不会被保存。",
  },
  offline: "您已离线。请重新连接到互联网以查看您的状态。",
};
