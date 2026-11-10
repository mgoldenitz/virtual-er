// The shape of one visit, matching the visits table in SPEC.md.
// Times are ISO strings (for example "2026-11-09T20:15:00.000Z"), or null if not set yet.

export type Site = "A" | "B";

export type VisitStatus =
  | "pre_arrival"
  | "waiting"
  | "called"
  | "on_the_way"
  | "arrived"
  | "unable_to_reach"
  | "needs_reassessment"
  | "removed"
  | "declined"
  | "not_eligible";

export type Visit = {
  id: string;
  code: string;
  access_token: string;
  site: Site;
  source: "home" | "desk";
  ctas_level: 4 | 5 | null;
  language: string;
  status: VisitStatus;
  removed_reason: "left" | "no_show" | null;
  created_at: string;
  triaged_at: string | null;
  offered_at: string | null;
  last_still_here_at: string | null;
  called_at: string | null;
  seen_at: string | null;
  confirmed_at: string | null;
  review_flagged_at: string | null;
  arrived_at: string | null;
  closed_at: string | null;
  phone_attempts: number;
  last_phone_result: "answered" | "no_answer" | null;
  followup_paused_until: string | null;
  survey_score: number | null;
  is_demo: boolean;
};

/** Every status, for checking data read back from storage. */
export const ALL_STATUSES: VisitStatus[] = [
  "pre_arrival",
  "waiting",
  "called",
  "on_the_way",
  "arrived",
  "unable_to_reach",
  "needs_reassessment",
  "removed",
  "declined",
  "not_eligible",
];

/** Statuses that are still in the off-site line (not yet closed). */
export const ACTIVE_STATUSES: VisitStatus[] = ["waiting", "called", "on_the_way"];
