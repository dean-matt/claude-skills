---
name: address-feedback
description: Work through review feedback on a pull request or on an issue's design stage — decide apply or decline for each item, make the changes, reply to every item, and re-review until nothing blocking remains. Use after review-pr or review-design returns findings, or when asked to address review comments.
argument-hint: "<pr-number | issue-number stage> [--autonomous]"
---

# Addressing feedback

Pick the mode from the target: a pull request number is **pr**; an issue stage is **design**.
The loop is the same; the references hold what differs.

## The loop

1. **Collect** every open item: review threads or comments, and the last pass's findings.
2. **Decide** each: **apply**, **decline** with a reason, or **ask** the user when it needs a
   person's call (a trade-off, a scope change, a behavior change). A preference waits on nobody.
3. **Apply** the accepted changes. For a pull request, run the check command, take the prose
   through [`technical-writing`](../technical-writing/SKILL.md) (loaded once per conversation),
   and push a new commit; never amend, rebase or force-push a pushed branch.
4. **Reply** to each item last, in the same prose rules, with a verdict: `**Applied**` or `**Declined** — <reason>`. In design mode the verdict goes
   into the pass comment itself.
5. **Re-review** with a fresh reviewer while the last pass returned a `critical` or `warning`.
   In pr mode, repeat fix and **verify** passes until a verify pass returns nothing blocking,
   then run one **full** pass. If it finds more, loop again. Stop after three full passes and let
   the replies carry what remains. In design mode, every pass is a full pass of the stage.
6. **Tidy** in pr mode after each pass is answered and pushed. It hides earlier passes and
   verdict-only reviews, and resolves each thread whose last reply is `**Applied**` or
   `**Accepted**`. A `**Declined**` thread stays open until the user agrees. The last pass stays
   visible. A failure is reported and never undoes the review.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/address-feedback/scripts/tidy.mjs" pr <n>
   ```
   Design mode tidies from [`review-design`](../review-design/SKILL.md).
7. **Finish.** Mode-specific; see below.

## Options

Pass `--autonomous`.

- **Interactive**: show the decisions before applying and ask on each declined `critical` or
  `warning`.
- **Autonomous**: decide without asking, except where step 2 says ask.

## Modes

- **pr**: [`references/pr.md`](references/pr.md) — review threads, labels, body refresh.
- **design**: [`references/design.md`](references/design.md) — an issue stage, its comment and labels.

## Will not do

Merge, start the next design stage, or decline a `critical` or `warning` without telling the user.
