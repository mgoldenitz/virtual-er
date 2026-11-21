"use client";

// The survey on the patient's "Ready at the desk" screen. This file picks the step (lib/survey.ts):
// nothing, the thank-you, or the question. The question itself is SurveyForm.
// It shows only after the visit is closed and arrived, and only once.

import type { PatientView } from "@/lib/patientView";
import { surveyStep } from "@/lib/survey";
import { textFor } from "@/lib/text";
import { SurveyForm } from "./SurveyForm";

type Props = {
  view: PatientView;
  /** The visit's token, sent with the score. */
  token: string;
  language: string;
  /** True when this phone saved the score, even if the read after it has not come back yet. */
  saved?: boolean;
  /** Called when the score is saved. */
  onSaved?: () => void;
  /** Called when the survey form leaves the page with focus inside it. */
  onFocusLost?: () => void;
};

export function SurveyBox({ view, token, language, saved, onSaved, onFocusLost }: Props) {
  const t = textFor(language).survey;
  const step = surveyStep(view, saved ?? false);

  if (step === null) return null;
  if (step === "thanks") {
    return (
      <p role="status" className="clean-card font-semibold">
        {t.thanks}
      </p>
    );
  }
  return <SurveyForm token={token} language={language} onSaved={onSaved} onFocusLost={onFocusLost} />;
}
