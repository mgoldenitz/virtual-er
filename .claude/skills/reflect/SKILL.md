---
name: reflect
description: End-of-session review. Lists what went wrong or took too long in this session, proposes the smallest edit to a skill or CLAUDE.md that would have prevented each one, and waits for the owner's OK. Use at the end of every session or when the owner types /reflect.
---

# Reflect

1. Find the evidence in this session: failed commands, checks that failed, a worker's output that was sent back, steps that were repeated, the owner's corrections, and questions that a rule already answered.
2. List at most 5 items, the most costly first. For each item:
   - What happened, in one sentence.
   - The evidence: a quote, a command and its exit code, or a count.
   - The smallest edit that would have prevented it: the file, the exact text now, and the exact new text.
3. Do not propose an edit without evidence. Do not reword a rule only to make it nicer.
4. Wait for the owner's OK on each item. Apply only the approved items, one commit each.
5. Then do the end-of-session steps in CLAUDE.md: update docs/progress.md, docs/decisions.md and docs/known-issues.md.
