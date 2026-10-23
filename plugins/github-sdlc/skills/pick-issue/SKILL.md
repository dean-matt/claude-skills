---
name: pick-issue
description: Choose the next GitHub issue to work — list open issues in priority order, skip ones someone else holds, and either take the first or let the user choose. Use when asked what to work on next, to pick up an issue, or when `build` is invoked with no issue named.
---

# Picking an issue

Say which issue you are taking and which you skipped, then stop; [`build`](../build/SKILL.md)
claims it.

## Order

Use the first source that exists:

1. **The project board**, when [`setup`](../setup/references/discovery.md) found one: its
   status `Todo` cards, by the board's own order or a `Rank` field.
2. **Milestones**: the earliest due milestone first.
3. **Labels** such as `priority:high`, if the repository uses them.
4. **Oldest first.**

Skip any issue that is closed, carries `blocked` with an open `Blocked by` reference, or is
held.

## Held

An issue is held when someone other than you is assigned, an open pull request closes it, or
a branch named for it (`*/<number>-*`) exists with no open pull request. A branch of yours
with an open pull request is not held: taking it resumes that work.

```bash
gh issue list --state open --limit 100 --json number,title,labels,assignees,milestone,closedByPullRequestsReferences
git ls-remote --heads origin '*/<n>-*'
```

## Options

- **Named issue**: skip ordering, check only that it is not held.
- **Interactive** (default when several qualify): show the top five with title, milestone and
  why any were skipped, and ask which to take.
- **Auto**: take the first without asking; stop with the reason when none qualify.

On "API rate limit exceeded", stop and report; do not retry in a loop.
