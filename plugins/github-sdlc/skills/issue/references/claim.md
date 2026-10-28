# Claiming an issue for design

Design writes no branch, so the assignee is the claim. [`pick-issue`](../../pick-issue/SKILL.md)
holds an issue assigned to someone else. A skill that writes or edits a stage claims first.

## Claim

```bash
me=$(gh api user --jq .login)
others() { gh issue view <n> --json assignees --jq '[.assignees[].login] | map(select(. != "'"$me"'")) | join(", ")'; }
others
```

Output means someone else holds it: stop and name them. Otherwise assign, then check again, since
two sessions can pass the first check together:

```bash
gh issue edit <n> --add-assignee @me
others
```

Output now means a rival also assigned: run `gh issue edit <n> --remove-assignee @me`, stop and
name them. Otherwise move the card to **In Progress**
([`board.md`](../../setup/references/board.md#move-a-card)). An issue this login already holds
needs nothing more.

## Release

A claim holds until the issue moves on: [`open-pr`](../../open-pr/SKILL.md) moves the card to
**In Review** and [`merge-pr`](../../merge-pr/SKILL.md) to **Done**. A stop never releases it: not
a failure, a review cap, an Open question, a declined question, or the user choosing to stop. The
issue stays assigned and **In Progress**, so no one else can take it while the holder is slow to
answer, and [`pick-issue`](../../pick-issue/SKILL.md) resumes it for the holder.

Release only when the holder says to give the issue up. Unassign and move the card back to
**Todo** ([`board.md`](../../setup/references/board.md#move-a-card)):

```bash
gh issue edit <n> --remove-assignee @me
```

Then run the board move with status `Todo`. A `build` claim also deletes its empty branch:
[`claim-and-worktree.md`](../../build/references/claim-and-worktree.md#give-up-a-claim).
