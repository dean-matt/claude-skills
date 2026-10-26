---
name: open-pr
description: Open a pull request for the current branch with a short structured body — closing link, what, why, screenshots, deviations — and keep that body accurate as the branch changes. Use when a branch is pushed and ready for review, or when a pull request body needs rewriting.
argument-hint: "[issue-number] [--draft]"
---

# Opening a pull request

The body is defined in [`references/body-template.md`](references/body-template.md). Read it
first: it names what the body must not repeat.

## 1. Preconditions

- The branch is pushed and the repository's check command has passed on it. Find the command
  as [`setup`](../setup/references/discovery.md#check-command) describes.
- The working tree is clean. Never open a pull request over uncommitted work.
- Apply any rule the repository's CLAUDE.md or CONTRIBUTING.md states for pull requests, such as
  opening as a draft when certain paths change, or a required label.

## 2. Gather

```bash
n=$(git branch --show-current | sed -E 's#^[^/]+/([0-9]+)-.*#\1#')
gh issue view "$n" --json title,body
git log --format='%s%n%b' origin/HEAD..HEAD
```

A number passed as an argument wins over the branch name. If neither carries one, ask which
issue it closes, or write the body with no closing line.

## 3. Screenshots

If the diff changes anything a user sees, invoke [`screenshots`](../screenshots/SKILL.md)
and keep the subjects it returns.

## 4. Deviations

Compare what was built with the issue's design sections and acceptance criteria. Record each
difference with its kind, as the template defines. A **Narrowing** names the issue that takes
the rest; file it first if it does not exist.

## 5. Write and open

Write What and Why, take the draft through [`technical-writing`](../technical-writing/SKILL.md),
and write it to a file. The title is a short imperative sentence in the repository's commit
convention.

```bash
gh pr create --title "<title>" --body-file <body.md>   # add --draft when asked or not ready
```

Then move the issue's card to **In Review** with
[`../setup/references/board.md`](../setup/references/board.md), when a board is configured.

## Keeping it accurate

When later commits change what the pull request delivers, rewrite the affected sections with
`gh pr edit <n> --body-file`. A body describing code the review rejected misleads the next
reader.

## Options

Pass an issue number to name the issue it closes, which the branch name would otherwise supply,
and `--draft`.

Ask only when the answer is not already known: **draft or ready**, and **whether to attach
screenshots** when the diff is ambiguous about being visible.
