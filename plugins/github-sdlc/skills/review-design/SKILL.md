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

A technical or test stage whose section is the single line `n/a — <reason>` has nothing to
review: add `<prefix>:review-passed`, remove `<prefix>:changes-requested`, post nothing, dispatch
nothing, and take the next stage. Never skip criteria or ui.

## 2. Dispatch

Send the `github-sdlc:design-auditor` agent the issue number and stage only:

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

Every stage is also held to one rule: repeat nothing another section or a link says.

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

Calibrate: a `warning` names the criterion, rule or decision a builder could not make without
guessing; a finding that cannot is a `comment`. Report a defect once, and raise nothing in a later
pass that the stage already held unless an edit introduced it.

## 5. Post and label

Take the findings through [`technical-writing`](../technical-writing/SKILL.md) first: one line per defect and its cost, no narrative. Post one comment per pass, opening with `<!-- design-pass:<stage> -->` so a pass can be told
from a person's comment, then each finding numbered. Post it with the script. It adds the heading under the marker (`### Criteria review — pass 2`)
and hides the earlier passes, so the issue shows the current pass and anything waiting on the user:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/review-design/scripts/post-pass.mjs" <n> <stage> <pass.md>
```

Never post a pass with `gh issue comment`. A hiding failure is reported and never undoes the pass.

- No `critical` or `warning`: add `<prefix>:review-passed`, remove `<prefix>:changes-requested`.
- Any `critical` or `warning`: add `<prefix>:changes-requested`, remove `<prefix>:review-passed`,
  then run [`address-feedback`](../address-feedback/SKILL.md) in design mode.

A pass with nothing to report still posts its marked comment.

## 6. Repeat

`address-feedback` returns here for a fresh pass while the last returned a `critical` or
`warning`. After two passes in one loop, stop. The last findings are applied and unreviewed, so
the stage carries `designed` and no result label. The next stage does not start. Tell the user
what the last pass found, then give the [cap message](#the-cap-message).

## The cap message

End the stop with a recommendation, never a bare choice:

- Whether the last pass found a `critical`. Accepting the stage is open only if it found none.
- The recommended action, first, with one clause why. A fourth pass costs about 30 seconds; prefer
  it when the findings are real gaps, and accepting when they are taste.
- Each other option with its cost, and the exact words to continue, such as `review-design 42 ui`.
- The claim and the In Progress card stay until the user answers ([`claim`](../issue/references/claim.md)).

## Will not do

Write or edit a stage, start the next stage, or merge anything.
