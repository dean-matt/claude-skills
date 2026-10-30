---
name: open-pr
description: Open a pull request for the current branch with a short structured body — closing link, what, why, screenshots, deviations — and keep that body accurate as the branch changes. Use when a branch is pushed and ready for review, or when a pull request body needs rewriting.
argument-hint: "[issue-number] [--draft]"
---

# Opening a pull request

The body follows [`references/body-template.md`](references/body-template.md), which also lists
what it must not repeat.

## 1. Preconditions

- The branch is pushed and the check command has passed on it
  ([`setup`](../setup/references/discovery.md#check-command) finds it).
- The working tree is clean.
- Apply the repository's pull request rules from CLAUDE.md or CONTRIBUTING.md, such as a draft
  for certain paths or a required label.

## 2. Gather

```bash
n=$(git branch --show-current | sed -E 's#^[^/]+/([0-9]+)-.*#\1#')
gh issue view "$n" --json title,body
git log --format='%s%n%b' origin/HEAD..HEAD
```

An issue number passed as an argument wins over the branch name. With neither, ask which issue it
closes, or write the body with no closing line.

## 3. Screenshots

If the caller passed screenshots markdown, use it as the section and capture nothing. Otherwise,
if the diff changes anything a user sees, invoke [`screenshots`](../screenshots/SKILL.md) and
keep the subjects it returns. Never open the pull request on a visible change without them.

## 4. Deviations

Compare the build with the issue's acceptance criteria and Out of scope. Record each
difference with its kind (see the template). A **Narrowing** names the issue that takes the rest;
file it first if missing.

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
`gh pr edit <n> --body-file`.

## Options

Pass an issue number to name the issue it closes, and `--draft`.

Ask only what is not already known: **draft or ready**, and **screenshots** when it is unclear
whether the diff is visible.
