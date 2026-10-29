---
name: issue
description: Draft a GitHub issue from a rough idea or bug report — pick its type, write the summary, open questions, out of scope and numbered acceptance criteria, ask about gaps, and create it with labels. Use when asked to write, file, draft or create an issue, or to turn feedback into one.
argument-hint: "[idea] [--autonomous]"
---

# Writing an issue

Read [`references/shape.md`](references/shape.md) (shape, types, rules) first. This skill writes
what the issue must do, never how to build it; `build` plans from the criteria and the code.

## Steps

1. **Take the idea.** Search for a duplicate first (`gh issue list --search`), and say so if
   one is close; [`triage`](../triage/SKILL.md) owns closing duplicates.
2. **Pick the type.** Infer it and state it; ask only when two fit.
3. **Draft** the sections for that type, in order, with the criteria wrapped as
   [`shape.md`](references/shape.md#foldable-sections) says. Open with the problem, not the solution.
   Write each criterion as an observable result and number it, searching the code each one
   reaches so none states a premise the code contradicts. Keep it to one slice that ships alone;
   where the idea holds more, draft one issue per slice and say so.
4. **Ask about gaps** in one batch with AskUserQuestion, instead of inventing: a missing
   reproduction, an ambiguous expected result, a scope boundary. Anything left unanswered becomes an
   unticked Open question.
5. **For a UI bug,** offer a screenshot through [`screenshots`](../screenshots/SKILL.md) under
   Actual.
6. **Prose pass** with [`technical-writing`](../technical-writing/SKILL.md).
7. **Show the draft** and wait for approval, unless running autonomously.
8. **Create it.**

   ```bash
   gh issue create --title "<title>" --body-file <body.md> --label "type:<type>"
   ```

   Set native relationships the user named, as
   [`references/relationships.md`](references/relationships.md) describes.
9. **Report** the issue number. It is ready to build once no Open question is unticked.

## Options

Pass `--autonomous`.

- **Interactive** (default): show the draft before creating it.
- **Autonomous**: create without asking, and sort each gap:
  - **Low stakes** (naming, wording, a default for an edge the criteria leave open): decide it
    from the issue, the code and Out of scope, taking the narrower answer where they leave it
    open. Write `- [x] <question> — Decided (auto): <answer>, because <reason>`.
  - **Needs a person** (changes stored data or a migration, behavior a user will notice, scope
    beyond the title; or only the user can know it, such as a
    credential, price or deadline): leave it unticked and return it with a recommended answer and
    alternatives. The caller asks the user and writes `- [x] <question> — Answered: <answer>`.

  When unsure, it needs a person. An answer that changes a criterion is written into that
  criterion in the same step. When the last question is ticked and its answer is in the sections
  that carry it, post one comment through [`technical-writing`](../technical-writing/SKILL.md)
  listing each question and answer tagged `Decided (auto)` or `Answered`, then delete the
  `## Open questions` section. Report every decision.
- **Reshape**: restructure an existing issue into this shape, keeping the reporter's words
  in Summary and Reproduction. Used from `triage`. Claim the issue first, per
  [`claim`](references/claim.md); a new issue has no one else to hold it.

## Splitting

A split is the user's call, proposed by [`build`](../build/SKILL.md) with each group's criterion
numbers, a title, and the order they ship in. On the user's yes, keep the first group in this issue, create
each other group as its own issue with this skill in autonomous mode, carrying its criteria, the
Summary's part that motivates them and any Out of scope line they need, and set *blocked by* where
a group needs an earlier one ([`relationships.md`](references/relationships.md)). Then remove the
moved criteria here and renumber from `AC1`.

## Will not do

Write how to build it, set severity, milestone or rank (those are `triage`'s and the
user's), or restate a relationship in the body.
