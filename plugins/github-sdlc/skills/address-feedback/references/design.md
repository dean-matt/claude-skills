# Mode: design

For one stage of an issue: criteria, ui, technical or test. Stages and gates:
[`../../issue/references/pipeline.md`](../../issue/references/pipeline.md).

- **Source of items:** the numbered findings in the stage's latest `<!-- design-pass:<stage> -->`
  comment.
- **Claim first,** per [`claim`](../../issue/references/claim.md), before the first edit.
- **Applying:** edit only that stage's own section. Re-read the issue first, change the
  section, and write the body back, so a concurrent edit elsewhere survives. Editing a section
  clears that stage's `review-passed` and every later stage's.
- **Applying a finding never adds a criterion.** Reword, tighten or merge existing ones, or move
  a detail to the stage that owns it. A finding that can only be met by a new criterion would
  widen the issue, and each such addition draws findings of its own, which is how a nine-criterion
  issue grew to eighteen over three passes. Do not apply it: reply `**Held for the user**`
  and add an unticked Open question proposing the criterion, which the caller asks the user.
- **A finding that needs another stage changed** is not applied here. Record it as a reply and
  follow the pipeline's rule for sending an earlier stage back.
- **Replying:** one issue comment answering each finding by number: `**Applied**` or
  `**Declined** — <reason>`. It opens with `<!-- design-replies:<stage> -->` so tidying can find it.
- **Finish:** hand back to [`review-design`](../../review-design/SKILL.md) for a fresh pass.
  The pass sets `review-passed` or `changes-requested`; this mode never sets either. After
  three passes the issue is held for the user with the last findings attached. The next stage
  does not start until `review-passed` is set.
