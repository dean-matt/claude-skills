---
name: cleanup
description: Find and remove what a build run strands — issue worktrees, claim and feature branches, and issue assignments whose pull request merged, closed or never opened. Use when asked to clean up, tidy branches or worktrees, or when pick-issue skips an issue as held that nobody is building.
---

# Cleaning up

Run it from any checkout of the repository. It changes nothing until you confirm.

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/cleanup/scripts/scan.mjs"
```

Each line is `verdict`, kind, ref and reason:

- **safe**: merged, or a claim with no commits. Removing loses nothing.
- **ask**: a branch whose pull request closed unmerged, a copy with commits the merge lacks,
  a worktree on an unrecognised branch, an assignment with no branch or pull request.
- **keep**: an open pull request, uncommitted changes, or commits with no pull request.

## Steps

1. Show the table. Say how many are safe, ask and keep.
2. Confirm the **safe** items once, as a list. Delete them on a yes.
3. Take each **ask** item on its own, saying what is lost if the answer is yes: for a closed
   pull request, the commits the branch alone holds.
4. Never touch **keep** items.

## Removing

Remove a worktree before its branch, and leave a branch the main checkout has checked out:
switch that checkout to the default branch first, or report it.

```bash
git worktree remove <path>                          # refuses on uncommitted work; never add --force
git worktree prune
git branch -D <branch>                              # -D: a squash merge is not an ancestor
git push --quiet origin --delete <branch>           # only if the remote copy exists
gh issue edit <n> --remove-assignee @me             # an assignment
```

Stop on a refusal and report it. Re-run the scan to show what remains.

## Will not do

Force a removal, delete a branch holding commits no merged pull request contains without an
explicit yes, or close an issue or pull request. Closing is the user's.
