# Old model plan (archived 2026-11-13)

Moved word for word from `ai_model_workflow_virtual_er.md`, sections "Recommended model stack" (first table and the 2026-11-10 note), "Why this stack", "Full lifecycle workflow", "Stage-by-stage usage" and "Immediate next steps". The owner chose CLAUDE.md's handoff rules on 2026-11-13; this file is history only.

| Model | Role in project | Best tasks | Effort |
|---|---|---|---|
| **Gemini 3.1 Pro** | Default research, planning and review model | Research briefs, project charter, user stories, requirements, workflow design, architecture and security review, explaining code, routine reviews | **High** |
| **Claude Opus 5.5 + Claude Code** | Primary builder | Build and debug the Next.js/Supabase/Vercel app, manage phases, run Playwright tests, make controlled changes | Agent workflow; one coding agent at a time |
| **Kimi K3.1 Pro** | Long-context specialist and second opinion | Independent second opinion, analyzing the full briefing, comparing many documents, strategic alignment, equity review | **Thinking Max**; when it is not working, Gemini 3.1 Pro, High, takes its step |
| **GPT-6 Astra** | Final quality gate | Final security/privacy review, final code review, high-stakes decisions | **High** |
| **GPT-6.1 Terra** | Writing and documentation | README, presentation, patient-facing wording, survey questions, polished summaries | **Medium** |
| **Grok 4.7** | Fast ideation and alternative views | Brainstorming names/features, challenging assumptions, quick code explanations, generating test ideas | **Low/Medium** |
| **DeepSeek V4.1-Flash** | Low-cost utility | Translation drafts, bulk test scenarios, summaries, simple extraction | **Low** |
| **GPT-5.6 Cyber / GPT-6 Cyber** | Security specialist only | Optional authorized security review; not general research or app building | Only if specifically needed |

**Changed on 2026-11-10: Gemini only.** From Phase 3 on, every handoff and review goes to a Gemini model. Kimi, Grok, DeepSeek, GPT-6 Astra, GPT-6.1 Terra, GPT-6.1 Sol and Gemini 4 Argon are no longer used (the table above and Phases 1 and 2 below show the earlier plan).

## Why this stack

- **Gemini 3.1 Pro** is the default model for research, planning and reviews, at High effort.
- **Claude Code + Claude Opus 5.5** remains the primary builder because it is already integrated with the project’s Supabase, Vercel, Playwright, and documentation tools.
- **Kimi K3.1 Pro** gives the independent second opinion, so a plan is never checked only by the model that wrote it. Its long-context strength also makes it best for reviewing the entire briefing, SPEC, related projects, and research papers together.
- **GPT-6 Astra** is reserved for the highest-stakes reviews and final quality gates.
- **Grok 4.7** is a fast challenger and brainstorming partner, not the main builder.
- **DeepSeek V4.1-Flash** handles inexpensive, high-volume work.
- **Cyber models** are specialized for authorized security work and should not be used as general research models.

## Full lifecycle workflow

```mermaid
flowchart TD
    A([Project idea: Virtual ER Waiting Room])

    subgraph R1[" "]
        direction LR
        B["<b>1. Research and discovery</b><br>Gemini 3.1 Pro, High: research brief<br>Kimi K3.1 Pro, Thinking Max: challenge brief, long documents<br>Grok 4.7, Low/Med: challenge assumptions<br>Gemini 3.1 Pro, High: synthesize"]
        C["<b>2. Define the project</b><br>Gemini 3.1 Pro, High: charter, risks<br>Gemini 3.1 Pro, High: user stories<br>Kimi K3.1 Pro, Thinking Max: alignment<br>Grok 4.7, Low: challenge scope<br>You approve scope"]
        D["<b>3. Design the app</b><br>Gemini 3.1 Pro, High: architecture<br>Kimi K3.1 Pro, Thinking Max: second opinion<br>Claude Code: implementation plan<br>GPT-6 Astra, High: privacy review<br>You approve design"]
        E["<b>4. Phase 1: prototype</b><br>Claude Code: core queue loop<br>Playwright: phone and desktop tests<br>Gemini 3.1 Pro, High: UX review<br>Grok 4.7, Low: UI ideas<br>Git save point"]
        B --> C --> D --> E
    end

    subgraph R2[" "]
        direction LR
        F["<b>5. Phase 2: database and deploy</b><br>Claude Code: Supabase, RLS, Vercel<br>Supabase MCP: SQL for approval<br>Playwright: realtime, deploy tests<br>Gemini 3.1 Pro, High: security review<br>GPT-6 Astra, High: final security review<br>Git save point"]
        G["<b>6. Phase 3: safety and equity</b><br>Claude Code: safety, accessibility<br>Gemini 3.1 Pro, High: wording<br>Gemini 3.1 Pro, High: translations<br>Fluent human approves translations<br>Gemini 3.1 Pro, High: equity review<br>Gemini 3.1 Pro, High: UX review<br>Git save point"]
        H["<b>7. Phase 4: dashboard and demo</b><br>Gemini 3.1 Pro, High: metric definitions<br>Claude Code: dashboard<br>Gemini 3.6 Flash, High: demo scenarios<br>Playwright: verify dashboard<br>Gemini 3.1 Pro, High: check definitions<br>Git save point"]
        I["<b>8. Test and launch</b><br>Claude Code: fix defects<br>Playwright: end-to-end tests<br>Gemini 3.1 Pro, High: code review<br>Gemini 3.1 Pro, High (new chat): final review<br>Gemini 3.1 Pro, High: README, deck<br>3 to 5 real testers<br>Final Git save point"]
        F --> G --> H --> I
    end

    J([Course submission and future improvements])

    A --> R1 --> R2 --> J
```

## Stage-by-stage usage

### 1. Research and discovery

- **Gemini 3.1 Pro, High:** Produce a structured research brief on virtual ER waiting rooms, patient recall workflows, privacy, accessibility, and adoption.
- **Kimi K3.1 Pro, Thinking Max:** Independently challenge the research brief, identify missing perspectives, and analyze the full briefing, related projects, and research papers together.
- **Grok 4.7, Low/Medium:** Challenge assumptions, identify unnecessary scope, and propose alternative approaches.
- **Gemini 3.1 Pro, High:** Turn the findings into a concise “what we will build and why” summary.

### 2. Define the project

- **Gemini 3.1 Pro, High:** Create the project charter, objectives, constraints, assumptions, risks, milestones, and success measures.
- **Gemini 3.1 Pro, High:** Convert the charter into patient, nurse, project-manager, and privacy-officer user stories.
- **Kimi K3.1 Pro, Thinking Max:** Check strategic alignment with THP’s Plan to 2030 and identify overstated claims.
- **Grok 4.7, Low:** Challenge scope, budget, timeline, and feature assumptions.
- **You:** Approve the scope before coding begins.

### 3. Design the app

- **Gemini 3.1 Pro, High:** Design pages, data model, access-control model, realtime update pattern, and dashboard calculations.
- **Kimi K3.1 Pro, Thinking Max:** Independently review the architecture and identify risks or simpler alternatives.
- **Claude Opus 5.5 / Claude Code:** Turn the design into a concrete implementation plan and file structure.
- **GPT-6 Astra, High:** Review privacy, security, and safety gaps before implementation.
- **You:** Approve the design and any database changes.

### 4. Build Phase 1: prototype

- **Claude Opus 5.5 / Claude Code:** Build the core loop: staff check-in, patient screen, call back, “I’m on my way,” and arrival.
- **Playwright MCP:** Test at 390 x 844 phone size and laptop size.
- **Gemini 3.1 Pro, High:** Review the user flow for confusing labels, missing states, and workflow gaps.
- **Grok 4.7, Low:** Suggest simpler UI patterns or identify unnecessary complexity.
- **Git:** Commit after each working change.

### 5. Build Phase 2: database and deployment

- **Claude Opus 5.5 / Claude Code:** Implement Supabase, realtime updates, staff login, RLS, and Vercel deployment.
- **Supabase MCP:** Show SQL and security policies before running changes.
- **Playwright MCP:** Verify that staff and patient views update within about two seconds.
- **Gemini 3.1 Pro, High:** Review the security architecture and implementation approach.
- **GPT-6 Astra, High:** Perform the final security review after Phase 2.
- **Git:** Save a known-good version before continuing.

### 6. Build Phase 3: safety and equity

- **Claude Opus 5.5 / Claude Code:** Implement safety line, emergency check, no-response ladder, “I’m still here,” call-everyone-back, languages, text size, accessibility labels, footer, and 24-hour deletion.
- **Gemini 3.1 Pro, High (instead of GPT-6.1 Terra):** Draft clear patient-facing UI copy and survey wording.
- **Gemini 3.1 Pro, High (instead of DeepSeek):** Produce first-draft translations and test scenarios.
- **Fluent human reviewer:** Approve final translations, especially safety messages.
- **Gemini 3.1 Pro, High, new chat (instead of Kimi):** Review accessibility, plain language, equity, and the full patient journey.
- **Gemini 3.1 Pro, High:** Review workflow consistency and UX gaps.

### 7. Build Phase 4: dashboard and demo mode

- **Gemini 3.1 Pro, High (instead of Kimi):** Validate dashboard definitions against the charter objectives.
- **Claude Opus 5.5 / Claude Code:** Implement dashboard queries, summary cards, demo mode, and daily_stats logic.
- **Gemini 3.6 Flash, High (instead of DeepSeek):** Generate 15–20 synthetic visits and expected dashboard outcomes.
- **Playwright MCP:** Verify demo mode and dashboard behavior.
- **Gemini 3.1 Pro, High:** Check that each dashboard metric has a clear definition and supports a project objective.

### 8. Test, review, and launch

- **Claude Opus 5.5 / Claude Code:** Fix defects and improve reliability.
- **Playwright MCP:** Run full end-to-end tests, including called/no-response, unable-to-reach, reopening after return, survey eligibility, and call-everyone-back.
- **Gemini 3.1 Pro, High:** Perform an independent code and architecture review.
- **Gemini 3.1 Pro, High, new chat (instead of GPT-6 Astra):** Perform the final security, privacy, accessibility, and code-quality review.
- **Gemini 3.1 Pro, High (instead of GPT-6.1 Terra):** Write the README, presentation narrative, and demo instructions.
- **Real testers:** Have 3–5 people use the app and report confusion, errors, or accessibility problems.

## Immediate next steps

1. Use **Gemini 3.1 Pro at High** to create a research brief on virtual ER waiting rooms, patient recall workflows, privacy considerations, and accessibility requirements.
2. Use **Kimi K3.1 Pro at Thinking Max** to challenge that brief, identify missing risks, and compare the briefing, SPEC, and related projects.
3. Use **Grok 4.7 at Low** to challenge scope and propose a simpler five-week build.
4. Use **Gemini 3.1 Pro at High** to create the final project charter, user stories, and phase plan.
5. Use **Claude Code + Claude Opus 5.5** to begin Phase 1.
