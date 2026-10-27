# Mode: pull request

- **Source of items:** the pass reviews and their line comments
  (`gh api repos/{owner}/{repo}/pulls/<n>/reviews`, `.../comments`) plus unresolved human
  threads.
- **Replying:** `gh api repos/{owner}/{repo}/pulls/<n>/comments/<id>/replies -f body=...`.
  A fix that moves a line outdates its thread; the reply still posts.
- **Resolving:** resolve each thread once it carries its verdict and the fix is pushed. A
  declined thread stays unresolved until the user agrees. `tidy.mjs pr <n>` does this (loop step 6); run it after each pass
  is answered and again before setting the label.

  ```bash
  gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved comments(first:1){nodes{databaseId}}}}}}}' \
    -f o=<owner> -f r=<repo> -F n=<n>
  gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<threadId>
  ```
- **After the fixes,** rewrite the body sections the fixes changed with `gh pr edit <n>
  --body-file`, as [`open-pr`](../../open-pr/SKILL.md) describes. A body describing code the
  review rejected misleads the next reader.
- **Finish:** set `ai-review:completed` only when the last pass was a full pass, its review has posted, the
  check command is green and nothing still waits on the user:
  - a declined `critical` or `warning`,
  - a point a pass asked the user to confirm,
  - a **Narrowing** or **Addition** deviation the user has not confirmed,
  - a second bug filed as its own issue.

  Otherwise leave `ai-review:changes-requested`. The user clears each of these in
  conversation, and the record the gate reads is in
  [`../../merge-pr/references/records.md`](../../merge-pr/references/records.md).
  `gh pr edit <n> --add-label <one> --remove-label <other>` swaps the labels in one call.
- **Return** the label left and what each pass found.
