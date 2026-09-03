---
name: setup
description: Set up and troubleshoot multiple GitHub accounts on one machine — SSH key per account, git includeIf routing by repo path, and gh CLI config-directory switching. Use when the user wants to add another GitHub account, hits wrong-account git or gh behavior, or asks about SSH aliases, includeIf, or GH_CONFIG_DIR.
---

# GitHub Multi-Account Setup

## When to Use This Skill

Use when the user:

- wants to configure a new or additional GitHub account on this machine
- reports git or gh authenticating as the wrong account
- asks about SSH host aliases, `includeIf`, `GH_CONFIG_DIR`, or per-repo git identity

## What Each Account Needs

- an account tree holding its repos
- an SSH key
- a `Host` alias in `~/.ssh/config`
- a git config file
- an `includeIf` rule pointing at its account tree
- a gh config directory

The account tree is the shared input both tools read a path against; the next four
belong to git and the last to gh.

## Gather Inputs First

Before generating any config, ask the user for their account labels, repo root,
usernames, and emails. The references use two accounts named `account1` and
`account2`, a repo root of `~/Repos`, and `<username1>` / `<email1>` placeholders.
Substitute real values throughout.

## Then Read What the Task Needs

| Task | Read |
| --- | --- |
| Understand the design before changing anything | [`references/layout.md`](./references/layout.md) |
| Set up or fix git — SSH keys, host aliases, `includeIf` rules | [`references/git.md`](./references/git.md) |
| Set up or fix gh — config directories, `GH_CONFIG_DIR`, the `_gh_ctx` hook | [`references/gh.md`](./references/gh.md) |
| Diagnose a machine already set up, or answering as the wrong account | [`references/audit.md`](./references/audit.md) |

git and gh authenticate differently and are configured independently; either works
without the other. A full setup reads `layout.md`, then `git.md`, then `gh.md`,
following the numbered steps in order.
