# Virtual ER waiting requires clinical safeguards

**Scope/date:** Ontario hospital concept; synthetic-data student prototype. 9 November 2026. No actual Trillium Health Partners (THP) integration or endorsement.

## Bottom line

Virtual ER waiting should offer selected patients a choice of waiting location, not promise faster care. **Post-triage off-site waiting** means clinician-authorized departure after in-person triage, followed by recall for in-person care. It differs from pre-arrival scheduling and virtual clinical consultations. Sault Area Hospital's service coordinates arrival, with triage after arrival; its rules should not be transplanted into a post-triage pathway. ([2](https://sah.on.ca/programs-services/emergency-services/virtual-home-waiting-room/))

## Evidence supports acceptability, not proven safety

In Geneva's observational evaluation, **97 of 100 surveyed patients were satisfied** with the recall service, but only **two waited at home**; most stayed nearby within the hospital. This small, selected convenience sample, without a concurrent control group, does not demonstrate safety equivalence, reduced crowding or shorter waits. Satisfaction with waiting time was only 56/100. Staff adoption faced perceived additional workload. The defensible rationale is patient choice and experience, with clinical outcomes and operational effects requiring evaluation. ([1](https://medinform.jmir.org/2022/9/e34488))

## Safe recall needs clinical ownership

The following are recommended safeguards, not a validated protocol. A clinician should determine eligibility after triage, confirm voluntary participation and return feasibility, and own a feasible reassessment plan. Explain that clinical priority changes: **a guaranteed queue position is not promised**. Worsening symptoms require clinician-approved urgent instructions, not waiting for recall. ([1](https://medinform.jmir.org/2022/9/e34488), [3](https://help.accesstocare.on.ca/helpfiles/eCTASOnlineHelp/Triage_Reassessment/Triage_Reassessment.htm))

Verify contact details and the preferred accessible channel before departure. Track recall sent, acknowledgement, “on my way” and physical return separately: sending proves neither receipt nor attendance. Staff must follow up both non-response and delayed arrival after acknowledgement, document attempts, and review unresolved cases before removal. During downtime or contact failure, pause new off-site enrolment, reconcile outstanding recalls and offer manual or on-site fallback. ([1](https://medinform.jmir.org/2022/9/e34488), [2](https://sah.on.ca/programs-services/emergency-services/virtual-home-waiting-room/))

**No universally validated 10/20/30-minute recall ladder was identified.** Reminder and arrival deadlines need local clinical approval. Acuity-based clinical reassessment is distinct from recall timers; a browser check-in is not reassessment. ([3](https://help.accesstocare.on.ca/helpfiles/eCTASOnlineHelp/Triage_Reassessment/Triage_Reassessment.htm))

## Privacy extends beyond names and hosting

PHIPA can cover identifiable or linkable visit records: ticket codes, site, status and timestamps are not automatically anonymous. Minimize collection and notification content. Even neutral wording or a hospital sender can reveal a care relationship on a shared device. Apply authenticated patient access and least-privilege staff permissions. ([4](https://www.ontario.ca/laws/statute/04p03), [5](https://www.ipc.on.ca/sites/default/files/legacy/2021/02/virtual-health-care-visits.pdf))

Use long, unpredictable, expiring access tokens; a short-code lookup must not bypass that protection. Recommended safeguards include rate limiting, protected audit logging without secrets, encryption in transit and at rest, provider/subprocessor review, breach procedures and approved retention schedules. **A Canadian database alone does not establish compliance**: support access, backups and other data flows matter. Twenty-four-hour deletion is a demo policy, not a universal clinical retention rule. ([5](https://www.ipc.on.ca/sites/default/files/legacy/2021/02/virtual-health-care-visits.pdf), [6](https://www.ipc.on.ca/sites/default/files/legacy/2015/11/phipa-faq.pdf))

## Accessibility covers the whole recall journey

Ontario guidance specifies **WCAG 2.0 AA for applicable public websites/content**, excluding live captions and prerecorded audio description from that website requirement. Recommend WCAG 2.2 AA as a stronger design target, not the statutory minimum. ([7](https://www.ontario.ca/page/how-make-websites-accessible), [8](https://www.w3.org/TR/WCAG22/))

Provide keyboard and screen-reader access, visible focus, labelled controls, adequate touch targets, contrast, 200% text resizing and mobile reflow. Announce meaningful status changes through live regions without repeatedly reading countdowns. Never rely on sound or colour alone. Offer a labelled link/manual route beside QR codes, plain-language instructions, appropriate translations and communication support. Preserve an equitable staff-assisted pathway for people without smartphones, data or usable digital access. Missing an alert should trigger review, not automatic loss of care. ([5](https://www.ipc.on.ca/sites/default/files/legacy/2021/02/virtual-health-care-visits.pdf), [7](https://www.ontario.ca/page/how-make-websites-accessible), [8](https://www.w3.org/TR/WCAG22/))

## Prototype implication: demonstrate states, not readiness

Use synthetic visits and simulated browser alerts only, with no real patient contacts. Demonstrate staff-reviewed exceptions, configurable demo timers and fallback states. Do not present this as remote monitoring or a deployable hospital service.

*Limitations: focused review, not clinical or legal advice. Researchers could not fully render e-Laws or verify current commencement; hospital review must confirm operative requirements.*

## Sources

1. [Ehrler et al., Geneva SMS recall evaluation, 2022](https://medinform.jmir.org/2022/9/e34488).
2. [Sault Area Hospital, Virtual Home Waiting Room](https://sah.on.ca/programs-services/emergency-services/virtual-home-waiting-room/).
3. [Ontario Health, eCTAS triage reassessment](https://help.accesstocare.on.ca/helpfiles/eCTASOnlineHelp/Triage_Reassessment/Triage_Reassessment.htm).
4. [Ontario, PHIPA](https://www.ontario.ca/laws/statute/04p03).
5. [Information and Privacy Commissioner of Ontario, virtual health-care guidance, 2021](https://www.ipc.on.ca/sites/default/files/legacy/2021/02/virtual-health-care-visits.pdf).
6. [Information and Privacy Commissioner of Ontario, PHIPA FAQs, 2015](https://www.ipc.on.ca/sites/default/files/legacy/2015/11/phipa-faq.pdf).
7. [Ontario, How to make websites accessible](https://www.ontario.ca/page/how-make-websites-accessible).
8. [W3C, WCAG 2.2](https://www.w3.org/TR/WCAG22/).
