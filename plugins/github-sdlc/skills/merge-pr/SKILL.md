---
name: merge-pr
description: Carry one reviewed pull request to the default branch — raise the version if the repository opted in, wait on the checks, run the merge gate, squash-merge, delete the branch and its worktree, move the board to Done, and leave the checkout current. Use when asked to merge, land or ship a pull request. Stops and names the condition where the gate fails.
argument-hint: "<pr-number> [--autonomous | --gate-only]"
---

# Merging a pull request

Scripts need Node 20.11+ and live in [`scripts/`](scripts/): `"${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/<name>.mjs"`.
Run every command from the main checkout (a worktree holds the branch the merge deletes), except
*Raise the version*, which runs in the issue's worktree.

```bash
n=<pr>
gh pr view "$n" --json state,isDraft,url
b=$(gh pr view "$n" --json headRefName --jq .headRefName)
issue=$(gh pr view "$n" --json closingIssuesReferences --jq '.closingIssuesReferences[0].number')
```

The input is an open, non-draft pull request. Anything else stops.

## Raise the version

Only where the repository's CLAUDE.md or CONTRIBUTING.md says the merge raises a version;
otherwise skip. [`build`](../build/SKILL.md) raises it in the pull request's last commit, so
this prints `no bump` unless the default branch moved past it or the title's type changed.

Work in the issue's worktree, reopening it on `$b` per
[`../build/references/claim-and-worktree.md`](../build/references/claim-and-worktree.md) if gone:

```bash
git pull --ff-only && git fetch origin <default-branch> && git merge --no-edit origin/<default-branch>
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/version-bump.mjs" "$n"
```

Defaults: `feat` raises the minor, anything else the patch; docs and Markdown alone skip it.
Pass a flag only where the repository's sentence names an exception: `--file <path>`,
`--feat <kind>`, `--other <kind>`, `--skip <glob>`. It skips a bot's pull request. It prints
`no bump`, which needs no commit, or the new version, which you commit as
`chore: release <version>` and push.

Add ` [skip ci]` to that message when the merge above printed `Already up to date` and the
default branch's rules require no check:

```bash
gh api "repos/{owner}/{repo}/rules/branches/<default-branch>" \
  --jq '[.[] | select(.type == "required_status_checks")] | length'   # 0
```

CI then skips a run that would test the version line alone, and the scripts below judge the
commit before it. A merge that brought commits in, or a required check, needs the full run. A conflict goes to
[`references/conflicts.md`](references/conflicts.md). A commit hook failing on missing
dependencies needs the install command from `setup` first.

## Block on the checks

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/wait-checks.mjs" "$n"
```

Run it with a 600000 ms tool timeout, straight after a push. It judges the local branch's tip,
not the head GitHub shows, so it waits for CI on the commit just pushed.

- Exit 2: name what it printed and hand back.
- Exit 1: read the failed step with `gh run view <id> --log-failed`, rerun the failed runs once
  and wait again. A second exit 1: name the failed checks and hand back.

```bash
gh pr checks "$n" --json bucket,link --jq '[.[] | select(.bucket == "fail" or .bucket == "cancel")
  | .link | capture("/runs/(?<id>[0-9]+)").id] | unique | .[]' |
  while read -r id; do gh run rerun "$id" --failed; done
sleep 30
```

A rerun keeps the head and its red checks; the sleep lets it show pending first.

## The gate

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/merge-gate.mjs" "$n"
```

It prints each condition as `pass` or `FAIL` with detail. Exit 0: merge the head it judged,
`<sha>` (`git rev-parse HEAD` in the worktree, or `gh pr view "$n" --json headRefOid`). Otherwise name each
failure and stop.

- Behind the base: [`references/behind-branch.md`](references/behind-branch.md).
- Waits on the user: a protected path (`.github/protected-paths.txt`), a blocking decline, an
  unconfirmed deviation, any review label other than `ai-review:completed`. Name each and hand
  back; the user clears them with the records in [`references/records.md`](references/records.md).
- Read the pass body the script points at: a finding no line anchors lives there.

Stop nothing, but weigh them: the distance line beside "the review converged" (how far behind the
tip the last pass sits, with the `git log` range), the cap line (a waiver at the cap, an overage
past it), and a `warn` that the pull request is not linked to its issue (name it to the user, who
repairs it from the pull request's Development box).

## Merge, then clean up

Close the issue's worktree first, or `gh` cannot delete the branch it holds. It refuses to
discard uncommitted work; stop on that refusal and never force it. Run the merge, the card move
and anything after as separate commands, since chained they make one burst of GitHub calls.

```bash
git worktree remove .claude/worktrees/<issue> && git worktree prune
gh pr merge "$n" --squash --delete-branch --match-head-commit <sha>
git checkout <default-branch> && git pull --ff-only
```

Closing a blocker clears the block; edit nothing on blocked issues. Move the issue's card to
**Done** ([`../setup/references/board.md`](../setup/references/board.md)). A failure there does
not undo the merge: report the card as not moved.

Report the merge commit, the issue it closed, and that the checkout is on the default branch.

## Options

Pass `--autonomous`.

- **Interactive** (default): confirm once before `gh pr merge`, since it cannot be undone from here.
- **Autonomous**: merge when the gate exits 0, and stop on the first condition it names.
- **Gate only**: everything before *Merge, then clean up*, then stop. Report `gate passed at
  <sha>` or the condition that stopped it. `auto` uses this from a subagent and merges in the
  session the user started, whose request authorizes the merge.

On "API rate limit exceeded" stop and wait for the reset; never retry in a loop.

## Will not do

Waive a condition. Resolve a conflict past what [`references/conflicts.md`](references/conflicts.md)
allows. Review: that is [`review-pr`](../review-pr/SKILL.md); this skill reads what it left.
