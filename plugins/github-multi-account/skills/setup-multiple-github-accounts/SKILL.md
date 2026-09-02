---
name: setup-multiple-github-accounts
description: Set up and troubleshoot multiple GitHub accounts on one machine — SSH key per account, git includeIf routing by repo path, and gh CLI config-directory switching. Use when the user wants to add another GitHub account, hits wrong-account git or gh behavior, or asks about SSH aliases, includeIf, or GH_CONFIG_DIR.
---

# GitHub Multi-Account Setup

## When to Use This Skill

Use when the user:

- wants to configure a new or additional GitHub account on this machine
- reports git or gh authenticating as the wrong account
- asks about SSH host aliases, `includeIf`, `GH_CONFIG_DIR`, or per-repo git identity

## How to Use

Read [`reference.md`](./reference.md) in this skill directory for the full setup: account tree layout, SSH keys, `~/.ssh/config` aliases, `~/.gitconfig` `includeIf` rules, `gh` config directories, the `_gh_ctx` shell hook, and troubleshooting tables. Follow it step by step. Before generating any config, ask the user for their account labels, repo root, usernames, and emails.
