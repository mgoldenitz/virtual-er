// The survey rules (SPEC line 69 and hard rule 5): which survey step the patient's phone shows,
// and which scores may be sent. The database function submit_survey checks the same things.

import type { PatientView } from "./patientView";

/** "ask" = show the question; "thanks" = the score is saved; null = no survey on this screen. */
export type SurveyStep = "ask" | "thanks" | null;

/**
 * Only a closed visit that arrived gets the survey (an arrived visit always waited off-site).
 * After the score is saved, the phone says thank you instead, also after an Undo and a second arrival.
 * savedHere is true when this phone saved the score but the read after it has not come back yet.
 */
export function surveyStep(view: PatientView, savedHere = false): SurveyStep {
  if (view.status !== "arrived" || !view.closed) return null;
  if (view.surveyDone || savedHere) return "thanks";
  return "ask";
}

/** A whole number from 0 to 10. */
export function isSurveyScore(score: number): boolean {
  return Number.isInteger(score) && score >= 0 && score <= 10;
}
