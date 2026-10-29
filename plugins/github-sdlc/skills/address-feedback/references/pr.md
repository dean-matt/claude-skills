# Mode: pull request

- **Source of items:** the pass reviews and their line comments
  (`gh api repos/{owner}/{repo}/pulls/<n>/reviews`, `.../comments`) plus unresolved human
  threads.
- **Replying:** write `[{"id": <comment id>, "body": "**Applied** — ..."}]` and post every reply
  as one review: `node "${CLAUDE_PLUGIN_ROOT}/skills/address-feedback/scripts/reply.mjs" <n> replies.json`.
  A reply posted singly through `.../comments/<id>/replies` becomes a review of its own, so the
  script is the way. A fix that moves a line outdates its thread; the reply still posts.
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
- **Finish:** the label is [`review-pr`](../../review-pr/SKILL.md#5-label-and-hand-off)'s,
  set after every pass.
- **Return** the label left and what each pass found.
