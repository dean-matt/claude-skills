---
name: pick-issue
description: Choose the next GitHub issue to work — list open issues in priority order, keep only those ready to build and not held, and either take the first or let the user choose. Use when asked what to work on next, to pick up an issue, or when `build` is invoked with no issue named.
---

# Picking an issue

Say which issue you are taking and which you skipped and why, then stop; [`build`](../build/SKILL.md)
claims it.

## Order

Use the first source that exists:

1. **The project board**, when [`setup`](../setup/references/discovery.md) found one: its `Todo`
   cards, in the board's own order or its `Rank` field.
2. **Milestones**: the earliest due, else the lowest title, then rank within it.
3. **Oldest first.**

An issue with no milestone or no rank is backlog and is not picked; the user ranks it.
Severity informs and rank decides: never reorder by severity.

## Ready

Run the readiness check on each candidate, in order:

```bash
"${CLAUDE_PLUGIN_ROOT}/skills/issue/scripts/ready.sh" <n>
```

Skip an issue that prints `not ready` and report the reasons. An issue it calls
`not in the pipeline` (exit 2) is taken only if the user agrees to build it as written.
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

- **Named issue**: skip ordering; still run the readiness and held checks.
- **Interactive** (default when several qualify): show the top five with title, milestone and
  why any were skipped, and ask which to take.
- **Auto**: take the first without asking; stop with the reason when none qualify.

On "API rate limit exceeded", stop and report; do not retry in a loop.
