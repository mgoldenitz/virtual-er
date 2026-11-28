"use client";

// The "Ask about today's numbers" box under the dashboard summary. Staff type a short question;
// the server sends it with today's totals to an AI model and the answer shows in the list.
// Nothing is saved: a reload or a Real/Demo switch empties the list. Ask rests for 10 seconds
// after each question, so a double press does not pay twice.

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/Button";
import { fetchChatAnswer } from "@/data/dashboardChat";
import { chatHistory, showsAiLine, type ChatEntry } from "@/lib/chatHistory";
import { CHAT_CODE_TEXT } from "@/lib/chatMessage";
import { CHAT_LIMITS, hasPatientDetail } from "@/lib/chatRequest";

const WAIT_BETWEEN_QUESTIONS_MS = 10_000;

export function ChatPanel({ isDemo }: { isDemo: boolean }) {
  // The list keeps the mode it was asked in; after a Real or Demo switch it is not shown.
  const [chat, setChat] = useState<{ forDemo: boolean; entries: ChatEntry[] }>({ forDemo: isDemo, entries: [] });
  const [question, setQuestion] = useState("");
  const [codeNote, setCodeNote] = useState(false);
  const [resting, setResting] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionBox = useRef<HTMLTextAreaElement>(null);

  // After a Real or Demo switch, start a new empty list, so a switch back does not show the old one.
  const [shownFor, setShownFor] = useState(isDemo);
  if (shownFor !== isDemo) {
    setShownFor(isDemo);
    setChat({ forDemo: isDemo, entries: [] });
    setCodeNote(false);
  }

  // When the dashboard closes, stop the 10-second timer.
  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, []);

  const entries = chat.forDemo === isDemo ? chat.entries : [];
  const waiting = entries.some((entry) => entry.answer === null);

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const asked = question.trim();
    // The timer ref changes at once, so it also stops a second press that comes before React redraws.
    if (asked === "" || waiting || resting || timer.current !== null) return;
    // SPEC rule 1: a visit code, token or long number never leaves the app. The server checks this too.
    if (hasPatientDetail(asked)) {
      setCodeNote(true);
      return;
    }
    setCodeNote(false);
    setResting(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setResting(false);
    }, WAIT_BETWEEN_QUESTIONS_MS);

    const forDemo = isDemo;
    const history = chatHistory(entries);
    const entry: ChatEntry = { question: asked, answer: null };
    setChat({ forDemo, entries: [...entries, entry] });
    setQuestion("");
    const answer = await fetchChatAnswer(forDemo, asked, history);
    // The answer goes only into the list it was asked in.
    setChat((now) =>
      now.forDemo === forDemo ? { forDemo, entries: now.entries.map((e) => (e === entry ? { ...e, answer } : e)) } : now,
    );
  }

  function clearChat() {
    setChat({ forDemo: isDemo, entries: [] });
    setCodeNote(false);
    // The Clear chat button goes away, so keyboard focus goes to the question box.
    questionBox.current?.focus();
  }

  return (
    <section aria-labelledby="chat-heading" className="space-y-3 rounded-lg border-2 border-line bg-card p-4">
      <h2 id="chat-heading" className="text-lg font-bold">
        {"Ask about today's numbers"}
      </h2>
      {/* One live list, always on the page, so screen readers hear each new answer. */}
      <div role="log" aria-live="polite" aria-label="Questions and answers" className={entries.length ? "space-y-3" : "sr-only"}>
        {entries.map((entry, i) => (
          <div key={i} className="space-y-1">
            <p className="font-semibold">{`You asked: ${entry.question}`}</p>
            {entry.answer === null && <p>Writing the answer...</p>}
            {entry.answer !== null && <p>{entry.answer.text}</p>}
          </div>
        ))}
        {/* One AI line for the whole chat, at the bottom (owner decision 2026-11-27). */}
        {showsAiLine(entries) && (
          <p className="text-sm text-muted">{"Written by an AI model from today's totals. Check the numbers above."}</p>
        )}
      </div>
      <form onSubmit={ask} className="space-y-2">
        <label htmlFor="chat-question" className="block font-semibold">
          Your question
        </label>
        <textarea
          id="chat-question"
          ref={questionBox}
          value={question}
          onChange={(event) => {
            setQuestion(event.target.value);
            setCodeNote(false);
          }}
          maxLength={CHAT_LIMITS.questionCharacters}
          rows={2}
          aria-describedby="chat-note"
          className="block w-full rounded-lg border-2 border-control bg-card px-3 py-2"
        />
        <p id="chat-note" className="text-sm text-muted">
          {"Do not type patient codes or names."}
        </p>
        {codeNote && <p role="alert">{CHAT_CODE_TEXT}</p>}
        <div className="flex flex-wrap gap-2">
          {/* Only grayed out (aria-disabled), so keyboard focus stays on it; the guard in ask() stops a press. */}
          <Button type="submit" variant="secondary" aria-disabled={waiting || resting}>
            Ask
          </Button>
          {entries.length > 0 && (
            <Button variant="secondary" onClick={clearChat}>
              Clear chat
            </Button>
          )}
        </div>
      </form>
    </section>
  );
}
