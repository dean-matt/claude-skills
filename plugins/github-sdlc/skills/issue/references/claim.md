# Claiming an issue for design

Design writes no branch, so the assignee is the claim. [`pick-issue`](../../pick-issue/SKILL.md)
holds an issue assigned to someone else. A skill that writes or edits a stage claims first.

## Claim

```bash
me=$(gh api user --jq .login)
others() { gh issue view <n> --json assignees --jq '[.assignees[].login] | map(select(. != "'"$me"'")) | join(", ")'; }
others
```

Output means someone else holds it: stop and name them. Otherwise assign, then check again, since
two sessions can pass the first check together:

```bash
gh issue edit <n> --add-assignee @me
others
```

Output now means a rival also assigned: run `gh issue edit <n> --remove-assignee @me`, stop and
name them. Otherwise move the card to **In Progress**
([`board.md`](../../setup/references/board.md#move-a-card)). An issue this login already holds
needs nothing more.

## Release

When the run's work on the issue ends and nothing in the run continues it (the pipeline stopped on
a question, or the stage ran on its own), unassign and move the card back to **Todo**:

```bash
gh issue edit <n> --remove-assignee @me
```

Keep the claim when `build` follows in the run; `build` adds its branch.
