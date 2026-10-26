---
name: setup
description: Prepare a GitHub repository for the github-sdlc workflow — detect its check command, branch, board and conventions, create the ai-review labels, and optionally write .claude/github-sdlc.json and a pull request template. Use when starting to use the sdlc plugin in a repository, or when another sdlc skill reports a missing setting.
---

# Setting up a repository

The other `github-sdlc` skills work without this one; it saves them from asking. Run it once per
repository, and again when a setting changes.

## Steps

1. **Detect**, using [`references/discovery.md`](references/discovery.md). Print a table of
   each fact, its value and where it came from.
2. **Ask about what is missing or uncertain**, with AskUserQuestion, one batch:
   - the check command, if none was found
   - whether `versionBump` is on, and the rule: off by default
   - `protectedPaths` that always need a person's sign-off
   - the project board, if several match; offer to add any missing status from
     [`references/board.md`](references/board.md)
   - what counts as a `severity:critical` bug here, in one sentence
3. **Create the labels** with the commands in
   [`references/labels.md`](references/labels.md), and offer the renames and removals it lists.
   Say which labels the plugin will own before creating any.
4. **Offer** (do not assume) to write:
   - `.claude/github-sdlc.json` with the answers, only keys that differ from discovery
   - `.github/pull_request_template.md` from
     [`../open-pr/references/body-template.md`](../open-pr/references/body-template.md)
   - issue forms under `.github/ISSUE_TEMPLATE/` for the issue types, following
     [`../issue/references/shape.md`](../issue/references/shape.md)
   - a short section in the repository's CLAUDE.md naming the workflow, the severity rule, and
     any protected paths or version rule
5. **Show the diff** of every file written and leave committing to the user.

## Boundaries

Setup changes labels on GitHub and writes files; it does not change branch protection, board
settings or repository permissions. Report what needs an admin instead.
