---
name: open-pr
description: Open a pull request for the current branch with a structured body — summary, changes, screenshots, verification, reviewer notes — and keep that body accurate as the branch changes. Use when a branch is pushed and ready for review, or when a pull request body needs rewriting.
---

# Opening a pull request

## 1. Preconditions

- The branch is pushed and the repository's check command has passed on it. Find the
  command as [`setup`](../setup/references/discovery.md#check-command) describes.
- The working tree is clean. Never open a pull request over uncommitted work.

## 2. Gather

```bash
git log --format='%s%n%b' origin/HEAD..HEAD
git diff --stat origin/HEAD...HEAD
gh issue view <issue> --json title,body   # when the branch names one
```

## 3. Screenshots

If the diff changes anything a user sees, invoke [`screenshots`](../screenshots/SKILL.md) and
keep the markdown it returns.

## 4. Write the body

Follow [`references/body-template.md`](references/body-template.md), then run the draft
through [`technical-writing`](../technical-writing/SKILL.md). If the repository has
`.github/pull_request_template.md`, use its headings.

The title is a short imperative sentence in the repository's commit convention.

## 5. Open it

```bash
gh pr create --title "<title>" --body-file <body.md>   # add --draft when asked or not ready
```

Write the body to a file in the scratchpad; never inline a long body through the shell. When
`setup` recorded a version-bump or draft rule for certain paths, apply it here.

## Keeping it accurate

When later commits change what the pull request does, rewrite the affected sections with
`gh pr edit <n> --body-file`. A body describing code the review rejected misleads the next
reader.

## Options

Ask only when the answer is not already known: **draft or ready**, **which reviewers**, and
**whether to attach screenshots** when the diff is ambiguous about being visible.
