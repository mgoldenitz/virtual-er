"use client";

// The survey on the patient's "Ready at the desk" screen. It decides which step shows
// (lib/survey.ts): nothing, the form (SurveyForm.tsx), or the thank-you.

import { useEffect, useRef, useState } from "react";
import type { PatientView } from "@/lib/patientView";
import { surveyStep } from "@/lib/survey";
import { textFor } from "@/lib/text";
import { FocusBox } from "./FocusBox";
import { SurveyForm } from "./SurveyForm";

type Props = {
  view: PatientView;
  /** The visit's token, sent with the score. */
  token: string;
  language: string;
  /** Called when the survey leaves the page with focus inside it (for example staff press Undo). */
  onFocusLost?: () => void;
};

export function SurveyBox({ view, token, language, onFocusLost = () => {} }: Props) {
  // True when this phone got "saved" back, so the thank-you shows before the next read.
  const [savedHere, setSavedHere] = useState(false);
  const thanks = useRef<HTMLParagraphElement>(null);
  const t = textFor(language).survey;
  const step = surveyStep(view, savedHere);

  // After a Submit on this phone, the form is gone, so focus moves to the thank-you.
  // A thank-you that was already there (an old score) does not take focus.
  useEffect(() => {
    if (savedHere) thanks.current?.focus();
  }, [savedHere]);

  if (step === null) return null;
  // One box for both steps, so the box stays when the form changes to the thank-you,
  // and leaves only when the whole survey goes.
  return (
    <FocusBox onFocusLost={onFocusLost}>
      {step === "ask" ? (
        <SurveyForm token={token} language={language} onSaved={() => setSavedHere(true)} />
      ) : (
        <p ref={thanks} role="status" tabIndex={-1} className="clean-card font-semibold">
          {t.thanks}
        </p>
      )}
    </FocusBox>
  );
}
