---
name: address-feedback
description: Work through review feedback on a pull request — decide apply or decline for each item, make the changes, reply to every item, and re-review until nothing blocking remains. Use after review-pr returns findings, or when asked to address review comments.
argument-hint: "<pr-number> [--autonomous]"
---

# Addressing feedback

Review threads, labels and the body refresh: [`references/pr.md`](references/pr.md).

## The loop

1. **Collect** every open item: review threads or comments, and the last pass's findings.
2. **Decide** each: **apply**, **decline** with a reason, or **ask** the user when it needs a
   person's call (a trade-off, a scope change, a behavior change). A preference waits on nobody.
3. **Apply** the accepted changes. Run the check command, take the prose
   through [`technical-writing`](../technical-writing/SKILL.md) (loaded once per conversation),
   and push a new commit; never amend, rebase or force-push a pushed branch.
4. **Reply** to each item last, in the same prose rules (all in one review, through
   `scripts/reply.mjs`), with a verdict: `**Applied**` or `**Declined** — <reason>`.
5. **Re-review** with a fresh reviewer while the last pass returned a `critical`, `high`
   or `medium`.
   Repeat fix and **verify** passes until a verify pass returns nothing blocking,
   then run one **full** pass. If it finds more, loop again. Stop after two full passes and let
   the replies carry what remains.
6. **Tidy** after each pass is answered and pushed. It hides earlier passes and
   verdict-only reviews, and resolves each thread whose last reply is `**Applied**` or
   `**Accepted**`. A `**Declined**` thread stays open until the user agrees. The last pass stays
   visible. A failure is reported and never undoes the review.

   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/skills/address-feedback/scripts/tidy.mjs" pr <n>
   ```
7. **Finish** as [`references/pr.md`](references/pr.md) says.

## Options

Pass `--autonomous`.

- **Interactive**: show the decisions before applying and ask on each declined `critical`,
  `high` or `medium`.
- **Autonomous**: decide without asking, except where step 2 says ask.

## Will not do

Merge, start the build, or decline a `critical`, `high` or `medium` without telling the user.
