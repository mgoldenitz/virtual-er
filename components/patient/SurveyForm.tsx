"use client";

// The form part of the survey: the 0 to 10 scores, the words under them, and Submit.
// SurveyBox shows it only when lib/survey.ts says the question should be asked.

import { useId, useRef, useState, type FormEvent } from "react";
import { submitSurvey } from "@/data/patientVisit";
import { isSurveyScore } from "@/lib/survey";
import { textFor } from "@/lib/text";
import { Button } from "@/components/Button";
import { useReportFocusOnLeave } from "./useFocusRescue";

/** The 11 scores the patient can pick, 0 to 10. */
const SCORES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

type Props = {
  /** The visit's token, sent with the score. */
  token: string;
  language: string;
  /** Called when the score is saved, so the page can say thank you. */
  onSaved?: () => void;
  /** Called when this form leaves the page with focus inside it, so the page can move focus. */
  onFocusLost?: () => void;
};

export function SurveyForm({ token, language, onSaved, onFocusLost }: Props) {
  const [score, setScore] = useState<number | null>(null);
  const [sending, setSending] = useState(false);
  const [notSaved, setNotSaved] = useState(false);
  // True while a Submit is being sent. Stops a second quick Submit from sending the score again.
  const busy = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const id = useId();
  const t = textFor(language).survey;
  useReportFocusOnLeave(formRef, onFocusLost);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (score === null || !isSurveyScore(score) || busy.current) return;
    busy.current = true;
    setNotSaved(false);
    setSending(true);
    const result = await submitSurvey(token, score);
    busy.current = false;
    setSending(false);
    // On "saved" the page turns the form into the thank-you by itself.
    if (result === "saved") onSaved?.();
    else setNotSaved(true);
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="clean-card space-y-3">
      <fieldset className="space-y-3" aria-describedby={`${id}-low ${id}-high`}>
        <legend className="text-lg font-bold">{t.question}</legend>
        <div className="flex justify-between gap-2 text-sm">
          <span id={`${id}-low`}>{t.low}</span>
          <span id={`${id}-high`}>{t.high}</span>
        </div>
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
                onChange={() => {
                  setScore(n);
                  setNotSaved(false);
                }}
                className="h-5 w-5"
              />
              {n}
            </label>
          ))}
        </div>
      </fieldset>
      <p className="text-sm">{t.note}</p>
      {/* aria-disabled, not disabled: a disabled button drops keyboard focus. */}
      <Button type="submit" aria-disabled={score === null || sending} className="w-full text-lg">
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
