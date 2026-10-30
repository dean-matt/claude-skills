---
name: auto
description: Work the repository's issues one after another, from open to merged — write the next issue's acceptance criteria when it lacks them, then dispatch build, the pull request review and merge-pr's gate per issue in fresh subagents and merge in this session, stop on the first issue that does not merge, and finish by running cleanup. Use when asked to work through the backlog, clear the board, or keep going until a count or a deadline.
argument-hint: "[--issue <n>] [--count <n>] [--deadline <2h>]"
---

# Working the backlog

Lifecycle, per issue: [`issue`](../issue/SKILL.md) where the issue lacks criteria,
[`build`](../build/SKILL.md), [`review-pr`](../review-pr/SKILL.md) with
[`address-feedback`](../address-feedback/SKILL.md) until `ai-review:completed`,
[`merge-pr`](../merge-pr/SKILL.md). [`cleanup`](../cleanup/SKILL.md) runs
when the run ends. This skill calls them in turn and decides when to stop. Run every command from
the main checkout.

## Cost

Spend few tokens and finish fast: those are the plugin's [goals](../../README.md#goals). A long
conversation is the main cost: every turn re-reads all of it. Run each issue through this
skill, whose `build` and `merge-pr` subagents start fresh, rather than driving the stages by hand
in one conversation. If you do drive them by hand, start a new session between stages.

## Limits

Optional arguments, in any order:

| Argument | Meaning |
|---|---|
| `--issue <n>` | Run this one issue and skip the ranking. Implies a count of 1; with `--count`, stop before taking anything |
| `--count <n>` | Stop after `<n>` merges |
| `--deadline <n>m\|<n>h` | Stop starting issues after this wall-clock time |

```
/github-sdlc:auto --issue 42
/github-sdlc:auto --count 3 --deadline 2h
```

Print a deadline once with `echo $(( $(date +%s) + <seconds> ))` and carry the number. Restate the
limits in one line before starting, such as "count 3, deadline 2h". With neither limit, the run
ends when `next.sh` returns `none`; say so.

An argument that cannot be read (`--count many`) stops the run before it takes an issue, naming the
argument. Never guess a limit.

## Per issue

**1. Read the limits.** Stop where the run has merged the count, or where the deadline has passed:

```bash
if [ "$(date +%s)" -ge <deadline> ]; then echo past; else echo within; fi
```

Read them here and nowhere else — abandoning an issue mid-flight leaves a branch and a pull
request nobody asked for. The deadline stops the next issue from starting, not the one running.

**2. Choose.** Say what you are doing in plain words, as [`pick-issue`](../pick-issue/SKILL.md#what-to-tell-the-user) says. Rank the board with [`pick-issue`](../pick-issue/SKILL.md)'s Order, which puts an
issue you claimed and left unfinished ahead of new work. Run `next.sh --criteria` on that list. It
ends `take <n>` or `none`; on `none`, stop and give each reason it printed. Check its *Held* rules
on `<n>` only; if held, drop it and run `next.sh --criteria` on the rest. Read the board on the
first issue only and keep the ranked list for the run, as `pick-issue`'s Order says.

**Claim `<n>` before any dispatch,** as [`claim`](../issue/references/claim.md) says. Print the
issue number once the card has moved. If someone else holds it, drop it and run `next.sh --criteria`
on the rest.

`needs criteria` goes to *Criteria*, then back here. `ready` goes to step 2b.

**2b. Build.** Dispatch a fresh subagent that invokes `github-sdlc:build` with `--autonomous
--no-review` for issue `<n>`, and say `next.sh` just returned `take <n>`. Ask for `build`'s
report. Stop where it:

- **proposes a split.** Add `needs-user` to `<n>`, ask the user with the proposal as the
  recommended answer, and remove the label. On a yes, dispatch a fresh subagent that splits as
  [`issue`](../issue/SKILL.md#splitting) says, then dispatch build again for `<n>`. On a no, dispatch
  build again saying the user kept the issue whole.
- **names an issue and no pull request.** Give the condition. Looping back either retakes a
  not-ready issue forever or skips a check that failed

**2c. Review.** Dispatch a fresh subagent, which starts small where the build agent ended large:

> Invoke the `github-sdlc:review-pr` skill for pull request `<pr>`, and run `address-feedback`
> autonomously for each fix round it hands off, working in `.claude/worktrees/<n>`. Report the
> label left, each pass and the agent it ran in, and what waits on the user.

Stop where it **puts a review pass outside the `pr-auditor` agent.** An agent that reviews its own
work still earns `ai-review:completed`, and GitHub cannot check the claim, so this catches a
failed dispatch and not a skipped one.

**Criteria.** Run [`references/criteria.md`](references/criteria.md), then `ready` goes to step 2b.

**3. Merge.** Dispatch a fresh subagent, since the agent that wrote the code is the worst reader
of a gate judging its own work. Its prompt is exactly this, with the number substituted:

> Invoke the `github-sdlc:merge-pr` skill with `--gate-only` for pull request `<pr>`. Report
> `gate passed at <sha>`, or the condition that stopped you.

Add nothing: no review commentary, no earlier denial. `merge-pr` runs the gate; nothing here runs
it first. On `gate passed at <sha>`, run `merge-pr`'s *Merge, then clean up* yourself with that
`<sha>`: the merge belongs to the session whose user ran `auto`, never to a subagent. `merge-pr`
pauses before the card move; wait five seconds (`sleep 5`) before the next pick.

Where the report names a protected path, a blocking decline, an unconfirmed deviation or
the label, add `needs-user` to the issue while you ask, and remove it once the user answers
([`claim`](../issue/references/claim.md#waiting-on-the-user)). When the user answers in this conversation, run [`signoff`](../signoff/SKILL.md)
yourself; never relabel and dispatch again, whose subagent would merge on a relayed answer. Then
continue at step 4. Any other condition ends the run.

**4. Count the merge and loop.** `gh pr view <pr> --json state,mergeCommit` settles whether it
merged; a subagent's report does not. A `state` other than `MERGED` stops the run. The count is
of merges, not attempts.

Time the issue, merged or stopped, and keep the output for the report:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/auto/scripts/timing.mjs" <n> [<pr>]
node "${CLAUDE_PLUGIN_ROOT}/skills/auto/scripts/tokens.mjs" <n> [<pr>]
```

## Cleanup

Delete the board file `pick-issue` made, whatever ended the run.

When the run ends for any reason but a rate limit, invoke [`cleanup`](../cleanup/SKILL.md) in this
conversation, never in a subagent, since it asks before deleting. Run it before the report. A
stopped issue's branch, pull request and worktree show as keep or ask items and stay unless the
user says otherwise.

## The report

Take the report, and any comment this skill posts, through [`technical-writing`](../technical-writing/SKILL.md).

One line per issue attempted, in order:

- `#<n>` **merged** — the pull request, the merge commit, and anything left waiting on the user,
  such as a second issue `build` filed
- `#<n>` **stopped** — the pull request, the condition quoted from the skill that named it, and
  that the next run picks the same issue unless its readiness or rank changed

Under each, the lines `timing.mjs` and `tokens.mjs` printed, as they printed them.

Close with why the run ended, and which branch, pull request and worktree remain after cleanup,
read off disk and GitHub.
Name a worktree in particular: the next run's `git worktree add` fails on it until it is cleared.

## Rate limits

A subagent's report of "API rate limit exceeded" ends the run. Wait for the reset before the next
run; never retry in a loop. `gh api rate_limit` does not show the secondary limit that expensive
bursts trip, so plenty left there proves nothing. Keep the burst small: one board read
per run, a pause between the merge, the card move and the next pick, and few concurrent calls.

## Will not do

**Resolve what stopped it, or skip past it.** A declined finding, a red check and a gate
condition are each the user's to weigh, and taking the next issue buries that decision under a
second pull request. Step 3's `signoff` is not skipping past it: the user weighed the stop, and
the run goes on only on their word.

**Rerank the backlog.** Rank and milestone belong to the repository's collaborators.

**Build from an issue without criteria.** It gets its criteria from `issue` first, never an
approach written and approved by the run itself.

**Start itself.** No cron, no workflow trigger, nothing that begins a run without a person
asking. Nobody reads an unwatched run, and it merges all the same.

**Share a dispatch.** Once step 2b, 2c or 3 sends a subagent off, it is the worktree's only
writer until it reports back. Resuming it by hand, or dispatching a second one at the same
issue, gives the worktree two drivers — wait for the report instead.

**Research by fork.** A fork runs the dispatch prompts it inherits. Research with an `Explore`
agent: lacking Edit, Write and Agent narrows that drift, though its Bash can still commit.
