# Resolving a merge conflict

For a conflict from merging the default branch into the issue's worktree. `$n` is the pull
request number.

Take the default branch's `version` line (the bump raises it again) and stage the file.
Everything else is a judgment:

1. Abort with `git merge --abort`.
2. Hand back the pull request, the default-branch commit the merge met (`git rev-parse
   MERGE_HEAD` before aborting), and each conflicted file with its hunks quoted.
3. Name who resolves it: the owner for a protected path, otherwise the pull request's author
   (the session that built the branch, or a fresh `build` run on the pull request).

The resolver merges the default branch into the branch in the issue's worktree, runs the check
command, then commits and pushes. Never rebase.

| File | Resolution |
|---|---|
| A lockfile | Check out the branch's side, then run the install command so it regenerates the entries; never edit it by hand |
| A table in a doc | Both rows; a row both sides edited becomes one row carrying both edits |
| Code | The author merges both intents, and a test covers the merged behavior |
