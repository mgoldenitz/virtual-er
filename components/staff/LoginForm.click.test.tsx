// @vitest-environment happy-dom
// Checks that each failed staff sign-in result shows its matching problem text on the login form.

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signInStaff, type SignInResult } from "@/data/staffSignIn";
import { LoginForm } from "./LoginForm";

// The sign-in is replaced, so each test sets the result it returns.
vi.mock("@/data/staffSignIn", () => ({ signInStaff: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

// Tells React that this file runs its updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// The failed results and the exact text each one must show (copied from LoginForm.tsx).
const cases: [SignInResult, string][] = [
  ["wrong", "Email or password not recognised. Check them and try again."],
  ["not_staff", "This account is not a staff account, so it cannot open the staff screens."],
  ["too_many", "Too many sign-in tries. Wait a few minutes, then try again."],
  ["no_connection", "Could not reach the sign-in service. Check your internet connection and try again."],
];

let container: HTMLDivElement;
let root: Root;

const show = () => act(() => root.render(<LoginForm />));
const input = (type: string) => {
  const found = container.querySelector<HTMLInputElement>(`input[type="${type}"]`);
  if (!found) throw new Error(`No input of type "${type}"`);
  return found;
};
const submitButton = () => {
  const found = container.querySelector<HTMLButtonElement>('button[type="submit"]');
  if (!found) throw new Error("No submit button");
  return found;
};
const alertBox = () => container.querySelector('[role="alert"]');

// React tracks the input value, so the value is set through the native setter and an "input" event is fired.
function typeInto(field: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  setValue?.call(field, value);
  field.dispatchEvent(new Event("input", { bubbles: true }));
}

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  vi.mocked(signInStaff).mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("LoginForm problem text", () => {
  it.each(cases)("shows the matching problem text for the %s result", async (result, text) => {
    vi.mocked(signInStaff).mockResolvedValueOnce(result);
    show();
    typeInto(input("email"), "staff@example.test");
    typeInto(input("password"), "test-password");
    await act(async () => submitButton().click());
    expect(alertBox()?.textContent).toBe(text);
  });
});
