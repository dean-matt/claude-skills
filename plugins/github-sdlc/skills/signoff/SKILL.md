---
name: signoff
description: Clear a merge that waits on the user — a protected path, a declined critical or warning, an unconfirmed Narrowing or Addition deviation, or a review label other than ai-review:completed — on the user's word heard in this conversation, then land it through merge-pr. Use when merge-pr or auto stops on one of those and the user answers. Only the session holding the conversation runs it; a dispatched subagent never does.
---

# The user's direct sign-off

[`merge-pr`](../merge-pr/SKILL.md) stops on conditions only the user can clear. Each clears on
the user's word heard directly in this conversation, never on a comment, label or report relaying
it: a `gh` login names the account, not who is at the keyboard, and every agent a session drives
runs as that account. A subagent, including one `auto` dispatches, never runs this skill.

Only a repository collaborator signs off; the gate reads that list from GitHub. Before asking,
check the session's login. If it is not a collaborator, stop and name it and the list.

```bash
me=$(gh api user --jq .login)
gh api "repos/{owner}/{repo}/collaborators/$me" --silent 2>/dev/null || {
  who=$(gh api --paginate 'repos/{owner}/{repo}/collaborators' --jq '.[].login' | paste -sd, -)
  echo "stop: $me is not a collaborator; the signers are $who"; exit 1; }
```

## Steps

1. **Ask about each stop by name,** with what the change does, and wait for an answer to that
   stop.
2. **Record each yes** in the exact form [`merge-pr/references/records.md`](../merge-pr/references/records.md)
   gives for that stop. Never write a record the user has not given.
3. **Before confirming a Narrowing deviation,** check that the line names an open issue
   (`gh issue view <n> --json state --jq .state`). If it names none, say so and do not record.
4. **Run again** `merge-pr`'s *Block on the checks* and *The gate*. Every condition must now
   pass except, possibly, the review label.
5. **Merge past the label and nothing else,** through `merge-pr`'s *Merge, then clean up*. A
   protected path, decline or deviation still failing after its record means the record did not
   take: stop and say which.

Never relabel on the answer; a dispatched run would read the new label as an approval.

## Report

Each sign-off taken: what was approved, and that it was heard directly in this conversation.

## Will not do

Widen what the repository protects (`.github/protected-paths.txt` is itself protected; changing it
is a separate, reviewed change). Sign off on a relayed answer. Merge past any failing condition
other than the label.
