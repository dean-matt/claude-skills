# The issue pipeline

An issue passes up to four stages in order; its risk decides how many. Each stage is written by
one skill, then reviewed by [`review-design`](../../review-design/SKILL.md) before the next may
start.

| Stage | Written by | Writes | Agent label prefix |
|---|---|---|---|
| criteria | [`issue`](../SKILL.md) | Summary, Open questions, Out of scope, Acceptance criteria, and Reproduction for a bug | `criteria-agent` |
| ui | [`ui-design`](../../ui-design/SKILL.md) | UI/UX Design | `ui-agent` |
| technical | [`technical-design`](../../technical-design/SKILL.md) | Technical Design | `technical-agent` |
| test | [`test-design`](../../test-design/SKILL.md) | Test Design | `test-agent` |

The labels, their colors and the commands that create them are in
[`../../setup/references/labels.md`](../../setup/references/labels.md).

## Which stages an issue needs

The issue's `risk:<level>` label ([scale](../../setup/references/severity.md)) decides:

- **`info`, `low` or `medium`:** the criteria stage alone. `build` plans from the criteria and the
  code, and the pull request review checks the result. Most issues take this path.
- **No `risk:` label**, as on an issue written before the rule: the pipeline rates it first, and
  the criteria review checks it. An issue whose technical stage already passed keeps its design
  and needs none.
- **`high` or `critical`:** every design stage. **ui** runs only when the body has
  a UI/UX Design heading, which `issue` adds only for a change a user can see. **technical** and
  **test** run for every type except a spike.
- A **spike** needs the criteria stage alone.

## Gates

- A stage starts only when every earlier needed stage carries `<prefix>:review-passed`.
- A skill that edits a stage's section removes that stage's `review-passed`, and every later
  stage's, because what follows was designed against the old text.
- A later stage that finds an earlier one wrong removes the earlier `review-passed`, adds its
  `changes-requested`, and says why in a comment. The pipeline then runs from that stage again.
- A stage that cannot proceed adds an unticked Open question and stops. In **autonomous** mode
  (`auto`) it sorts each question first:
  - **Low stakes** (naming, wording, a default for an edge the criteria leave open): decide it
    from the issue, the code and Out of scope, taking the narrower answer where they leave it open.
    Write `- [x] <question> — Decided (auto): <answer>, because <reason>`.
  - **Needs a person** (changes stored data or a migration, behavior a user will notice, scope
    beyond the title, a split into more issues, or a lower risk than the criteria stage rated; or only the user can know it, such as a credential, price or deadline): leave
    it unticked and return it with a recommended answer and alternatives. The caller asks the
    user and writes `- [x] <question> — Answered: <answer>`.

  When unsure, it needs a person. An answer that changes a criterion is written into that criterion in the
  same step, so none keeps stating what the user rejected, and the pipeline returns to the criteria
  stage. When the last question is ticked and its answer is in the sections that
  carry it, post one comment, through [`technical-writing`](../../technical-writing/SKILL.md), listing each question and answer
  tagged `Decided (auto)` or `Answered`, then delete the `## Open questions` section
  ([`shape.md`](shape.md)). Report every decision.
- Review stops after one full pass and three verify passes. The last findings are applied and unreviewed, so
  the stage ends with `designed` and no result label, and the issue is held for the user with
  those findings and the [cap message](../../review-design/SKILL.md#the-cap-message).
  `review-design` reviews the edits next.

## Claiming

A skill that writes or edits a stage claims the issue first. The claim holds through every stop
until a pull request or the holder's word moves it on: [`claim.md`](claim.md). Review passes claim nothing.

## Ready to build

An issue is ready when every needed stage has `review-passed`, none has `changes-requested`,
no Open question is unticked, nothing open blocks it, and it has no open sub-issues.
[`scripts/ready.sh`](../scripts/ready.sh) computes this, so no skill restates it:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/issue/scripts/ready.sh" <issue>
```

It prints `ready` (exit 0) or one `not ready: <reason>` line per failure (exit 1). Blockers,
sub-issues, open questions and state are checked for every issue. The stage labels are checked
only for an issue in the pipeline; one that passes the rest but carries no agent label prints
`not in the pipeline` (exit 2), so a caller can offer to run the pipeline or build it as written.

## Moving a label

```bash
gh issue edit <n> --add-label "ui-agent:designed" --remove-label "ui-agent:changes-requested"
```
