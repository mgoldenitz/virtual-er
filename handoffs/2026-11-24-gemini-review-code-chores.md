# Gemini review: code chores (commit e166751)

Model: Gemini Hydrogen 4, High, in a new chat. If you have no Hydrogen 4 credits, use Gemini 3.6 Flash, High.

## Question to ask

This commit must not change what the app does. Find problems. Do not confirm. Look for: a name that is still imported somewhere after its `export` was removed, a test that was lost or changed in the split, a shared value in the fixtures file that a test changes so that one test can affect another, and any file over 300 lines.

## What changed

Part 1: `export` removed from 12 names. Each name is used only in its own file (searched with grep: 2 hits each, the definition and one use).

```
data/serverClock.ts        -export function syncClock(): void {
e2e/helpers/flows.ts       -export async function patientCode(patient: Page): Promise<string> {
lib/clockOffset.ts         -export const MAX_ROUND_TRIP_MS = 5_000;
lib/demoPlanPrompt.ts      -export const DEMO_PLAN_RULES: string[] = [
lib/expectedArrivals.ts    -export const EXPECTED_ARRIVAL_HOURS = 6;
lib/failedRead.ts          -export const FAILED_READS_BEFORE_UNAVAILABLE = 2;
lib/followUp.ts            -export function wasAnswered(visit: Pick<Visit, "last_phone_result" | "followup_paused_until">): boolean {
lib/homeCheckIn.ts         -export const STAFF_STATUS_LABEL: Record<VisitStatus, string> = {
lib/recallAlert.ts         -export const ALERT_WINDOW_MINUTES = 2;
lib/startVisitRequest.ts   -export const START_LANGUAGES = LANGUAGE_CODES;
lib/visitActions.ts        -export function canTriageAgain(visit: Visit, now: Date): boolean {
lib/visitActions.ts        -export function statusBeforeClose(visit: Visit): VisitStatus {
```

Each line changes only by the word `export` (12 files, 1 line each, 2 in `lib/visitActions.ts`).

Part 2: `lib/dashboardNumbers.test.ts` (312 lines) split into 3 files. Attach these 3 files to the chat:

- `lib/dashboardNumbers.fixtures.ts` (63 lines, new): `today`, `thisDay`, `yesterday`, `visit()`, `statsRow()`, `siteA()`. Each helper returns a new object on every call.
- `lib/dashboardNumbers.test.ts` (166 lines, was 312): live now, triage and offers, call-back to arrival, closed visits, visits from home, survey.
- `lib/dashboardNumbers.rules.test.ts` (88 lines, new): demo and site rules, empty day.

## Checked

- The moved text matches the old file (`diff` of old lines 229-312 against the new rules file, and of old lines 4-63 against the fixtures file, with `export` removed: no difference).
- 20 `it(` tests before and 20 after.
- `npm test`: 138 test files, 974 tests pass. `npm run lint`: exit 0. `npm run build`: passed.

## Not checked

- Any import from outside the repo (none is expected; this is not a library).

## Bring back

Paste the answer below under "Response".
