# Mode: design

For one stage of an issue: criteria, ui, technical or test. Stages and gates:
[`../../issue/references/pipeline.md`](../../issue/references/pipeline.md).

- **Source of items:** the numbered findings in the stage's latest `<!-- design-pass:<stage> -->`
  comment.
- **Claim first,** per [`claim`](../../issue/references/claim.md), before the first edit.
- **Applying:** edit only that stage's section, inside its `<details open>` wrapper with the blank
  lines kept. Re-read the issue first and write the whole body back, so a concurrent edit
  elsewhere survives. Editing a section clears that stage's `review-passed` and every later
  stage's.
- **Never add a criterion to answer a finding.** Reword, tighten or merge existing ones, or move a
  detail to the stage that owns it. A finding only a new criterion can meet is not applied: reply
  `**Held for the user**` and add an unticked Open question proposing it.
- **A finding that needs another stage changed** is not applied here. Record it as a reply and
  follow the pipeline's rule for sending an earlier stage back.
- **Replying:** edit the stage's latest `<!-- design-pass:<stage> -->` comment in place. Under
  each numbered finding add an indented verdict: `**Applied** — <what changed>`,
  `**Declined** — <reason>` or `**Held for the user** — <the Open question>`. Change nothing else.

  ```bash
  gh api repos/{owner}/{repo}/issues/comments/<id> -X PATCH -F body=@pass.md
  ```
  A `critical`, `high` or `medium` with a `Declined` or `Held` verdict keeps its comment visible;
  `tidy.mjs` skips it. A declined `low` or `info` waits on nobody.
- **Labels:** after editing, remove the stage's `changes-requested`, which describes the old text.
  `designed` with no result label means written and not yet reviewed. This mode never adds
  `review-passed` or `changes-requested`.
- **Finish:** hand back to [`review-design`](../../review-design/SKILL.md) for a fresh pass, which
  sets the result label. After two passes stop without another: the last findings are applied and
  unreviewed, and the issue is held for the user with the
  [cap message](../../review-design/SKILL.md#the-cap-message). The next stage waits for `review-passed`.
