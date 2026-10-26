---
name: issue
description: Draft a GitHub issue from a rough idea or bug report — pick its type, write the summary, open questions, out of scope and numbered acceptance criteria, ask about gaps, create it with labels, and queue it for criteria review. Use when asked to write, file, draft or create an issue, or to turn feedback into one.
argument-hint: "[idea] [--autonomous]"
---

# Writing an issue

Read [`references/shape.md`](references/shape.md) (shape, types, rules) and
[`references/pipeline.md`](references/pipeline.md) (stages, gates) first. This skill writes the
**criteria stage** only, never a design section.

## Steps

1. **Take the idea.** Search for a duplicate first (`gh issue list --search`), and say so if
   one is close; [`triage`](../triage/SKILL.md) owns closing duplicates.
2. **Pick the type.** Infer it and state it; ask only when two fit.
3. **Draft** the sections for that type, in order, with the criteria wrapped as
   [`shape.md`](references/shape.md#foldable-sections) says. Open with the problem, not the solution.
   Write each criterion as an observable result and number it.
4. **Ask about gaps** in one batch with AskUserQuestion, instead of inventing: a missing
   reproduction, an ambiguous expected result, a scope boundary. Anything left unanswered becomes an
   unticked Open question.
5. **Decide whether it is visual.** If a user can see the change, add an empty
   `## UI/UX Design` heading; otherwise add none. For a UI bug, offer a screenshot through
   [`screenshots`](../screenshots/SKILL.md) under Actual.
6. **Prose pass** with [`technical-writing`](../technical-writing/SKILL.md).
7. **Show the draft** and wait for approval, unless running autonomously.
8. **Create it.**

   ```bash
   gh issue create --title "<title>" --body-file <body.md> --label "type:<type>"
   gh issue edit <n> --add-label "criteria-agent:designed"
   ```

   Set native relationships the user named, as
   [`references/relationships.md`](references/relationships.md) describes.
9. **Hand off** to [`review-design`](../review-design/SKILL.md) for the criteria stage.

## Options

Pass `--autonomous`.

- **Interactive** (default): show the draft before creating it.
- **Autonomous**: create without asking, and turn every gap into an Open question.
- **Reshape**: restructure an existing issue into this shape, keeping the reporter's words
  in Summary and Reproduction. Used from `triage`. Claim the issue first, per
  [`claim`](references/claim.md); a new issue has no one else to hold it.

## Will not do

Write a design section, set severity, milestone or rank (those are `triage`'s and the
user's), or restate a relationship in the body.
