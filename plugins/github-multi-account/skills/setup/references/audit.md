# Audit an existing machine

For a machine already set up (inherited, half-finished, or answering as the wrong account): these
checks show what it does. Work through them in order and stop at the first surprising answer; that
check names the fix.

For unfamiliar terms, see [`layout.md`](./layout.md). Every fix is in [`git.md`](./git.md) or
[`gh.md`](./gh.md).

## Git

### `includeIf` rules

```bash
git config --global --get-regexp 'includeif.*path'
```

Expect one rule per account tree, each `gitdir` path ending in a slash; without it the rule
matches the tree itself and nothing inside. On Windows, expect `gitdir/i:`: the case-sensitive
`gitdir:` misses a path whose case differs from the rule.

### Account tree layout

```bash
ls ~/Repos
```

Every entry should be an account tree. A repo directly in the root belongs to no account and
commits under your global identity.

### Identity inside a repo

Stand in a repo from each account tree and ask git who it is:

```bash
git config user.email            # -> that account's address
git ls-remote --get-url origin   # -> git@github-<account>:...
```

A raw `https://github.com/` URL means no rule matched this path, and so does a wrong address,
unless the repo overrides it locally (`git config --local user.email` shows it; a local value
beats the include).

### SSH key per alias

Greet GitHub through each alias:

```bash
ssh -T git@github-account1
```

The greeting names the account. A wrong name means the `Host` block lacks `IdentitiesOnly yes`,
names the wrong `IdentityFile`, or sits below an `Include` that offers another key first.

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

An unchanged value means the hook never ran. On macOS and Linux, confirm `_gh_ctx` is in
`~/.zshenv`, not `~/.zshrc`, and the `chpwd` hook is registered. On Windows, confirm the `prompt`
wrapper is in `$PROFILE` and that you are at a prompt, not running a script: PowerShell calls
`prompt` from the REPL alone.

### Effective account

```bash
gh auth status                   # -> the account gh believes it is
gh api user --jq .login          # -> the account GitHub answers as
```

Both should name the same account, and it should own the current account tree. Two different
names point at the credential store, not the config directory: see
[gh troubleshooting](./gh.md#troubleshooting).

## Commit signing

Skip this section if the machine does not sign commits. From inside each account tree:

```bash
git config user.signingkey       # -> that account's .pub
git config commit.gpgsign        # -> true
git log --show-signature -1      # -> Good "git" signature for that address
```

A signing key from another account means `user.signingkey` is in `~/.gitconfig`, not the account
file. `No principal matched` means the committer address is missing from `allowed_signers`.
Commits that verify here but read Unverified on GitHub were registered as an authentication key
alone: see [`signing.md`](./signing.md).
