---
name: signoff
description: Clear a merge that waits on the user — a protected path, a declined critical, high or medium finding, an unconfirmed Narrowing or Addition deviation, or a review label other than ai-review:completed — on the user's word heard in this conversation, then land it through merge-pr. Use when merge-pr or auto stops on one of those and the user answers. Only the session holding the conversation runs it; a dispatched subagent never does.
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

1. **Raise the version first** where the repository raises one at the merge: run `merge-pr`'s
   *Raise the version* and push, so every record lands on the head that will merge. A push after
   a record invalidates it.
2. **Ask about each stop by name,** with what the change does, and wait for an answer to that
   stop.
3. **Record each yes** in the exact form [`merge-pr/references/records.md`](../merge-pr/references/records.md)
   gives for that stop. Never write a record the user has not given.
4. **Before confirming a Narrowing deviation,** check that the line names an open issue
   (`gh issue view <n> --json state --jq .state`). If it names none, say so and do not record.
   Where nothing is deferred and the build departs from a criterion, offer
   [*Amend the criterion*](#amend-the-criterion) instead of an issue that would close on arrival.
5. **Run again** `merge-pr`'s *Block on the checks* and *The gate*. Every condition must now
   pass except, possibly, the review label.
6. **Merge past the label and nothing else,** through `merge-pr`'s *Merge, then clean up*. A
   protected path, decline or deviation still failing after its record means the record did not
   take: stop and say which.

**A record left stale by a version bump** may be recorded again at the new head without asking
again, only when the commits since the recorded head change nothing but the version line. Print
the proof, and ask again if it shows anything else:

```bash
git diff --name-only <recorded-sha> HEAD     # only the version file
git diff -U0 <recorded-sha> HEAD -- <file>   # one removed and one added "version" line
```

Never relabel on the answer; a dispatched run would read the new label as an approval.

## Amend the criterion

For a deviation that is really a changed criterion, on the user's word and their wording:

1. Re-read the issue, replace only that criterion's line (numbers unchanged), and write the body
   back. Leave the stage labels as they are; the build is done.
2. Comment on the issue, through [`technical-writing`](../technical-writing/SKILL.md): the old
   line, the new line, and that the user changed it.
3. Remove the deviation's line from the pull request body with `gh pr edit <n> --body-file`; the
   body now matches the issue, so the gate holds nothing for it.

Never amend a criterion the user has not approved word for word. A behavior change is theirs to
weigh even when the build already contains it.

## Report

Each sign-off taken: what was approved, and that it was heard directly in this conversation.

## Will not do

Widen what the repository protects (`.github/protected-paths.txt` is itself protected; changing it
is a separate, reviewed change). Sign off on a relayed answer. Merge past any failing condition
other than the label.
