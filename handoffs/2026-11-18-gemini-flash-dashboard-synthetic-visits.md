# Gemini 3.6 Flash, High: synthetic visits for the dashboard numbers

Use a new Gemini chat. Paste everything below the line. All data is invented; there are no keys, tokens or real patients in this file.

What to bring back to Claude: the whole answer (the JSON block and the expected numbers). Claude checks every number against the rules by hand before it goes into `lib/dashboardNumbers.test.ts`.

---

You are helping test a dashboard for a concept prototype of a virtual ER waiting room. All data is synthetic. Write test data and the numbers it must produce. Your job is to find cases that break a careless implementation, not easy cases.

## The visit record

Each visit has these fields (times are ISO 8601 strings with an offset, or null):

- site: "A" or "B"
- source: "home" or "desk"
- ctas_level: 4, 5 or null
- status: one of pre_arrival, waiting, called, on_the_way, arrived, unable_to_reach, needs_reassessment, removed, declined, not_eligible
- removed_reason: "left", "no_show" or null (set only when status is removed)
- created_at, triaged_at, offered_at, called_at, arrived_at, closed_at
- survey_score: whole number 0 to 10, or null
- is_demo: true or false

## The rules

"Today" is 2026-11-18 in America/Toronto time (Eastern Standard Time, UTC-05:00 on that date). An event counts today only if its time, converted to Toronto time, falls on 2026-11-18. For example 2026-11-19T03:30:00Z is 22:30 on 2026-11-18 in Toronto, so it counts; 2026-11-18T04:30:00Z is 23:30 on 2026-11-17, so it does not.

Compute the numbers for real visits only (is_demo false). Demo visits never count. Give each number for site A and site B apart.

"Now" (no date check):
- waitingNow: status waiting.
- recalledNow: status called or on_the_way.
- reassessmentNow: status needs_reassessment.

"Today" (each on its own date field):
- triaged: ctas_level 4 or 5, and triaged_at today.
- offered: offered_at today.
- declined: status declined, and offered_at today.
- accepted: offered minus declined.
- arrivedAfterRecall: status arrived, called_at not null, and arrived_at today.
- recallToArrivalSeconds: the sum of (arrived_at minus called_at) in seconds over the arrivedAfterRecall visits.
- noShows: status removed, removed_reason no_show, closed_at today.
- left: status removed, removed_reason left, closed_at today.
- unableToReach: status unable_to_reach, closed_at today.
- startedFromHome: source home, created_at today.
- homeReachedTriage: of the startedFromHome visits, those with triaged_at not null.
- surveyResponses: survey_score not null, closed_at today.
- surveyScoreSum: the sum of those survey scores.
- survey9or10: of those, survey_score 9 or 10.

Then the shown values:
- offeredShare = round(offered / triaged * 100), or null when triaged is 0.
- acceptedShare = round(accepted / offered * 100), or null when offered is 0.
- averageMinutes = round(recallToArrivalSeconds / arrivedAfterRecall / 60), or null when arrivedAfterRecall is 0.
- averageScore = surveyScoreSum / surveyResponses rounded to 1 decimal place, or null when surveyResponses is 0.
- nineOrTenShare = round(survey9or10 / surveyResponses * 100), or null when surveyResponses is 0.
Round halves up (12.5 gives 13).

## What to write

1. 15 to 20 visits as one JSON array. Include at least: a visit whose event is just before Toronto midnight and one just after it; a visit offered yesterday and declined (it must not count); a demo visit that would change every number if it counted; a desk arrival with no called_at; a home visit created today but not triaged; a removed visit with each removed_reason; a survey of 0 and a survey of 10; a site with no triaged visits today (so its offeredShare is null).
2. For each site, every count above and every shown value.
3. For each tricky visit, one line on which numbers it changes and why.

Keep the times realistic (a visit is triaged after it is created, called after it is triaged, and so on).

## Response

Pasted by the owner on 2026-11-18 (Gemini 3.6 Flash, High). JSON compacted to one line per visit by Claude; values unchanged. The table is copied as a list.

### Synthetic visits JSON

```json
[
  {"site": "A", "source": "home", "ctas_level": 4, "status": "removed", "removed_reason": "no_show", "created_at": "2026-11-18T04:10:00Z", "triaged_at": "2026-11-18T04:20:00Z", "offered_at": "2026-11-18T04:25:00Z", "called_at": "2026-11-18T04:35:00Z", "arrived_at": null, "closed_at": "2026-11-18T04:58:00Z", "survey_score": 10, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 4, "status": "arrived", "removed_reason": null, "created_at": "2026-11-18T04:30:00Z", "triaged_at": "2026-11-18T04:40:00Z", "offered_at": "2026-11-18T04:45:00Z", "called_at": "2026-11-18T04:50:00Z", "arrived_at": "2026-11-18T05:02:30Z", "closed_at": "2026-11-18T05:15:00Z", "survey_score": 0, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 5, "status": "declined", "removed_reason": null, "created_at": "2026-11-17T23:10:00-05:00", "triaged_at": "2026-11-17T23:20:00-05:00", "offered_at": "2026-11-17T23:25:00-05:00", "called_at": null, "arrived_at": null, "closed_at": "2026-11-18T00:10:00-05:00", "survey_score": null, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 4, "status": "declined", "removed_reason": null, "created_at": "2026-11-18T08:00:00-05:00", "triaged_at": "2026-11-18T08:10:00-05:00", "offered_at": "2026-11-18T08:12:00-05:00", "called_at": null, "arrived_at": null, "closed_at": "2026-11-18T08:12:00-05:00", "survey_score": null, "is_demo": false},
  {"site": "A", "source": "home", "ctas_level": 4, "status": "arrived", "removed_reason": null, "created_at": "2026-11-18T09:00:00-05:00", "triaged_at": "2026-11-18T09:20:00-05:00", "offered_at": "2026-11-18T09:25:00-05:00", "called_at": "2026-11-18T10:00:00-05:00", "arrived_at": "2026-11-18T10:12:30-05:00", "closed_at": "2026-11-18T10:45:00-05:00", "survey_score": 10, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 5, "status": "arrived", "removed_reason": null, "created_at": "2026-11-18T11:00:00-05:00", "triaged_at": "2026-11-18T11:10:00-05:00", "offered_at": "2026-11-18T11:15:00-05:00", "called_at": null, "arrived_at": "2026-11-18T11:40:00-05:00", "closed_at": "2026-11-18T12:00:00-05:00", "survey_score": 9, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 4, "status": "removed", "removed_reason": "no_show", "created_at": "2026-11-18T12:10:00-05:00", "triaged_at": "2026-11-18T12:20:00-05:00", "offered_at": "2026-11-18T12:25:00-05:00", "called_at": "2026-11-18T13:00:00-05:00", "arrived_at": null, "closed_at": "2026-11-18T13:30:00-05:00", "survey_score": 8, "is_demo": false},
  {"site": "A", "source": "home", "ctas_level": 5, "status": "removed", "removed_reason": "left", "created_at": "2026-11-18T13:40:00-05:00", "triaged_at": "2026-11-18T14:00:00-05:00", "offered_at": "2026-11-18T14:05:00-05:00", "called_at": null, "arrived_at": null, "closed_at": "2026-11-18T14:30:00-05:00", "survey_score": null, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 4, "status": "unable_to_reach", "removed_reason": null, "created_at": "2026-11-17T21:50:00-05:00", "triaged_at": "2026-11-17T22:00:00-05:00", "offered_at": "2026-11-17T22:05:00-05:00", "called_at": "2026-11-17T23:30:00-05:00", "arrived_at": null, "closed_at": "2026-11-18T00:05:00-05:00", "survey_score": null, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": null, "status": "not_eligible", "removed_reason": null, "created_at": "2026-11-18T15:00:00-05:00", "triaged_at": "2026-11-18T15:05:00-05:00", "offered_at": null, "called_at": null, "arrived_at": null, "closed_at": "2026-11-18T15:05:00-05:00", "survey_score": null, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 4, "status": "waiting", "removed_reason": null, "created_at": "2026-11-17T22:30:00-05:00", "triaged_at": "2026-11-17T22:40:00-05:00", "offered_at": "2026-11-17T22:45:00-05:00", "called_at": null, "arrived_at": null, "closed_at": null, "survey_score": null, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 5, "status": "not_eligible", "removed_reason": null, "created_at": "2026-11-18T16:00:00-05:00", "triaged_at": "2026-11-18T16:08:00-05:00", "offered_at": null, "called_at": null, "arrived_at": null, "closed_at": "2026-11-18T16:08:00-05:00", "survey_score": null, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 4, "status": "on_the_way", "removed_reason": null, "created_at": "2026-11-17T23:00:00-05:00", "triaged_at": "2026-11-17T23:10:00-05:00", "offered_at": "2026-11-17T23:15:00-05:00", "called_at": "2026-11-18T21:45:00-05:00", "arrived_at": null, "closed_at": null, "survey_score": null, "is_demo": false},
  {"site": "A", "source": "desk", "ctas_level": 5, "status": "needs_reassessment", "removed_reason": null, "created_at": "2026-11-17T23:05:00-05:00", "triaged_at": "2026-11-17T23:15:00-05:00", "offered_at": "2026-11-17T23:20:00-05:00", "called_at": "2026-11-18T17:00:00-05:00", "arrived_at": "2026-11-18T17:10:00-05:00", "closed_at": null, "survey_score": null, "is_demo": false},
  {"site": "A", "source": "home", "ctas_level": 5, "status": "removed", "removed_reason": "left", "created_at": "2026-11-19T05:01:00Z", "triaged_at": "2026-11-19T05:05:00Z", "offered_at": "2026-11-19T05:08:00Z", "called_at": null, "arrived_at": null, "closed_at": "2026-11-19T05:15:00Z", "survey_score": 10, "is_demo": false},
  {"site": "A", "source": "home", "ctas_level": 5, "status": "not_eligible", "removed_reason": null, "created_at": "2026-11-19T04:30:00Z", "triaged_at": "2026-11-19T04:50:00Z", "offered_at": null, "called_at": null, "arrived_at": null, "closed_at": "2026-11-19T04:50:00Z", "survey_score": null, "is_demo": false},
  {"site": "A", "source": "home", "ctas_level": null, "status": "pre_arrival", "removed_reason": null, "created_at": "2026-11-18T22:15:00-05:00", "triaged_at": null, "offered_at": null, "called_at": null, "arrived_at": null, "closed_at": null, "survey_score": null, "is_demo": false},
  {"site": "A", "source": "home", "ctas_level": 4, "status": "arrived", "removed_reason": null, "created_at": "2026-11-18T14:00:00-05:00", "triaged_at": "2026-11-18T14:10:00-05:00", "offered_at": "2026-11-18T14:15:00-05:00", "called_at": "2026-11-18T14:30:00-05:00", "arrived_at": "2026-11-18T16:30:00-05:00", "closed_at": "2026-11-18T17:00:00-05:00", "survey_score": 10, "is_demo": true},
  {"site": "B", "source": "desk", "ctas_level": 4, "status": "called", "removed_reason": null, "created_at": "2026-11-17T23:30:00-05:00", "triaged_at": "2026-11-17T23:45:00-05:00", "offered_at": "2026-11-18T00:15:00-05:00", "called_at": "2026-11-18T00:45:00-05:00", "arrived_at": null, "closed_at": null, "survey_score": null, "is_demo": false},
  {"site": "B", "source": "home", "ctas_level": 5, "status": "waiting", "removed_reason": null, "created_at": "2026-11-18T10:00:00-05:00", "triaged_at": "2026-11-18T10:15:00-05:00", "offered_at": "2026-11-18T10:20:00-05:00", "called_at": null, "arrived_at": null, "closed_at": null, "survey_score": null, "is_demo": true}
]
```

### Expected dashboard numbers (as pasted)

All metrics computed on 2026-11-18 in America/Toronto (UTC-05:00) for is_demo false.

- waitingNow: A 1, B 0. A: visits[10]; B: visits[19] is demo.
- recalledNow: A 1, B 1. A: visits[12] (on_the_way); B: visits[18] (called).
- reassessmentNow: A 1, B 0. A: visits[13].
- triaged: A 7, B 0. A: visits[3, 4, 5, 6, 7, 11, 15].
- offered: A 5, B 1. A: visits[3, 4, 5, 6, 7]; B: visits[18].
- declined: A 1, B 0. A: visits[3] (visits[2] was offered yesterday).
- accepted: A 4, B 1.
- arrivedAfterRecall: A 2, B 0. A: visits[1, 4].
- recallToArrivalSeconds: A 1500, B 0. 750 + 750.
- noShows: A 1, B 0. A: visits[6] (visits[0] closed yesterday in Toronto).
- left: A 1, B 0. A: visits[7] (visits[14] closed tomorrow in Toronto).
- unableToReach: A 1, B 0. A: visits[8].
- startedFromHome: A 4, B 0. A: visits[4, 7, 15, 16].
- homeReachedTriage: A 3, B 0. A: visits[4, 7, 15].
- surveyResponses: A 4, B 0. A: visits[1, 4, 5, 6].
- surveyScoreSum: A 27, B 0. 0 + 10 + 9 + 8.
- survey9or10: A 2, B 0. visits[4] and visits[5].
- offeredShare: A 71, B null. round(5 / 7 * 100).
- acceptedShare: A 80, B 100.
- averageMinutes: A 13, B null. round(12.5).
- averageScore: A 6.8, B null. 27 / 4 = 6.75.
- nineOrTenShare: A 50, B null.

### Tricky visits (as pasted, shortened)

- visits[0]: nothing (23:10 to 23:58 on 2026-11-17 Toronto); catches UTC date slicing.
- visits[1]: arrivedAfterRecall +1, +750 s, surveyResponses +1 with score 0 (arrived 00:02:30, closed 00:15 Toronto on 2026-11-18; called the day before).
- visits[2]: nothing; offered yesterday, closed today.
- visits[3]: triaged, offered, declined +1.
- visits[4]: triaged, offered, arrivedAfterRecall, startedFromHome, homeReachedTriage, surveyResponses, survey9or10 +1; +750 s; +10 score.
- visits[5]: triaged, offered, surveyResponses, survey9or10 +1; +9; no called_at, so no arrival count.
- visits[6]: triaged, offered, noShows, surveyResponses +1; +8.
- visits[7]: triaged, offered, left, startedFromHome, homeReachedTriage +1.
- visits[8]: unableToReach +1 only (closed 00:05 Toronto).
- visits[9]: nothing (ctas_level null).
- visits[10]: waitingNow +1 only.
- visits[12], [13]: recalledNow +1; reassessmentNow +1 only (status not arrived).
- visits[14], [15]: [15] (04:50Z on 11-19 = 23:50 on 11-18) adds startedFromHome, homeReachedTriage, triaged; [14] (00:01 to 00:15 on 11-19) nothing.
- visits[16]: startedFromHome +1 only.
- visits[17], [19]: demo, nothing.
- visits[18]: recalledNow, offered, accepted +1; triaged stays 0, so offeredShare is null.
