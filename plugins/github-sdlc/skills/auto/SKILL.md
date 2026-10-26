---
name: auto
description: Work the repository's ready issues one after another, from open to merged — dispatch build then merge-pr per issue in fresh subagents, and stop on the first issue that does not merge. Use when asked to work through the backlog, clear the board, or keep going until a count or a deadline.
---

# Working the backlog

[`build`](../build/SKILL.md) takes an issue to a reviewed pull request;
[`merge-pr`](../merge-pr/SKILL.md) takes that pull request to the default branch. This calls them
in turn and decides only when to stop. Run every command from the main checkout.

Take a count of issues to merge, a wall-clock deadline, both, or neither — wall clock is the
only budget a skill can measure. Print a deadline once with `echo $(( $(date +%s) + <seconds> ))`
and carry the number. With neither, the run ends when [`pick-issue`](../pick-issue/SKILL.md)
returns nothing; say so before starting.

## Per issue

**1. Read the limits.** Stop where the run has merged the count, or where the deadline has passed:

```bash
if [ "$(date +%s)" -ge <deadline> ]; then echo past; else echo within; fi
```

Read them here and nowhere else — abandoning an issue mid-flight leaves a branch and a pull
request nobody asked for. The deadline stops the next issue from starting, not the one running.

**2. Build.** Dispatch a fresh subagent that invokes `github-sdlc:build` in autonomous mode and names no
issue; its own choosing picks one. Reading the backlog here too would make two readers that can
disagree. Ask for `build`'s report. Stop where it:

- **puts the review pass outside the `pr-auditor` agent.** An agent that reviews its own work
  still earns `ai-review:completed`, and GitHub cannot check the claim, so this catches a failed
  dispatch and not a skipped one
- **names no issue.** Give the reason it named. If ready issues are missing only because their
  design stages are unfinished, say which, and offer to run the
  [pipeline](../issue/references/pipeline.md) on them
- **names an issue and no pull request.** Give the condition. Looping back either retakes a
  not-ready issue forever or skips a check that failed

**3. Run the gate.**

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/merge-gate.mjs" <pr>
```

Continue where it exits 0. Stop the run on a failure and quote each `FAIL` line, or the usage
line on exit 2. Where the stop is a protected path, a blocking decline, an unconfirmed deviation
or the label, and the user answers it in this conversation, run [`signoff`](../signoff/SKILL.md)
yourself; never relabel and dispatch step 4, whose subagent would merge on a relayed answer.
Then continue at step 5. Any other stop ends the run.

**4. Merge.** Dispatch a second fresh subagent, since the agent that wrote the code is the worst
reader of a gate judging its own work. Its prompt is exactly this, with the number substituted:

> Invoke the `github-sdlc:merge-pr` skill in autonomous mode for pull request `<pr>`. Report the merge
> commit, or the condition that stopped you.

Add nothing: no review commentary, no earlier denial. Stop where the report names a condition
instead of a merge commit.

**5. Count the merge and loop.** `gh pr view <pr> --json state,mergeCommit` settles whether it
merged; a subagent's report does not. A `state` other than `MERGED` stops the run. The count is
of merges, not attempts.

## The report

One line per issue attempted, in order:

- `#<n>` **merged** — the pull request, the merge commit, and anything left waiting on the user,
  such as a second issue `build` filed
- `#<n>` **stopped** — the pull request, the condition quoted from the skill that named it, and
  that the next run picks the same issue unless its readiness or rank changed

Close with why the run ended, and name which of a branch, a pull request and a worktree are
there — read them off disk and GitHub rather than inferring them from where the run stopped.
Name a worktree in particular: the next run's `git worktree add` fails on it until it is cleared.

## Rate limits

A subagent's report of "API rate limit exceeded" ends the run. Wait for the reset before the next
run; never retry in a loop. `gh api rate_limit` does not show the secondary limit that expensive
bursts trip, so plenty left there proves nothing.

## Will not do

**Resolve what stopped it, or skip past it.** A declined finding, a red check and a gate
condition are each the user's to weigh, and taking the next issue buries that decision under a
second pull request. Step 3's `signoff` is not skipping past it: the user weighed the stop, and
the run goes on only on their word.

**Rerank the backlog.** Rank and milestone belong to the repository's collaborators.

**Start itself.** No cron, no workflow trigger, nothing that begins a run without a person
asking. Nobody reads an unwatched run, and it merges all the same.

**Share a dispatch.** Once step 2 or step 4 sends a subagent off, it is the worktree's only
writer until it reports back. Resuming it by hand, or dispatching a second one at the same
issue, gives the worktree two drivers — wait for the report instead.

**Research by fork.** A fork runs the dispatch prompts it inherits. Research with an `Explore`
agent: lacking Edit, Write and Agent narrows that drift, though its Bash can still commit.
