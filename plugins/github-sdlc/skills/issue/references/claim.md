# Claiming an issue

Writing criteria makes no branch, so the assignee is the claim. [`pick-issue`](../../pick-issue/SKILL.md)
holds an issue assigned to someone else. A skill that reshapes an issue claims first.

## Claim

The assignee names a login, and two sessions can share one. Take the session lock first
([`lock.mjs`](../scripts/lock.mjs)):

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/issue/scripts/lock.mjs" acquire <n>
```

`busy <pid>` means another live session on this machine holds the issue: stop and name it. A lock
this session already holds, which includes its subagents, prints `held`. Then check the assignee:

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
name them. Otherwise move the card to **In Development**
([`board.md`](../../setup/references/board.md#move-a-card)). An issue this login already holds
needs nothing more than removing `needs-user` where set.

## Release

A claim holds until the issue moves on: [`open-pr`](../../open-pr/SKILL.md) moves the card to
**In Review** and [`merge-pr`](../../merge-pr/SKILL.md) to **Done**. A stop never releases it: not
a failure, a review cap, an Open question, a declined question, or the user choosing to stop. The
issue stays assigned and **In Development**, so no one else can take it while the holder is slow to
answer, and [`pick-issue`](../../pick-issue/SKILL.md) resumes it for the holder.

The session lock is the exception: drop it when this session stops working the issue, merged or
stopped, so a later session can resume it. A lock also lapses when its session ends.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/issue/scripts/lock.mjs" release <n>
```

## Waiting on the user

A stop that waits on the user's answer (a review cap, an Open question for a person, a merge
condition only the user clears) adds `needs-user` to the issue. Whoever acts on the issue next
removes it: the caller once the user answers, or the next skill to claim it. `auto`'s
[`timing.mjs`](../../auto/scripts/timing.mjs) reports the time it is set as waiting.

```bash
gh issue edit <n> --add-label needs-user      # on the stop
gh issue edit <n> --remove-label needs-user   # on the answer or the next claim
```

## Give up

Release only when the holder says to give the issue up. Drop the lock, unassign and move the card back to
**Todo** ([`board.md`](../../setup/references/board.md#move-a-card)):

```bash
gh issue edit <n> --remove-assignee @me
```

Then run the board move with status `Todo`. A `build` claim also deletes its empty branch:
[`claim-and-worktree.md`](../../build/references/claim-and-worktree.md#give-up-a-claim).
