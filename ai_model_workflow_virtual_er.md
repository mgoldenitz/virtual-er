# Revised AI Model Workflow — WaitWell

## Recommended model stack

The earlier model plan, and the stage-by-stage steps that came from it, moved word for word to `handoffs/archive/2026-11-13-old-model-plan.md` on 2026-11-13. Which model does each step today: CLAUDE.md, section "Remind me when another model or agent is due".

| Task | Model | Effort |
|---|---|---|
| Wording, translations, README, presentation | Gemini 3.1 Pro | High |
| Code, security, equity and accessibility reviews | Gemini 3.1 Pro | High |
| Synthetic visits and expected dashboard numbers | Gemini 3.6 Flash | High |
| Challenging assumptions (escalation loop) | Gemini 3.1 Pro | Medium |
| Any step when there are no 3.1 Pro credits | Gemini 3.6 Flash | High |

Because one model family does every review: each review runs in a new chat, handoffs ask it to find problems rather than confirm, and Claude checks every answer against SPEC before changing anything.

## Operating rules

### Default loop

```text
Gemini 3.1 Pro, High
Plan / clarify / write tasks
        ↓
Claude Opus 5.5 + Claude Code
Build one small change
        ↓
Playwright MCP
Test phone and desktop
        ↓
Gemini 3.1 Pro, High
Review the result
        ↓
Git commit
```

Order: CLAUDE.md wins. The save point comes once the change works ("Save points"), and the Gemini review comes after it ("After each small change works and passes its tests").

### Escalation loop

Use this when the task is important, ambiguous, or Claude Code is stuck:

```text
Gemini 3.1 Pro, High
Analyze the problem
        ↓
Gemini 3.1 Pro, Medium, in a new chat
Challenge assumptions and propose alternatives
        ↓
You decide
        ↓
Claude Opus 5.5 + Claude Code implements
```

## Guardrails

- Do not use Cyber models for normal research or coding.
- Do not let two coding agents edit the repository at once.
- Do not use AI-generated translations as final; have fluent speakers review safety-critical text.
- Do not let an AI model make clinical decisions; the nurse selects CTAS and eligibility.
- Do not use Max effort routinely. Use High for Gemini 3.1 Pro and Gemini 3.6 Flash, except Medium for challenging assumptions.
- Do not treat any AI security review as proof of compliance or safety; verify findings and use them as input to human review.
- Keep prompts free of real patient data, API keys, tokens, passwords, or confidential hospital information.
