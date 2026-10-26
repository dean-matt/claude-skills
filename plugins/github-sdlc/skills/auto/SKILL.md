---
name: auto
description: Work the repository's issues one after another, from open to merged — run the design pipeline on the next issue when it lacks one, then dispatch build (which includes the pull request review) and merge-pr per issue in fresh subagents, stop on the first issue that does not merge, and finish by running cleanup. Use when asked to work through the backlog, clear the board, or keep going until a count or a deadline.
argument-hint: "[--issue <n>] [--count <n>] [--deadline <2h>]"
---

# Working the backlog

The lifecycle, in order: the [design pipeline](../issue/references/pipeline.md) where an issue
lacks it, [`build`](../build/SKILL.md) to a pull request, which `build` hands to
[`review-pr`](../review-pr/SKILL.md) and [`address-feedback`](../address-feedback/SKILL.md) until
`ai-review:completed`, [`merge-pr`](../merge-pr/SKILL.md) to the default branch, and
[`cleanup`](../cleanup/SKILL.md) when the run ends. This calls them in turn and decides only when
to stop. Run every command from the main checkout.

## Limits

Arguments are `--issue <n>`, `--count <n>` and `--deadline <duration>`, in any order, all optional:

```
/github-sdlc:auto --issue 42
/github-sdlc:auto --count 1
/github-sdlc:auto --count 3 --deadline 2h
```

`--issue <n>` runs the lifecycle on that one issue and skips the ranking, with a count of 1. Step 2
still checks it: `next.sh --design` on that number alone, and its *Held* rules. An issue that is
not ready, blocked or held stops the run with the reason. Give `--issue` with `--count` and the run
stops on the contradiction before it takes anything.

A duration is a number and `m` or `h`. Wall clock is the only budget a skill can measure. Print a
deadline once with `echo $(( $(date +%s) + <seconds> ))` and carry the number. With neither
argument, the run ends when [`pick-issue`](../pick-issue/SKILL.md) returns `none`; say so before
starting. Before starting, restate the limits in one line, such as "count 3, deadline 2h".

Free wording ("merge one issue") is read as the same arguments, but an argument that cannot be
read, such as `--count many` or `--deadline soon`, stops the run before it takes an issue, naming the
argument and the form above. Never guess a limit: a wrong guess merges the wrong number of
pull requests.

## Per issue

**1. Read the limits.** Stop where the run has merged the count, or where the deadline has passed:

```bash
if [ "$(date +%s)" -ge <deadline> ]; then echo past; else echo within; fi
```

Read them here and nowhere else — abandoning an issue mid-flight leaves a branch and a pull
request nobody asked for. The deadline stops the next issue from starting, not the one running.

**2. Choose.** Rank the board with [`pick-issue`](../pick-issue/SKILL.md)'s Order, then run
`next.sh --design` on that list from the main checkout. Drop any issue pick-issue's *Held* rules exclude first. One script reads the backlog, so the
choice and the dispatches cannot disagree. It ends `take <n>` or `none`. Stop on `none` and give
each reason it printed; a board with nothing designed is not an empty board.

Where the line for `<n>` reads `needs design`, go to *Design* below and come back with the
issue designed. Where it reads `ready`, go to step 2b.

**2b. Build.** Dispatch a fresh subagent that invokes `github-sdlc:build` in autonomous mode for
issue `<n>`. Ask for `build`'s report. Stop where it:

- **puts the review pass outside the `pr-auditor` agent.** An agent that reviews its own work
  still earns `ai-review:completed`, and GitHub cannot check the claim, so this catches a failed
  dispatch and not a skipped one
- **names an issue and no pull request.** Give the condition. Looping back either retakes a
  not-ready issue forever or skips a check that failed

**Design.** Dispatch a fresh subagent that runs the [pipeline](../issue/references/pipeline.md)
on issue `<n>` in autonomous mode: write each needed stage with its skill and review it with
[`review-design`](../review-design/SKILL.md), starting at the first stage that lacks
`review-passed`, and sort each Open question as the pipeline says. It claims the issue and moves
the card to In Progress before its first edit, and keeps the claim for the build that follows;
where the pipeline stops it releases the issue, except when it returns questions for a person.
Ask for the issue, the label each stage ended on, every question it decided with its answer, and
every question it left for a person with its recommendation and alternatives. Running `auto` is the user's
word to run the pipeline, never to build an issue as written. Then run `next.sh` for `<n>` once
more: `ready` goes to step 2b. Where it returned questions for a person, ask them yourself,
in this conversation: one `AskUserQuestion` for the batch, the recommended answer first. Then
dispatch a fresh design subagent that gets the issue and the user's answers, quoted as theirs,
records each as `Answered`, and carries on from where the pipeline stopped. Stop where:

- **the user declines to answer a question,** or a stage ends on `changes-requested` after three
  review passes. Quote the question or the last findings; the issue is the user's to answer
- **`<n>` is not `ready` after the pipeline.** Looping would design it forever. Give the reason

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

## Cleanup

When the run ends, for any reason but a rate limit, invoke [`cleanup`](../cleanup/SKILL.md) in
this conversation — never a subagent, since it asks the user before it deletes. Run it before the
report, so the report names what is left rather than what was there. A stopped issue's branch,
pull request and worktree are **keep** or **ask** items: cleanup shows them and leaves them
unless the user says otherwise.

## The report

One line per issue attempted, in order:

- `#<n>` **merged** — the pull request, the merge commit, and anything left waiting on the user,
  such as a second issue `build` filed
- `#<n>` **stopped** — the pull request, the condition quoted from the skill that named it, and
  that the next run picks the same issue unless its readiness or rank changed

Close with why the run ended, and name which of a branch, a pull request and a worktree are
there after cleanup — read them off disk and GitHub rather than inferring them from where the run stopped.
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

**Build from an issue as written.** An issue with no pipeline labels gets the pipeline, never an
approach written and approved by the run itself.

**Start itself.** No cron, no workflow trigger, nothing that begins a run without a person
asking. Nobody reads an unwatched run, and it merges all the same.

**Share a dispatch.** Once step 2b or step 4 sends a subagent off, it is the worktree's only
writer until it reports back. Resuming it by hand, or dispatching a second one at the same
issue, gives the worktree two drivers — wait for the report instead.

**Research by fork.** A fork runs the dispatch prompts it inherits. Research with an `Explore`
agent: lacking Edit, Write and Agent narrows that drift, though its Bash can still commit.
