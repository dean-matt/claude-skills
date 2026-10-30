---
name: cleanup
description: Find and remove what a build run strands — issue worktrees, claim and feature branches whose pull request merged or closed or whose issue closed, and claims you choose to give up. Use when asked to clean up or tidy branches or worktrees.
---

# Cleaning up

Run it from any checkout of the repository. It changes nothing until you confirm.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/cleanup/scripts/scan.mjs"
```

It covers branches named like a claim (`feat/12-slug`) and any local or remote branch that heads a
pull request, so a chore branch with no issue number is included.

Each line is `verdict`, kind, ref and reason:

- **safe**: merged, or an empty claim whose issue is closed. Removing loses nothing.
- **ask**: a branch whose pull request closed unmerged, a copy with commits the merge lacks,
  a worktree on an unrecognised branch, or your own claim on an open issue. Removing a claim gives
  the issue up ([`claim.md`](../issue/references/claim.md#give-up)).
- **keep**: an issue another live session holds (`lock.mjs status <n>` prints `busy`), an open
  pull request, uncommitted changes (including in the checkout you are on), commits with no pull
  request, or someone else's claim on an open issue.

## Steps

1. Show the table. Say how many are safe, ask and keep.
2. Confirm the **safe** items once, as a list. Delete them on a yes.
3. Take each **ask** item on its own, saying what is lost if the answer is yes: for a closed
   pull request, the commits the branch alone holds.
4. Never touch **keep** items.

## Removing

Remove a worktree before its branch. A branch cannot be deleted while a checkout is on it: if the
main checkout is on one you are removing, move it off first, from the main checkout and not from
inside a worktree being removed:

```bash
git switch <default-branch> && git pull --ff-only
```

The scan keeps a branch whose checkout has uncommitted changes, so this carries no work across.
Say which branch you moved to.

```bash
git worktree remove <path>                          # refuses on uncommitted work; never add --force
git worktree prune
git branch -D <branch>                              # -D: a squash merge is not an ancestor
git push --quiet origin --delete <branch>           # only if the remote copy exists
gh issue edit <n> --remove-assignee @me             # a claim you give up
```

A claim given up also moves its card back to **Todo**
([`board.md`](../setup/references/board.md#move-a-card)).

Stop on a refusal and report it. Re-run the scan to show what remains.

## Will not do

Force a removal, delete a branch holding commits no merged pull request contains without an
explicit yes, or close an issue or pull request. Closing is the user's.
