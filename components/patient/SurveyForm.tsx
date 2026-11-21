"use client";

// The survey form: one question, a score from 0 to 10, and Submit.
// SurveyBox shows it only on the "ask" step, so the score and the alert start empty each time it shows.

import { useId, useState, type FormEvent } from "react";
import { submitSurvey } from "@/data/patientVisit";
import { isSurveyScore } from "@/lib/survey";
import { textFor } from "@/lib/text";
import { Button } from "@/components/Button";

/** The 11 scores the patient can pick, 0 to 10. */
const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Props = {
  /** The visit's token, sent with the score. */
  token: string;
  language: string;
  /** Called when the database answers "saved". */
  onSaved: () => void;
};

export function SurveyForm({ token, language, onSaved }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [notSaved, setNotSaved] = useState(false);
  const scaleId = useId();
  const t = textFor(language).survey;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Submit is only grayed out (aria-disabled), so a press still comes here: this line stops it.
    if (score === null || !isSurveyScore(score) || sending) return;
    // Remove the old alert first, so a second failure is a new alert and is read out again.
    setNotSaved(false);
    setSending(true);
    const result = await submitSurvey(token, score);
    setSending(false);
    if (result === "saved") onSaved();
    else setNotSaved(true);
  }

  return (
    <form onSubmit={onSubmit} className="clean-card space-y-3">
      <fieldset aria-describedby={scaleId} className="space-y-3">
        <legend className="text-lg font-bold">{t.question}</legend>
        {/* The 0 and 10 labels come before the scores, so a screen reader reads what the ends mean first. */}
        <div id={scaleId} className="flex justify-between gap-2 text-sm">
          <span>{t.low}</span>
          <span>{t.high}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {SCORES.map((n) => (
            <label
              key={n}
              className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1 rounded-xl border-2 border-control bg-card px-2 font-semibold"
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
      </fieldset>
      <p className="text-sm">{t.note}</p>
      <Button type="submit" aria-disabled={score === null || sending} className="w-full text-lg">
        {/* The same "Sending…" words as the "I'm on my way" button (PatientStatus.tsx). */}
        {sending ? textFor(language).patient.sending : t.submit}
      </Button>
      {notSaved && (
        <p role="alert" className="rounded-lg border-2 border-red-800 p-3 font-semibold text-red-900">
          {t.notSaved}
        </p>
      )}
    </form>
  );
}
