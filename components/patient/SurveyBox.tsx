"use client";

// The survey on the patient's "Ready at the desk" screen: one question, a score from 0 to 10, and Submit.
// It shows only after the visit is closed and arrived, and only once (lib/survey.ts decides which step).

import { useState, type FormEvent } from "react";
import { submitSurvey } from "@/data/patientVisit";
import type { PatientView } from "@/lib/patientView";
import { isSurveyScore, surveyStep } from "@/lib/survey";
import { textFor } from "@/lib/text";
import { Button } from "@/components/Button";

/** The 11 scores the patient can pick, 0 to 10. */
const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Props = {
  view: PatientView;
  /** The visit's token, sent with the score. */
  token: string;
  language: string;
};

export function SurveyBox({ view, token, language }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [notSaved, setNotSaved] = useState(false);
  const t = textFor(language).survey;
  const step = surveyStep(view);

  if (step === null) return null;
  if (step === "thanks") {
    return (
      <p role="status" className="clean-card font-semibold">
        {t.thanks}
      </p>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (score === null || !isSurveyScore(score) || sending) return;
    setSending(true);
    const result = await submitSurvey(token, score);
    setSending(false);
    // On "saved" the page re-reads the visit, so the step turns to "thanks" by itself.
    setNotSaved(result !== "saved");
  }

  return (
    <form onSubmit={onSubmit} className="clean-card space-y-3">
      <fieldset className="space-y-3">
        <legend className="text-lg font-bold">{t.question}</legend>
        <div className="flex flex-wrap gap-2">
          {SCORES.map((n) => (
            <label
              key={n}
              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-slate-700 px-2 font-semibold"
            >
              <input
                type="radio"
                name="survey-score"
                value={n}
                checked={score === n}
                onChange={() => setScore(n)}
                className="h-5 w-5"
              />
              {n}
            </label>
          ))}
        </div>
        <div className="flex justify-between gap-2 text-sm">
          <span>{t.low}</span>
          <span>{t.high}</span>
        </div>
      </fieldset>
      <p className="text-sm">{t.note}</p>
      <Button type="submit" disabled={sending} className="w-full text-lg">
        {t.submit}
      </Button>
      {notSaved && (
        <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
          {t.notSaved}
        </p>
      )}
    </form>
  );
}
