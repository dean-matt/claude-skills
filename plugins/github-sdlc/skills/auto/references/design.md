# Design, in `auto`

Step 2 sends an issue that `next.sh` calls `needs design` here, then returns to step 2b.

Dispatch a fresh subagent that runs the [pipeline](../../issue/references/pipeline.md) on
issue `<n>` in autonomous mode, from the first stage lacking `review-passed`. The issue is already
claimed. Ask for the label each stage ended on, each question it decided with its answer, and each
question it left for a person with a recommendation and alternatives. Running `auto` authorizes the
pipeline, never building an issue as written.

Then run `next.sh` for `<n>`. `ready` goes to step 2b.

Add `needs-user` to `<n>` before each `AskUserQuestion` below and remove it once the user answers
([`claim`](../../issue/references/claim.md#waiting-on-the-user)).

- **Questions for a person.** Ask them yourself in one `AskUserQuestion`, recommended answer first.
  Dispatch a fresh design subagent with the issue and the user's answers, quoted as theirs; it
  records each as `Answered`, edits any criterion the answer changes, and continues. A yes to a
  split creates the new issues as [`address-feedback`](../../address-feedback/references/design.md)
  says; this run carries on with `<n>`.
- **A stage still lacks `review-passed` after a full pass and three verify passes.** Ask in one `AskUserQuestion` that
  quotes the last findings and the stage's growth in criteria or items. No result label means
  unreviewed edits; `changes-requested` means findings stand. Options, first is the default:
  - **One more review pass:** dispatch `review-design` once, which verifies the last edits; ask
    again if it still fails.
  - **Accept as it stands:** only when the last pass found no `critical`. Do it yourself on the
    user's word, never in a subagent: comment quoting the accepted findings, add
    `<prefix>:review-passed`, remove `<prefix>:changes-requested`, continue.
  - **Stop here.**

Stop when the user declines a question or chooses to stop (quote the question or findings), or when
`<n>` is not `ready` after the pipeline (give the reason). A stop keeps the claim on `<n>`, as
[`claim`](../../issue/references/claim.md#release) says.
