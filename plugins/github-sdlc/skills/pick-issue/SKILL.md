---
name: pick-issue
description: Choose the next GitHub issue to work — list open issues in priority order, keep only those ready to build and not held, and either take the first or let the user choose. Use when asked what to work on next, to pick up an issue, or when `build` is invoked with no issue named.
argument-hint: "[issue-number] [auto]"
---

# Picking an issue

Say which issue you are taking and which you skipped and why, then stop; [`build`](../build/SKILL.md)
claims it.

## Order

Use the first source that exists:

1. **The project board**, when [`setup`](../setup/references/discovery.md) found one. Read its
   `Todo` issue cards that have a milestone and a rank, soonest milestone first (by due date,
   else by title), then lowest rank:

   ```bash
   gh project item-list <n> --owner <owner> --limit 2000 --format json --jq '
     [.items[] | select(.status == "Todo" and .content.type == "Issue"
                        and .milestone != null and .rank != null)
      | {number: .content.number, milestone: .milestone.title, due: (.milestone.dueOn // ""), rank}]
     | sort_by([(.due == ""), .due, .milestone, .rank]) | .[].number'
   ```

   A board with no `Rank` field returns nothing here; use the next source.
2. **Milestones**: the earliest due, else the lowest title, then oldest within it.
3. **Oldest first.**

An issue with no milestone or no rank is backlog and is not picked; the user ranks it.
Severity informs and rank decides: never reorder by severity.

## Ready

Check the candidates in rank order with one command. It runs the readiness check on ten at a
time and stops at the first batch holding an issue worth taking, so a board of blocked cards
costs a few calls, not three per card in sequence:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/pick-issue/scripts/next.sh" <n>...    # or the numbers on stdin
"${CLAUDE_PLUGIN_ROOT}/skills/pick-issue/scripts/next.sh" --design <n>...
```

It prints a line per candidate and ends `take <n>` or `none`. Skip an issue that is `not ready`
and report the reasons. With `--design`, an issue that lacks passed stages, or is not in the
pipeline at all, is `needs design` and takeable: it is the pipeline's to work, not the build's.
Without it, an issue `ready.sh` calls `not in the pipeline` (exit 2) is taken only if the user
agrees to build it as written.
A parent is never ready, since the check skips an issue with open sub-issues; its children
are the work.

## Held

An issue is held when someone other than you is assigned, an open pull request closes it, or a
branch named for it (`*/<number>-*`) exists with no open pull request. A branch of yours with an
open pull request is not held: taking it resumes that work.

```bash
gh issue list --state open --limit 100 --json number,title,labels,assignees,milestone,closedByPullRequestsReferences
git ls-remote --heads origin '*/<n>-*'
```

## Always report

Any open `severity:critical` bug, even when not picked, and how many issues wait in Triage.

## Options

Pass an issue number to name one, or the word `auto`.

- **Named issue**: skip ordering; still run the readiness and held checks.
- **Interactive** (default when several qualify): show the top five with title, milestone and
  why any were skipped, and ask which to take.
- **Auto**: take the first without asking; stop with the reason when none qualify. The `auto`
  skill passes `--design`.

On "API rate limit exceeded", stop and report; do not retry in a loop.
