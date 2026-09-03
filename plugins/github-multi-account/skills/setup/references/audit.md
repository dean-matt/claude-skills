# Audit an existing machine

On a machine already set up — inherited, half-finished, or newly answering as the
wrong account — these checks show what it actually does. Run them in order and
stop at the first answer that surprises you: that check names what to fix.

## Audit git

### 1. The rules

```bash
git config --global --get-regexp 'includeif.*path'
```

Expect one rule per account tree, each `gitdir` path ending in a slash. Drop the
slash and the rule matches the account tree itself, but nothing inside it.

### 2. The account trees

```bash
ls ~/Repos
```

Every entry should be an account tree. A repo sitting directly in the root belongs
to no account and commits under your global identity.

### 3. A repo from each tree

Stand in one and ask git who it is:

```bash
git config user.email            # -> that account's address
git ls-remote --get-url origin   # -> git@github-<account>:...
```

A raw `https://github.com/` URL means no rule matched this path. The wrong address
means the same, unless the repo overrides it locally. `git config --local
user.email` answers that, and an answer there beats the include.

### 4. The keys

Greet GitHub through each alias:

```bash
ssh -T git@github-account1
```

The greeting names the account. A wrong name means the `Host` block lacks
`IdentitiesOnly yes`, or points at the wrong `IdentityFile`.

## Audit gh

### 5. The account per tree

From inside each account tree:

```bash
echo $GH_CONFIG_DIR              # -> that account's config directory
gh auth status                   # -> the account gh believes it is
gh api user --jq .login          # -> the account GitHub answers as
```

An unchanged `GH_CONFIG_DIR` means `_gh_ctx` never ran: confirm it sits in
`~/.zshenv` and that the `chpwd` hook is registered. Two different account names
point at the credential store instead — see
[gh troubleshooting](./gh.md#gh-troubleshooting).
