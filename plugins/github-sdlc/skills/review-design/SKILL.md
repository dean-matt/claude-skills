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

A technical section whose `**Risk:**` line reads `medium` or `low` carries the test section with
it. Review both in one pass, with both checklists, as the technical stage, and set both stages'
result labels from that pass.

## 2. Dispatch

Use a fresh `github-sdlc:design-auditor` agent for every pass.

**Full pass:** the stage's first pass, or any pass with no saved edit for the stage. Send the
issue number and stage only:

```
Review the <stage> stage of issue <n> with the github-sdlc:review-design checklist and return
findings in the required format. Do not post, label, or edit anything.
```

**Verify pass:** a pass after [`address-feedback`](../address-feedback/references/design.md)
saved the section before and after its edit. Diff the two, then send the diff's path:

```bash
d="$(git rev-parse --git-common-dir)/github-sdlc"
diff -u "$d/<n>-<stage>.before.md" "$d/<n>-<stage>.after.md" > "$d/<n>-<stage>.diff"
```

```
Verify the <stage> stage of issue <n>. The last design-pass comment holds the findings and their
verdicts; <diff path> holds the edits that answer them. Check that each Applied finding is fixed
and that each changed line holds up against the github-sdlc:review-design checklist and the code.
Raise nothing in unchanged text. Return findings in the required format. Do not post, label, or
edit anything.
```

Delete the three files once the pass returns.

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
**high** — Step 3 imports the editor statically into the detail, so every detail loads CodeMirror.
```

| Severity | Means | Blocks |
|---|---|---|
| `critical` | The stage cannot be built or tested as written, contradicts another section, or would ship the core feature broken | Yes |
| `high` | Would cause a bug, a regression or a failed check in the build | Yes |
| `medium` | Would cause rework or duplicated code, breaks a rule in the shape, or leaves a decision a builder would have to guess | Yes |
| `low` | Tidiness: wording, an incomplete list, an order that misleads nobody | No |
| `info` | A note or taste call, reported once | No |

The levels are the plugin's [scale](../setup/references/severity.md); this table applies it to a pass.

Calibrate: a blocking finding names the bug, failed check, rework, rule or guessed decision it
causes; a finding that cannot is `low` or `info`. Report a defect once, and raise nothing in a
later pass that the stage already held unless an edit introduced it.

## 5. Post and label

Take the findings through [`technical-writing`](../technical-writing/SKILL.md) first: one line per defect and its cost, no narrative. Post one comment per pass, opening with `<!-- design-pass:<stage> -->` so a pass can be told
from a person's comment, then each finding numbered. Post it with the script. It adds the heading under the marker (`### Criteria review — pass 2`)
and hides the earlier passes, so the issue shows the current pass and anything waiting on the user:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/review-design/scripts/post-pass.mjs" <n> <stage> <pass.md>
```

Never post a pass with `gh issue comment`. A hiding failure is reported and never undoes the pass.

- No `critical`, `high` or `medium`: add `<prefix>:review-passed`, remove `<prefix>:changes-requested`,
  then hide the stage's passes; one holding a finding for the user stays:

  ```bash
  node "${CLAUDE_PLUGIN_ROOT}/skills/address-feedback/scripts/tidy.mjs" issue <n> <stage> --passed
  ```
- Any `critical`, `high` or `medium`: add `<prefix>:changes-requested`, remove `<prefix>:review-passed`,
  then run [`address-feedback`](../address-feedback/SKILL.md) in design mode.

A pass with nothing to report still posts its marked comment.

## 6. Repeat

`address-feedback` returns here for a fresh pass while the last returned a `critical`, `high` or
`medium`. A loop is one full pass and up to three verify passes; after the third verify pass, stop. The last findings are applied and unreviewed, so the
stage carries `designed` and no result label. The next stage does not start. Tell the user
what the last pass found, then give the [cap message](#the-cap-message).

## The cap message

End the stop with a recommendation, never a bare choice:

- Whether the last pass found a `critical`. Accepting the stage is open only if it found none.
- The recommended action, first, with one clause why. Another verify pass costs about two minutes;
  prefer it when the findings are real gaps, and accepting when they are taste.
- Each other option with its cost, and the exact words to continue, such as `review-design 42 ui`.
- The claim and the In Design card stay until the user answers ([`claim`](../issue/references/claim.md)).

## Will not do

Write or edit a stage, start the next stage, or merge anything.
