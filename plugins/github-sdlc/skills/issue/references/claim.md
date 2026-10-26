# Claiming an issue for design

Design writes no branch, so the assignee is the claim. [`pick-issue`](../../pick-issue/SKILL.md)
treats an issue assigned to someone else as held, so assigning and moving the card is what keeps
a second person or session off it. A skill that writes or edits a stage claims first.

## Claim

```bash
me=$(gh api user --jq .login)
holders=$(gh issue view <n> --json assignees --jq '[.assignees[].login] | map(select(. != "'"$me"'")) | join(", ")')
```

A non-empty `holders` means someone else holds it: stop and name them. Otherwise assign, then
read the assignees again, since two sessions can pass the first check together:

```bash
gh issue edit <n> --add-assignee @me
gh issue view <n> --json assignees --jq '[.assignees[].login] | map(select(. != "'"$me"'")) | join(", ")'
```

Output on the second read means a rival got there too. Run
`gh issue edit <n> --remove-assignee @me`, stop and name them.

Then move the card to **In Progress**, as [`board.md`](../../setup/references/board.md#move-a-card)
describes. An issue the same login already holds, such as a later stage in the same run, needs
nothing more.

## Release

When this run's work on the issue ends and nothing in the run continues it, because the pipeline
stopped on a question or the stage was run on its own, unassign and move the card back to
**Todo**:

```bash
gh issue edit <n> --remove-assignee @me
```

Keep the claim when `build` follows in the same run. `build` adds its branch to it and moves
the card on.
