# Claiming an issue and opening its worktree

## Claim

The branch name derives from the issue number, so two sessions claiming one issue create the
same ref and GitHub refuses the second with `Reference already exists (HTTP 422)`.

```bash
n=<n>; base=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)
if git ls-remote --exit-code --heads origin "*/$n-*" >/dev/null; then echo held; else
  slug=$(gh issue view "$n" --json title --jq '.title | ascii_downcase | [scan("[a-z0-9]+")][0:5] | join("-")')
  b="${type:-feat}/$n-${slug:-issue}"
  sha=$(gh api "repos/{owner}/{repo}/git/ref/heads/$base" --jq .object.sha)
  gh api 'repos/{owner}/{repo}/git/refs' -f ref="refs/heads/$b" -f sha="$sha" --silent
  gh issue edit "$n" --add-assignee @me
fi
```

`type` is `fix`, `feat`, `chore` or the repository's own prefix. `held` or a 422 means
someone holds it: take the next issue, or stop naming the holder.

## Open the worktree

```bash
main=$(git rev-parse --show-toplevel); d=.claude/worktrees/$n
git fetch --quiet origin "$b"; git worktree prune
git worktree add --quiet "$d" "$b" && cd "$d"
```

Keep `.claude/worktrees/` out of git with `echo .claude/worktrees/ >> "$main/.git/info/exclude"`.
Run the install command from `setup` inside the worktree. Link untracked local state the
build needs (a vendored data directory, `.env`) with `ln -sfn`; never link a database two
agents would write. Enter with `cd`, not a harness worktree tool.

## Release a claim no pull request followed

Delete the branch only if neither copy is ahead of the base; assign yourself off the issue.

```bash
[ "$(gh api "repos/{owner}/{repo}/compare/$base...$b" --jq .ahead_by)" = 0 ] &&
  git push --quiet origin --delete "$b" && { git branch -D "$b" 2>/dev/null; true; }
gh issue edit "$n" --remove-assignee @me
```

## Close

From outside the worktree: `git worktree remove .claude/worktrees/<n> && git worktree prune`.
It refuses rather than discarding uncommitted work; stop on that refusal and never force it.
