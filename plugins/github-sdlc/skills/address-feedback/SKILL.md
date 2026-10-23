---
name: address-feedback
description: Work through review feedback on a pull request or a spec — decide apply or decline for each item, make the changes, reply to every thread, and re-review until nothing blocking remains. Use after review-pr or review-spec returns findings, or when asked to address review comments.
---

# Addressing feedback

Pick the mode from the target: a pull request number is **pr**; a spec document or issue is
**spec**. The loop is the same; the references hold what differs.

## The loop

1. **Collect** every open item: review threads, comments, and the last pass's findings.
2. **Decide** each: **apply**, **decline** with a reason, or **ask** the user when it needs a
   person's call (a trade-off, scope change, a finding about taste that changes behavior).
   A preference waits on nobody.
3. **Apply** the accepted changes, run the check command, take the prose through
   [`technical-writing`](../technical-writing/SKILL.md), commit and push (a new commit —
   never amend, rebase or force-push a pushed branch).
4. **Reply** in each thread last: `**Applied** in <sha>` or `**Declined** — <reason>`. Every
   finding gets a verdict. A finding no line anchors gets a pull request comment opening
   `**Applied**` or `**Declined** <severity>`.
5. **Re-review** with a fresh reviewer while the last pass returned a `critical` or
   `warning`. Stop after three passes and let the verdict replies carry what remains.
6. **Finish.** Mode-specific; see below.

## Options

- **Interactive**: show the decisions before applying and ask on each declined `critical` or
  `warning`.
- **Autonomous**: decide without asking, except where step 2 says ask.

## Modes

- **pr**: [`references/pr.md`](references/pr.md) — GitHub threads, labels, body refresh.
- **spec**: [`references/spec.md`](references/spec.md) — comments on a document, approval.

## Will not do

Merge. Declining a `critical` or `warning` without saying so to the user.
