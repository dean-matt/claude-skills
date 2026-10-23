# Mode: pull request

- **Source of items:** the pass reviews and their line comments
  (`gh api repos/{owner}/{repo}/pulls/<n>/reviews`, `.../comments`) plus unresolved human
  threads.
- **Replying:** `gh api repos/{owner}/{repo}/pulls/<n>/comments/<id>/replies -f body=...`.
  A fix that moves a line outdates its thread; the reply still posts.
- **After the fixes,** rewrite the body sections the fixes changed with `gh pr edit <n>
  --body-file`, as [`open-pr`](../../open-pr/SKILL.md) describes. A body describing code the
  review rejected misleads the next reader.
- **Finish:** set `ai-review:completed` only when the last pass's review has posted, the
  check command is green and nothing still waits on the user — a declined critical or
  warning, a point a pass asked the user to confirm, a second bug filed as its own issue.
  Otherwise leave `ai-review:changes-requested`.
  `gh pr edit <n> --add-label <one> --remove-label <other>` swaps them in one call.
- **Return** the label left and what each pass found.
