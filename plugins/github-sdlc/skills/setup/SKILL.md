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
   - the project board, if several match
3. **Create the labels** `ai-review:completed` and `ai-review:changes-requested` with the
   commands in the reference. `--force` makes this safe to rerun. If a repository already has
   `review:approved` or `review:changes-requested`, offer to rename them with
   `gh label edit <old> --name <new>` so open pull requests follow; do not delete them.
4. **Offer** (do not assume) to write:
   - `.claude/github-sdlc.json` with the answers, only keys that differ from discovery
   - `.github/pull_request_template.md` from
     [`../open-pr/references/body-template.md`](../open-pr/references/body-template.md)
   - a short section in the repository's CLAUDE.md naming the workflow and any protected
     paths or version rule
5. **Show the diff** of every file written and leave committing to the user.

## Boundaries

Setup changes labels on GitHub and writes files; it does not change branch protection, board
settings or repository permissions. Report what needs an admin instead.
