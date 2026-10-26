# The issue pipeline

An issue passes four stages in order. Each stage is written by one skill, then reviewed by
[`review-design`](../../review-design/SKILL.md) before the next may start.

| Stage | Written by | Writes | Agent label prefix |
|---|---|---|---|
| criteria | [`issue`](../SKILL.md) | Summary, Open questions, Out of scope, Acceptance criteria, and Reproduction for a bug | `criteria-agent` |
| ui | [`ui-design`](../../ui-design/SKILL.md) | `## UI/UX Design` | `ui-agent` |
| technical | [`technical-design`](../../technical-design/SKILL.md) | `## Technical Design` | `technical-agent` |
| test | [`test-design`](../../test-design/SKILL.md) | `## Test Design` | `test-agent` |

The labels, their colors and the commands that create them are in
[`../../setup/references/labels.md`](../../setup/references/labels.md).

## Which stages an issue needs

- **ui** only when the body has a `## UI/UX Design` heading. `issue` adds the heading only for
  a change a user can see, so no heading means no stage.
- **technical** and **test** for every type except a spike. A docs or trivial issue writes
  `n/a — <reason>` and still passes review.
- A **spike** needs the criteria stage alone.

## Gates

- A stage starts only when every earlier needed stage carries `<prefix>:review-passed`.
- A skill that edits a stage's section removes that stage's `review-passed`, and every later
  stage's, because what follows was designed against the old text.
- A later stage that finds an earlier one wrong removes the earlier `review-passed`, adds its
  `changes-requested`, and says why in a comment. The pipeline then runs from that stage again.
- A stage that cannot proceed adds an unticked Open question and stops. In **autonomous** mode
  (the `auto` skill's) it decides instead: the answer the issue, the code and Out of scope best
  support, and the narrower one where they leave it open. Tick the question and append the
  answer and its reason on the same line, as `- [x] <question> — Decided (auto): <answer>,
  because <reason>`. Where the answer changes a criterion, the criteria stage rewrites it and
  the pipeline runs again from there. Report every such decision. A question only the user can
  answer, such as a credential, a price or a deadline, stays unticked and stops.
- Review stops after three passes with `changes-requested` still set. The issue is then held
  for the user with the last findings attached.

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
