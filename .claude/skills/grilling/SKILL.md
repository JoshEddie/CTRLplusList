---
name: grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, or uses any 'grill' trigger phrases.
---

Interview me relentlessly until we reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**, one **subtree** at a time — a single top-level branch and everything hanging off it. The **frontier** is every decision inside the current subtree whose prerequisites are already settled — the questions you can ask *now* without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for my answers before the next round. A frontier past a handful of questions means the subtree is too wide — split it and take the first half.

Each question should be formatted like so:

```
❓ **Q1** — **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round I answer reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a *later* round, not this one. When the current subtree's frontier empties, move to the next subtree and recompute there.

Finding *facts* is your job, never mine. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it — don't ask me for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The *decisions* are mine — put each to me and wait.

The session is done when every subtree's frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not enact the plan until I confirm we have reached a shared understanding.
