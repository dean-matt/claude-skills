---
name: pick-issue
description: Choose the next GitHub issue to work — list open issues in priority order, keep only those ready to build and not held, and either take the first or let the user choose. Use when asked what to work on next, to pick up an issue, or when `build` is invoked with no issue named.
argument-hint: "[issue-number] [--auto]"
---

# Picking an issue

Say which issue you are taking and which you skipped and why, then stop; [`build`](../build/SKILL.md)
claims it.

## Order

**Resume first.** An issue you claimed and left unfinished comes before new work: `In Progress` on
the board, assigned to you, no open pull request. The board query below reads `Todo` only, and a
claim moves the card out of `Todo`.

```bash
me=$(gh api user --jq .login)
gh project item-list <n> --owner <owner> --limit 2000 --format json --jq "
  .items[] | select(.status == \"In Progress\" and .content.type == \"Issue\"
                    and ((.assignees // []) | index(\"$me\"))) | .content.number"
```

Drop numbers an open pull request closes (`closedByPullRequestsReferences`, in the *Held* command
below); `build` resumes those. Put the rest ahead of the ranked list, in board order. They still
pass the readiness and held checks.

Then use the first source that exists for new work:

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

An issue with no milestone or rank is backlog; the user ranks it. Severity informs, rank
decides: never reorder by severity.

## Ready

Check candidates in rank order with one command, before the *Held* checks. It runs the readiness check ten at a time and
stops at the first batch holding a takeable issue:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/pick-issue/scripts/next.sh" <n>...    # or the numbers on stdin
"${CLAUDE_PLUGIN_ROOT}/skills/pick-issue/scripts/next.sh" --design <n>...
```

It prints a line per candidate and ends `take <n>` or `none`. Skip `not ready` issues and report
the reasons. With `--design`, an issue lacking passed stages, in no pipeline, or carrying an
unticked Open question is `needs design` and takeable. Without it, an issue `ready.sh` calls
`not in the pipeline` (exit 2) is taken only if the user agrees to build it as written.
A parent is never ready (it has open sub-issues); its children are the work.

## Held

Check *Held* on the issue `next.sh` takes, not on every candidate. If it is held, drop it and run
`next.sh` on the rest. An issue is held when someone other than you is assigned, an open pull
request closes it, or a branch named for it (`*/<number>-*`) exists with no open pull request. A
branch of yours with an open pull request is not held: taking it resumes that work.

```bash
gh issue view <n> --json assignees,closedByPullRequestsReferences
git ls-remote --heads origin '*/<n>-*'
```

## Always report

Any open `severity:critical` bug, even when not picked, and how many issues wait in Triage.

## Options

Pass an issue number to name one, or `--auto`.

- **Named issue**: skip ordering; still run the readiness and held checks.
- **Interactive** (default when several qualify): show the top five with title, milestone and
  why any were skipped, checking *Held* on those five, and ask which to take.
- **Auto**: take the first without asking; stop with the reason when none qualify. The `auto`
  skill passes `--design`.

On "API rate limit exceeded", stop and report; do not retry in a loop.
