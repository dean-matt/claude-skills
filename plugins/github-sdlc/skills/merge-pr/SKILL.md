---
name: merge-pr
description: Carry one reviewed pull request to the default branch — raise the version if the repository opted in, wait on the checks, run the merge gate, squash-merge, delete the branch and its worktree, move the board to Done, and leave the checkout current. Use when asked to merge, land or ship a pull request. Stops and names the condition where the gate fails.
---

# Merging a pull request

Scripts need Node 20.11 or newer and live in [`scripts/`](scripts/); run them from the
repository checkout, as `"${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/<name>.mjs"`. Run every
command from the main checkout, since a worktree holds the branch the merge deletes, except
*Raise the version*, which works in the issue's worktree.

```bash
n=<pr>
gh pr view "$n" --json state,isDraft,url
b=$(gh pr view "$n" --json headRefName --jq .headRefName)
issue=$(gh pr view "$n" --json closingIssuesReferences --jq '.closingIssuesReferences[0].number')
```

The input is an open, non-draft pull request. Anything else stops.

## Raise the version

Only where the repository's CLAUDE.md or CONTRIBUTING.md says the merge raises a version.
Without that sentence, skip this section. The bump happens at the merge, not in the pull
request, so no other open pull request carries a version line to redo.

Work in the issue's worktree, opening it on `$b` as
[`../build/references/claim-and-worktree.md`](../build/references/claim-and-worktree.md) says
where it is gone:

```bash
git pull --ff-only && git fetch origin <default-branch> && git merge --no-edit origin/<default-branch>
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/version-bump.mjs" "$n"
```

The defaults are the usual convention: `feat` raises the minor, anything else the patch, and
docs and Markdown alone skip it. Pass a flag only where the repository's sentence names an
exception: `--file <path>`, `--feat <kind>`, `--other <kind>`, `--skip <glob>`. The script skips a
pull request a bot opened. It prints `no bump` where nothing changes and the new version
otherwise; for a version, commit the file and push. A conflict goes to
[`references/conflicts.md`](references/conflicts.md). A commit hook that fails for missing
dependencies wants the install command from `setup` run first.

## Block on the checks

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/wait-checks.mjs" "$n"
```

Run it with a 600000 ms tool timeout, straight after a push. It judges the local branch's tip,
never the head GitHub shows, so it waits until CI reports on the commit just pushed. Exit 2:
name what it printed and hand back. Exit 1: read the failed step with
`gh run view <id> --log-failed`, rerun the failed runs once, wait again, and on a second exit 1
name the failed checks and hand back.

```bash
gh pr checks "$n" --json bucket,link --jq '[.[] | select(.bucket == "fail" or .bucket == "cancel")
  | .link | capture("/runs/(?<id>[0-9]+)").id] | unique | .[]' |
  while read -r id; do gh run rerun "$id" --failed; done
sleep 30
```

A rerun keeps the head and its red checks, so the sleep lets it show as pending first.

## The gate

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/merge-gate.mjs" "$n"
```

It prints each condition as `pass` or `FAIL` with the detail. Merge where it exits 0 and
otherwise name each failure and stop. A branch that is behind goes to
[`references/behind-branch.md`](references/behind-branch.md). A protected path (one listed in `.github/protected-paths`), a blocking
decline, an unconfirmed deviation and any review label other than `ai-review:completed` wait on
the user: name each and hand back. The user clears them by the records in
[`references/records.md`](references/records.md). Read the pass body the script points at too,
since a finding no line anchors lives there.

Two lines print beside "the review converged" and stop nothing: the distance line (how far
behind the tip the last pass sits, with the `git log` range that counted it) and the cap line
(a waiver at the cap, an overage past it). Run the range and weigh what it lists. A `warn` line
that the pull request is not linked to its issue stops nothing either; name it to the user, who
repairs it from the pull request's Development box.

## Merge, then clean up

Close the issue's worktree first, or `gh` cannot delete the branch it holds. It refuses rather
than discarding anything uncommitted; stop on that refusal and never force it.

```bash
git worktree remove .claude/worktrees/<issue> && git worktree prune
gh pr merge "$n" --squash --delete-branch
git checkout <default-branch> && git pull --ff-only
```

An issue blocked by this one needs nothing edited: closing a blocker clears the block by itself.
Move the issue's card to **Done** with
[`../setup/references/board.md`](../setup/references/board.md). A failure there does not undo
the merge: report the card as not moved and carry on.

Report the merge commit, the issue it closed, and that the checkout is on the default branch.

## Options

- **Interactive** (default): confirm once before `gh pr merge`, since it cannot be undone from here.
- **Autonomous**: merge when the gate exits 0, and stop on the first condition it names.

On "API rate limit exceeded" stop and wait for the reset; never retry in a loop.

## Will not do

Waive a condition: a gate that argues itself open on the merge it is judging is not a gate.
Resolve a conflict past what [`references/conflicts.md`](references/conflicts.md) allows. Review:
that is [`review-pr`](../review-pr/SKILL.md), and this skill reads what that pass left behind.
