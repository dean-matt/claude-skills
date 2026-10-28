# Claiming an issue and opening its worktree

## Claim

The branch name derives from the issue number, so a second session claiming the issue creates
the same ref and GitHub refuses it with `Reference already exists (HTTP 422)`.

```bash
n=<n>; base=$(gh repo view --json defaultBranchRef --jq .defaultBranchRef.name)
me=$(gh api user --jq .login)
b=$(git ls-remote --heads origin "*/$n-*" | sed 's|.*refs/heads/||' | head -1)
if [ -n "$b" ]; then
  gh issue view "$n" --json assignees --jq '[.assignees[].login] | join(", ")'
else
  slug=$(gh issue view "$n" --json title --jq '.title | ascii_downcase | [scan("[a-z0-9]+")][0:5] | join("-")')
  b="${type:-feat}/$n-${slug:-issue}"
  sha=$(gh api "repos/{owner}/{repo}/git/ref/heads/$base" --jq .object.sha)
  gh api 'repos/{owner}/{repo}/git/refs' -f ref="refs/heads/$b" -f sha="$sha" --silent
  gh issue edit "$n" --add-assignee @me
fi
```

`type` is `fix`, `feat`, `chore` or the repository's own prefix. A 422 means another session
created the branch first: someone holds it. An existing branch prints the assignees. Only `$me`
means the claim is yours from a run that stopped: resume on `$b`. Anyone else means they hold it:
take the next issue, or stop and name the holder.

## Open the worktree

```bash
main=$(git rev-parse --show-toplevel); d=.claude/worktrees/$n
git fetch --quiet origin "$b"; git worktree prune
git worktree add --quiet "$d" "$b" && cd "$d"
```

Exclude it from git: `echo .claude/worktrees/ >> "$main/.git/info/exclude"`. Run the install
command from `setup` inside the worktree. Link untracked local state the build needs (a vendored
data directory, `.env`) with `ln -sfn`; never link a database two agents would write. Enter with
`cd`, not a harness worktree tool.

## Give up a claim

Only when the user says to give the issue up; a stopped run keeps its claim
([`claim.md`](../../issue/references/claim.md#release)). Delete the branch only if neither copy
is ahead of the base, unassign yourself, then move the card back to **Todo**.

```bash
[ "$(gh api "repos/{owner}/{repo}/compare/$base...$b" --jq .ahead_by)" = 0 ] &&
  git push --quiet origin --delete "$b" && { git branch -D "$b" 2>/dev/null; true; }
gh issue edit "$n" --remove-assignee @me
```

## Close

From outside the worktree: `git worktree remove .claude/worktrees/<n> && git worktree prune`.
It refuses to discard uncommitted work; stop on that refusal and never force it.
