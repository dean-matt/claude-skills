# Mode: design

For one stage of an issue: criteria, ui, technical or test. Stages and gates:
[`../../issue/references/pipeline.md`](../../issue/references/pipeline.md).

- **Source of items:** the numbered findings in the stage's latest `<!-- design-pass:<stage> -->`
  comment.
- **Claim first,** per [`claim`](../../issue/references/claim.md), before the first edit.
- **Applying:** keep the section's `<details open>` wrapper and its blank lines when rewriting
  the content; a broken wrapper folds the rest of the issue into it. Edit only that stage's own section. Re-read the issue first, change the
  section, and write the body back, so a concurrent edit elsewhere survives. Editing a section
  clears that stage's `review-passed` and every later stage's.
- **Applying a finding never adds a criterion.** Reword, tighten or merge existing ones, or move
  a detail to the stage that owns it. A finding that can only be met by a new criterion would
  widen the issue, and each such addition draws findings of its own, which is how a nine-criterion
  issue grew to eighteen over three passes. Do not apply it: reply `**Held for the user**`
  and add an unticked Open question proposing the criterion, which the caller asks the user.
- **A finding that needs another stage changed** is not applied here. Record it as a reply and
  follow the pipeline's rule for sending an earlier stage back.
- **Replying:** edit the stage's latest `<!-- design-pass:<stage> -->` comment in place, not a new
  one. Append the verdict under each numbered finding, indented: `**Applied** — <what changed>`,
  `**Declined** — <reason>` or `**Held for the user** — <the Open question it became>`. The
  finding and its answer then sit together, and a pass costs one comment. Keep the marker as the
  first line and change nothing else in the body.

  ```bash
  gh api repos/{owner}/{repo}/issues/comments/<id> -X PATCH -F body=@pass.md
  ```
  A comment whose `critical` or `warning` carries a `Declined` or `Held` verdict stays visible for
  the user; `tidy.mjs` leaves it. A declined `comment` is a taste call and waits on nobody.
- **Labels:** once the edits are written, remove the stage's `changes-requested`, since it
  describes the text before them. A stage with `designed` and no result label is written and
  awaiting review. This mode never adds `review-passed` or `changes-requested`.
- **Finish:** hand back to [`review-design`](../../review-design/SKILL.md) for a fresh pass,
  which sets `review-passed` or `changes-requested`. After three passes stop without another:
  the last findings are applied and unreviewed, so the stage ends awaiting review, with no
  result label, and is held for the user. The next stage does not start until `review-passed`
  is set.
