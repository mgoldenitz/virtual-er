// @vitest-environment happy-dom
// Checks the chat panel: an answer shows with the AI line, a visit code is refused before any call,
// Ask rests for 10 seconds, and a Real or Demo switch empties the list. Rendered in StrictMode.

import { StrictMode, act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchChatAnswer } from "@/data/dashboardChat";
import { CHAT_CODE_TEXT } from "@/lib/chatMessage";
import { ChatPanel } from "./ChatPanel";

// The chat call is replaced, so the test does not reach the server or the sign-in store.
vi.mock("@/data/dashboardChat", () => ({ fetchChatAnswer: vi.fn() }));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const ANSWER = "At site B, 2 people left before they were seen.";
const AI_LINE = "Written by an AI model from today's totals.";

let container: HTMLDivElement;
let root: Root;

const log = () => container.querySelector('[role="log"]') as HTMLElement;
const askButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent === "Ask") as HTMLButtonElement;
const clearButton = () => [...container.querySelectorAll("button")].find((b) => b.textContent === "Clear chat");

function render(isDemo: boolean) {
  act(() =>
    root.render(
      <StrictMode>
        <ChatPanel isDemo={isDemo} />
      </StrictMode>,
    ),
  );
}

/** Types into the question box the way a person does, so React sees the change. */
function type(text: string) {
  const box = container.querySelector("textarea") as HTMLTextAreaElement;
  const setValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set;
  act(() => {
    setValue?.call(box, text);
    box.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function ask(text: string) {
  type(text);
  await act(async () => askButton().click());
}

beforeEach(() => {
  vi.useFakeTimers();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(fetchChatAnswer).mockReset().mockResolvedValue({ kind: "text", text: ANSWER });
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
});

describe("ChatPanel", () => {
  it("shows the question, the answer and the AI line in the log", async () => {
    render(false);
    await ask("How many left at site B?");
    expect(fetchChatAnswer).toHaveBeenCalledTimes(1);
    expect(fetchChatAnswer).toHaveBeenCalledWith(false, "How many left at site B?", []);
    expect(log().textContent).toContain("You asked: How many left at site B?");
    expect(log().textContent).toContain(ANSWER);
    expect(log().textContent).toContain(AI_LINE);
  });

  it("refuses a visit code and makes no call", async () => {
    render(false);
    await ask("Where is ABC234?");
    expect(fetchChatAnswer).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toBe(CHAT_CODE_TEXT);
  });

  it("rests Ask for 10 seconds after a question", async () => {
    render(false);
    await ask("First question");
    expect(askButton().disabled).toBe(true);
    await ask("Second question");
    expect(fetchChatAnswer).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(10_000));
    expect(askButton().disabled).toBe(false);
    await ask("Second question");
    expect(fetchChatAnswer).toHaveBeenCalledTimes(2);
    // The second call carries the first question and its answer.
    expect(fetchChatAnswer).toHaveBeenLastCalledWith(false, "Second question", [
      { role: "user", text: "First question" },
      { role: "assistant", text: ANSWER },
    ]);
  });

  it("empties the list after a Real or Demo switch", async () => {
    render(false);
    await ask("How many waiting?");
    expect(log().textContent).toContain(ANSWER);
    render(true);
    expect(log().textContent).toBe("");
  });

  it("keeps the list empty after Real, then Demo, then Real again", async () => {
    render(false);
    await ask("How many waiting?");
    render(true);
    render(false);
    expect(log().textContent).toBe("");
  });

  it("empties the list with Clear chat", async () => {
    render(false);
    await ask("How many waiting?");
    act(() => clearButton()?.click());
    expect(log().textContent).toBe("");
    expect(clearButton()).toBeUndefined();
  });
});
