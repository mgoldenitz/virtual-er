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
