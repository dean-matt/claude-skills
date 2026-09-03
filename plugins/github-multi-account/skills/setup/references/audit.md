# Audit an existing machine

On a machine already set up — inherited, half-finished, or newly answering as the
wrong account — these checks show what it actually does. Work through them in
order and stop at the first answer that surprises you: that check names what to
fix.

If the terms below are unfamiliar, start with [`layout.md`](./layout.md). Every
fix a failing check points to is in [`git.md`](./git.md) or [`gh.md`](./gh.md).

## Git

### `includeIf` rules

```bash
git config --global --get-regexp 'includeif.*path'
```

Expect one rule per account tree, each `gitdir` path ending in a slash. Drop the
slash and the rule matches the account tree itself, but nothing inside it. On
Windows, expect `gitdir/i:` — the case-sensitive `gitdir:` misses a path whose
case differs from the rule.

### Account tree layout

```bash
ls ~/Repos
```

Every entry should be an account tree. A repo sitting directly in the root belongs
to no account and commits under your global identity.

### Identity inside a repo

Stand in a repo from each account tree and ask git who it is:

```bash
git config user.email            # -> that account's address
git ls-remote --get-url origin   # -> git@github-<account>:...
```

A raw `https://github.com/` URL means no rule matched this path, and so does the
wrong address — unless the repo overrides it locally, which `git config --local
user.email` reveals. A value there beats the include.

### SSH key per alias

Greet GitHub through each alias:

```bash
ssh -T git@github-account1
```

The greeting names the account. A wrong name means the `Host` block lacks
`IdentitiesOnly yes`, points at the wrong `IdentityFile`, or sits below an
`Include` that offers another key first.

## GitHub CLI

### Config directory selection

From inside each account tree:

#### macOS / Linux

```bash
echo $GH_CONFIG_DIR              # -> that account's config directory
```

#### Windows

```powershell
$env:GH_CONFIG_DIR               # -> that account's config directory
```

An unchanged value means the hook never ran. On macOS and Linux, confirm `_gh_ctx`
sits in `~/.zshenv` rather than `~/.zshrc` and that the `chpwd` hook is
registered. On Windows, confirm the `prompt` wrapper is in `$PROFILE` and that
this is an interactive session — `$PROFILE` is skipped for scripts.

### Effective account

```bash
gh auth status                   # -> the account gh believes it is
gh api user --jq .login          # -> the account GitHub answers as
```

Both should name the same account, and it should own the current account tree.
Two different names point at the credential store rather than the config
directory — see [gh troubleshooting](./gh.md#troubleshooting).
