---
name: handoff
description: Write or update a handoff document so the next agent with fresh context can continue this work.
---

Write a handoff document summarising the current conversation so a fresh agent can continue the work. Save to `.claude/handoffs` with the name `<timestamp>-<kebab-name>` .

Do not duplicate content already captured in other artifacts (specs, plans, ADRs, issues, commits, diffs). Reference them by path or URL instead.

Redact any sensitive information, such as API keys, passwords, or personally identifiable information.

If the user passed arguments, treat them as a description of what the next session will focus on and tailor the doc accordingly.