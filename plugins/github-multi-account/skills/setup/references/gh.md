# GitHub CLI

Config directories, `GH_CONFIG_DIR`, and the shell hook that picks one. Read
[`layout.md`](./layout.md) first: it defines the account trees these paths refer
to.

`gh` reaches the API over HTTPS with an OAuth token and reads one active account
from a single config file, so an account needs a config directory here rather
than a key — the keys in [`git.md`](./git.md) serve git alone. Give each account
its own config directory, then select the directory by path.

## 1. Log in once per account

```bash
GH_CONFIG_DIR=~/.config/gh-account1 gh auth login
GH_CONFIG_DIR=~/.config/gh-account2 gh auth login
```

Answer `HTTPS` at the git protocol prompt. Either answer works, because the
`insteadOf` rules in [`git.md`](./git.md) rewrite both prefixes, but choosing
`SSH` makes gh offer to generate and upload a key, which this setup already
handles per account.

Each token goes to the system credential store, filed under its account username,
which keeps the config directories independent. `gh auth status` names the store
holding each one. Check the accounts with [Verification](#verification) before trusting
them: an account with no entry of its own falls back to a shared one, and gh then
calls the API as whichever account logged in last.

## 2. Point the default at your fallback account

gh reads `~/.config/gh` whenever `GH_CONFIG_DIR` is unset. Symlinking it to one
account gives that account the fallback role and keeps a single token on disk
rather than a copy.

If you have used gh before, that directory already exists and `ln -s` refuses to
overwrite it. Move it aside first — it also makes a ready-made config directory
for whichever account it currently holds:

```bash
mv ~/.config/gh ~/.config/gh-account1      # keeps its existing login
ln -s ~/.config/gh-account2 ~/.config/gh
```

## 3. Select the directory by path

In `~/.zshenv`:

```zsh
_gh_ctx() {
  case "$PWD/" in
    "$HOME/Repos/account1/"*) export GH_CONFIG_DIR="$HOME/.config/gh-account1" ;;
    *) export GH_CONFIG_DIR="$HOME/.config/gh-account2" ;;
  esac
}
autoload -U add-zsh-hook 2>/dev/null && add-zsh-hook chpwd _gh_ctx
_gh_ctx
```

Three details carry this. `.zshenv` loads for non-interactive shells, so scripts
and coding agents get the variable; `.zshrc` would reach interactive shells alone.
The `chpwd` hook re-evaluates on every directory change, so a shell that starts in
one account tree and moves to another follows along. The trailing slash in
`"$PWD/"` matches the account tree root itself, not just the paths beneath it.

> Export a path, never a token. `GH_TOKEN=$(gh auth token -u <user>)` fails twice
> over: gh hands back the active account's token whatever `-u` says, and an
> exported token then outranks every config directory, pinning one account across
> all of them. A plaintext `oauth_token` in a `hosts.yml` wins the same way — gh
> reads the environment first, the config file second, and the credential store
> last.

## Verification

Open a new shell first: the current one has not sourced `~/.zshenv`, so it still
holds the old environment.

```bash
cd ~/Repos/account1 && gh api user --jq .login    # -> <username1>
cd ~/Repos/account2 && gh api user --jq .login    # -> <username2>
```

Then confirm isolation with a private repo each account owns. The other account's
`gh repo view` must fail — shared access proves nothing.

## Troubleshooting

| Symptom                                                           | Cause                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `gh auth status` names one account, `gh api user` returns another | That account has no credential store entry of its own, so gh read the shared slot; log in again for that account |
| Identity stops following directories                              | `_gh_ctx` sits in `.zshrc` rather than `.zshenv`, or the `chpwd` hook went unregistered           |
| Every account tree answers as the same account                    | `GH_TOKEN` or `GITHUB_TOKEN` is set in the environment, or a plaintext `oauth_token` sits in that directory's `hosts.yml`; both outrank the config directory |
| `Could not resolve to a Repository`                               | Right repo, wrong account for the current path                                                    |
| A scope disappears after `gh auth refresh`                        | Refresh replaces the token; pass `-s <scope>` for every scope you need |
