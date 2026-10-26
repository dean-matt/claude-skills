---
name: setup
description: Prepare a GitHub repository for the github-sdlc workflow — detect its check command, branch, board and conventions, create the plugin's labels, and optionally write a protected-paths list, a pull request template, issue forms and a short CLAUDE.md section. Use when starting to use the github-sdlc plugin in a repository, or when another sdlc skill reports a missing setting.
---

# Setting up a repository

The other `github-sdlc` skills work without this one; it saves them from asking. Run it once per
repository, and again when a setting changes.

## Steps

1. **Detect**, using [`references/discovery.md`](references/discovery.md). Print a table of
   each fact, its value and where it came from.
2. **Ask about what is missing or uncertain**, with AskUserQuestion, one batch:
   - the check command, if none was found
   - whether the merge should raise the version, and in which file: off by default
   - paths that always need the owner's sign-off before a merge, if any
   - the project board, if several match; offer to add any missing status from
     [`references/board.md`](references/board.md)
   - what counts as a `severity:critical` bug here, in one sentence
3. **Create the labels** with the commands in
   [`references/labels.md`](references/labels.md), and offer the renames and removals it lists.
   Say which labels the plugin will own before creating any.
4. **Offer** (do not assume) to write:
   - `.github/protected-paths.txt`, a plain list of globs with `#` comments, only if the user named
     paths. The gate reads it from the default branch and it protects itself.
   - `.github/pull_request_template.md` from
     [`../open-pr/references/body-template.md`](../open-pr/references/body-template.md)
   - issue forms under `.github/ISSUE_TEMPLATE/` for the issue types, following
     [`../issue/references/shape.md`](../issue/references/shape.md)
   - a short section in the repository's CLAUDE.md. It states each rule once, in prose, and no
     rule appears in a plugin file:
     - the workflow, in a sentence
     - the severity rule: what counts as a `severity:critical` bug here
     - a pointer to `.github/protected-paths.txt`, never a copy of its list
     - the version rule, if the user wants one: "the merge raises the version in `<file>`:
       `feat` raises the minor and anything else the patch; docs-only changes skip it" 
5. **Show the diff** of every file written and leave committing to the user.

## Boundaries

Setup changes labels on GitHub and writes files; it does not change branch protection, board
settings or repository permissions. Report what needs an admin instead. It writes no file the
plugin alone would read: everything it records is plain prose or a plain list a person can use
without the plugin.
