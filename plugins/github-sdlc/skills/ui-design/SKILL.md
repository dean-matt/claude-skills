---
name: ui-design
description: Write the UI/UX Design section of an issue — the flow, every state, copy, and keyboard and screen-reader behavior — for a change a user can see. Use after an issue's acceptance criteria pass review, when the issue has a UI/UX Design heading, or when asked to design the UI for an issue.
---

# UI/UX design

Stages and gates: [`../issue/references/pipeline.md`](../issue/references/pipeline.md).

## Preconditions

Claim the issue first, per [`claim`](../issue/references/claim.md).

- The issue carries `criteria-agent:review-passed`, and no open Open question changes a
  criterion. Otherwise stop and say which is missing.
- The body has a `## UI/UX Design` heading. Without it the change is not visual, so there is
  nothing to do; say so.

## Steps

1. Read the issue and the existing interface it touches: the components, design tokens and
   docs the repository keeps, so the design reuses what exists.
2. Write the section:
   - **Flow:** the steps from the user's side.
   - **States:** default, empty, loading, error, disabled or locked, and any other the
     criteria imply.
   - **Copy:** every new string, exactly.
   - **Keyboard and screen reader:** tab order, keys, announcements, labels.
   - **Layout:** a sketch or mockup only where words are not enough, labeled "Intended
     layout" and uploaded through [`screenshots`](../screenshots/SKILL.md).
3. **Add no requirement.** If the design needs behavior no criterion covers, add an unticked
   Open question proposing the criterion, and stop. Never edit the criteria.
4. Replace only the `## UI/UX Design` section: re-read the issue, edit that section, then
   write the body back, so a concurrent edit elsewhere survives.
5. Set `ui-agent:designed` and remove `ui-agent:review-passed` and `ui-agent:changes-requested`.
6. Hand off to [`review-design`](../review-design/SKILL.md) for the ui stage.

## Will not do

Restate a criterion, choose the implementation, or write code.
