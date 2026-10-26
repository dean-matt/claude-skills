# Resolving a merge conflict

Reached wherever merging the default branch into the issue's worktree stops on a conflict.
`$n` is the pull request number.

Settle a conflicted `version` line by taking the default branch's version, since the bump
raises it again, then stage the file. Everything else is a judgment, so:

1. Abort with `git merge --abort`.
2. Hand back the pull request, the default-branch commit the merge met (`git rev-parse
   MERGE_HEAD` before aborting), and each conflicted file with its hunks quoted.
3. Name who resolves it: the owner for a protected path, the pull request's author otherwise
   (the session that built the branch, or a fresh `build` run on the pull request).

Whoever resolves it merges the default branch into the branch in the issue's worktree, runs the
check command, and commits and pushes the merge. Never rebase.

| File | Resolution |
|---|---|
| A lockfile | Check out the branch's side, then run the install command so it regenerates the entries; never edit it by hand |
| A table in a doc | Both rows; a row both sides edited becomes one row carrying both edits |
| Code | The author merges both intents, and a test covers the merged behavior |
