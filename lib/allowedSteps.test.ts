import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ALLOWED_MOVES, START_STATUSES, TRIAGE_STATUSES, isAllowedMove } from "./allowedSteps";
import { CALL_REVIEW_MINUTES } from "./demoTimes";
import type { Visit } from "./visit";
import {
  callBack,
  checkInAtDesk,
  checkInHomeVisit,
  confirmOnMyWay,
  confirmUnableToReach,
  issueNewLink,
  markArrived,
  markRemoved,
  markSeen,
  recordPhoneCall,
  reopenUnableToReach,
  startFromHome,
  undoClose,
} from "./visitActions";
import { PAUSE_REFUSED, STEP_REFUSED } from "./saveResult";

// The newest migration that makes the trigger function: that is the one the database runs.
// Only "create (or replace) function" counts, so a later "drop function" or "grant ... on
// function" line does not make the test read the wrong file.
function newestTriggerSql(): string {
  const dir = "supabase/migrations";
  const makesTrigger = /create\s+(or\s+replace\s+)?function\s+public\.visits_check_step\s*\(/i;
  const files = readdirSync(dir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .filter((name) => makesTrigger.test(readFileSync(`${dir}/${name}`, "utf8")));
  return readFileSync(`${dir}/${files[files.length - 1]}`, "utf8");
}

// Removes "/* ... */" and "--" comments, so a move that is commented out does not count.
const withoutComments = (sql: string) => sql.replace(/\/\*[\s\S]*?\*\//g, "").replace(/--.*$/gm, "");

// One move in SQL, such as ('waiting', 'called'). Group 1 is the "from" status, group 2 the "to" status.
const PAIR = /\(\s*'(\w+)'\s*,\s*'(\w+)'\s*\)/g;

// The "from>to" moves between the start and end markers of a SQL file. The start marker is the whole
// line, because the check file has another comment that begins "-- allowed moves".
function pairsBetweenMarkers(sql: string): string[] {
  const start = "-- allowed moves (keep the same as lib/allowedSteps.ts)";
  const block = withoutComments(sql.split(start)[1].split("-- end of allowed moves")[0]);
  return [...block.matchAll(PAIR)].map((m) => `${m[1]}>${m[2]}`).sort();
}

// The moves in lib/allowedSteps.ts, as "from>to" pairs.
const libMoves = (): string[] =>
  Object.entries(ALLOWED_MOVES).flatMap(([from, tos]) => tos!.map((to) => `${from}>${to}`)).sort();

const t0 = new Date("2026-11-09T20:00:00Z");
const at = (min: number) => new Date(t0.getTime() + min * 60_000);
const input = { id: "v1", code: "ABC234", access_token: "TOKEN", site: "A" as const, ctas_level: 4 as const, language: "en" };
const triage = { ctas_level: 4 as const, language: "en" };

// One visit in each status, made with the app's own rules.
const home = startFromHome(input, t0);
const waiting = checkInAtDesk(input, "waiting", t0);
const called = callBack(waiting, at(1))!;
const onTheWay = confirmOnMyWay(called, at(2))!;
const unableToReach = confirmUnableToReach(called, at(1 + CALL_REVIEW_MINUTES))!;
const reassess = reopenUnableToReach(unableToReach)!;
const arrived = markArrived(onTheWay, at(3))!;
const removed = markRemoved(called, "left", at(3))!;
const declined = checkInAtDesk(input, "declined", t0);
const notEligible = checkInAtDesk(input, "not_eligible", t0);
const everyStatus = [home, waiting, called, onTheWay, unableToReach, reassess, arrived, removed, declined, notEligible];

// Every rule in lib/visitActions.ts that changes an existing visit, at a time late enough for the phone steps.
const late = at(1 + CALL_REVIEW_MINUTES);
const rules: [string, (v: Visit) => Visit | null][] = [
  ["triage: waiting", (v) => checkInHomeVisit(v, triage, "waiting", t0)],
  ["triage: declined", (v) => checkInHomeVisit(v, triage, "declined", t0)],
  ["triage: not eligible", (v) => checkInHomeVisit(v, triage, "not_eligible", t0)],
  ["recall", (v) => callBack(v, late)],
  ["seen", (v) => markSeen(v, late)],
  ["on my way", (v) => confirmOnMyWay(v, late)],
  ["phone call", (v) => recordPhoneCall(v, "no_answer", late)],
  ["unable to reach", (v) => confirmUnableToReach(v, late)],
  ["reopen", (v) => reopenUnableToReach(v)],
  ["arrived", (v) => markArrived(v, late)],
  ["removed", (v) => markRemoved(v, "no_show", late)],
  ["new link", (v) => issueNewLink(v, "NEWTOKEN")],
  ["undo", (v) => undoClose(v, v)],
];

describe("allowed status moves", () => {
  it("every rule in visitActions makes only moves in the list", () => {
    for (const before of everyStatus) {
      for (const [name, rule] of rules) {
        const after = rule(before);
        if (after) expect(isAllowedMove(before.status, after.status), `${name} from ${before.status}`).toBe(true);
      }
    }
  });

  it("every new visit starts in a start status", () => {
    for (const v of [home, waiting, declined, notEligible]) expect(START_STATUSES).toContain(v.status);
  });

  it("refuses a skipped step", () => {
    expect(isAllowedMove("pre_arrival", "arrived")).toBe(false);
    expect(isAllowedMove("declined", "waiting")).toBe(false);
    expect(isAllowedMove("unable_to_reach", "waiting")).toBe(false);
  });

  it("is the same list as the database trigger", () => {
    const sql = newestTriggerSql();
    const inSql = pairsBetweenMarkers(sql);
    const inLib = libMoves();
    expect(inSql).toEqual(inLib);
    const code = withoutComments(sql);
    const starts = code.match(/new\.status\s+not\s+in\s*\(([^)]*)\)/i)![1].match(/\w+/g)!.sort();
    expect(starts).toEqual([...START_STATUSES].sort());
    // The start check refuses with the step code.
    const startRefusal = /new\.status\s+not\s+in\s*\([^)]*\)\s*then\s+raise\s+exception\s+'[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
    expect(code.match(startRefusal)?.[1]).toBe(STEP_REFUSED);
    // The site check refuses with the step code.
    const siteRefusal = /if\s+new\.site\s+is\s+distinct\s+from\s+old\.site\s+then\s+raise\s+exception\s+'[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
    expect(code.match(siteRefusal)?.[1]).toBe(STEP_REFUSED);
    // The move check is "not in (" a list, its list is the same as lib (read from the check itself,
    // not from the markers), and its refusal uses the step code.
    const moveRefusal = /if\s*\(\s*old\.status\s*,\s*new\.status\s*\)\s+not\s+in\s*\(([\s\S]*?)\)\s*then\s+raise\s+exception\s+'A visit cannot move[^']*'[^;]*?using\s+errcode\s*=\s*'(\w+)'/i;
    const move = code.match(moveRefusal);
    expect([...(move?.[1] ?? "").matchAll(PAIR)].map((m) => `${m[1]}>${m[2]}`).sort()).toEqual(inLib);
    expect(move?.[2]).toBe(STEP_REFUSED);
    // The pause check: a new off-site wait, or a triage into one, reads the pause "for share" and refuses with the pause code.
    const pauseCheck = /if\s+new\.status\s*=\s*'waiting'\s+and\s*\(\s*tg_op\s*=\s*'INSERT'\s+or\s+old\.status\s+in\s*\(([^)]*)\)\s*\)\s*then\s+select\s+offsite_paused\s+into\s+site_paused\s+from\s+public\.site_settings\s+where\s+site\s*=\s*new\.site\s+for\s+share\s*;\s*if\s+site_paused\s+is\s+distinct\s+from\s+false\s+then\s+raise\s+exception\s+'[^']*'\s*,\s*new\.site\s+using\s+errcode\s*=\s*'(\w+)'/i;
    const pause = code.match(pauseCheck);
    expect(pause?.[1].match(/\w+/g)?.sort()).toEqual([...TRIAGE_STATUSES].sort());
    expect(pause?.[2]).toBe(PAUSE_REFUSED);
  });

  it("the check file tries every allowed move", () => {
    const checkSql = readFileSync("supabase/checks/allowed_steps.sql", "utf8");
    expect(pairsBetweenMarkers(checkSql)).toEqual(libMoves());
  });

  it("does not count a move inside either kind of SQL comment", () => {
    const sql = "('a', 'b'),\n/* ('c', 'd'),\n('e', 'f'), */\n-- ('g', 'h'),\n('i', 'j')";
    const pairs = [...withoutComments(sql).matchAll(/\(\s*'(\w+)'\s*,\s*'(\w+)'\s*\)/g)].map((m) => m[1]);
    expect(pairs).toEqual(["a", "i"]);
  });

  it("triage puts a visit in the line only from a triage status", () => {
    const from = everyStatus.filter((v) => checkInHomeVisit(v, triage, "waiting", t0)?.status === "waiting");
    expect(from.map((v) => v.status).sort()).toEqual([...TRIAGE_STATUSES].sort());
  });

  it("has no move to the same status", () => {
    for (const [from, tos] of Object.entries(ALLOWED_MOVES)) expect(tos).not.toContain(from);
  });
});
