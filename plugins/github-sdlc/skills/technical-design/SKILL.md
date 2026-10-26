---
name: technical-design
description: Write the Technical Design section of an issue — the approach for a feature, or the root cause, fix and blast radius for a bug — after investigating the code. Use after earlier stages pass review, or when asked how an issue should be built or what causes a bug.
argument-hint: "<issue-number>"
---

# Technical design

Stages and gates: [`../issue/references/pipeline.md`](../issue/references/pipeline.md).

## Preconditions

Claim the issue first, per [`claim`](../issue/references/claim.md).

`criteria-agent:review-passed`, plus `ui-agent:review-passed` when the issue has a UI/UX
Design heading. Otherwise stop and name the missing stage.

## Steps

1. Read the issue and **investigate the code**: find the real modules, callers, data and
   conventions. Cite files and symbols, never guesses.
2. Write the section for the type, wrap it as [`shape.md`](../issue/references/shape.md#foldable-sections) says:
   - **Feature or chore:** the approach, the data and module changes, migrations and their
     reversibility, risks, and the alternatives rejected with a clause each.
   - **Bug:** the **root cause** (where and why it fails, not where it shows, confirmed by
     reproducing it), the **fix** and why it removes the cause, and the **blast radius**:
     every caller of the broken code, found with a search, and what else could change.
   - **Docs or trivial:** `n/a — <reason>`.
3. **Add no requirement and restate nothing.** Refer to criteria by number. If the approach
   needs a decision that is the user's, or the root cause cannot be found, add an unticked
   Open question and stop.
4. If the design shows an earlier stage is wrong, follow the pipeline's rule for it: clear
   that stage's `review-passed`, add its `changes-requested`, and comment why.
5. Take the section through [`technical-writing`](../technical-writing/SKILL.md): terse, no history or narrative. Then replace only the `## Technical Design` section (re-read first), set
   `technical-agent:designed`, and clear this stage's `review-passed` and `changes-requested`.
6. Hand off to [`review-design`](../review-design/SKILL.md) for the technical stage.

## Will not do

Write the implementation, edit the criteria, or choose scope.
