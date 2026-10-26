---
name: review-design
description: Review one stage of an issue — acceptance criteria, UI/UX design, technical design or test design — with a fresh reviewer, post the findings as an issue comment, and set that stage's review labels. Use after a stage is written, when asked to review an issue or a design, or to re-review after changes.
argument-hint: "<issue-number> [criteria|ui|technical|test]"
---

# Reviewing a design stage

Stages, labels and gates: [`../issue/references/pipeline.md`](../issue/references/pipeline.md).
Label names: [`../setup/references/labels.md`](../setup/references/labels.md).

## 1. Choose the stage

Use the stage named. Otherwise take the first needed stage that carries `<prefix>:designed`
and lacks `<prefix>:review-passed`. If none qualifies, say so and stop.

## 2. Dispatch

Send the `github-sdlc:design-auditor` agent the issue number and stage only, with no account of how the
stage was written:

```
Review the <stage> stage of issue <n> with the github-sdlc:review-design checklist and return
findings in the required format. Do not post, label, or edit anything.
```

Use a fresh agent for every pass.

## 3. The reviewer's criteria

The checklist for the stage is read from a reference:

| Stage | Checklist |
|---|---|
| criteria | [`references/criteria.md`](references/criteria.md) |
| ui | [`references/ui.md`](references/ui.md) |
| technical | [`references/technical.md`](references/technical.md) |
| test | [`references/test.md`](references/test.md) |

Every stage is also held to one rule: it repeats nothing another section or a link already
says.

## 4. Finding format

Open each finding with its severity in bold, then the defect and what it costs:

```
**warning** — AC3 says "works correctly" and names no observable result, so it cannot be tested.
```

| Severity | Means |
|---|---|
| `critical` | The stage cannot be built or tested as written, or contradicts another section |
| `warning` | Breaks a rule in the shape, or leaves a gap a builder would have to guess at |
| `comment` | A taste call, reported once |

## 5. Post and label

Post one comment per pass, opening with `<!-- design-pass:<stage> -->` so a pass can be told
from a person's comment, then each finding numbered. The script adds the visible heading under the
marker (`### Criteria review — pass 2`), so a reader sees which stage a pass covers. Post it with the script, which also hides
the earlier passes in the same call, so the issue never carries more than the current pass and
anything waiting on the user, however long the loop runs or however it ends:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/review-design/scripts/post-pass.mjs" <n> <stage> <pass.md>
```

Never post a pass with `gh issue comment`. A failure while hiding is reported and never undoes the
pass.

- No `critical` or `warning`: add `<prefix>:review-passed`, remove `<prefix>:changes-requested`.
- Any `critical` or `warning`: add `<prefix>:changes-requested`, remove `<prefix>:review-passed`,
  then run [`address-feedback`](../address-feedback/SKILL.md) in design mode.

A pass with nothing to report still posts its marked comment.

## 6. Repeat

`address-feedback` returns here for a fresh pass while the last returned a `critical` or
`warning`. After three passes in one loop, stop. `address-feedback` has applied the last
findings and removed `changes-requested`, so the stage carries `designed` and no result label:
written, and awaiting a review nobody has run. Tell the user what the last pass found and that
the edits since are unreviewed. The next stage does not start.

## Will not do

Write or edit a stage, start the next stage, or merge anything.
