# GitHub CLI

Config directories, `GH_CONFIG_DIR`, and the shell hook that picks one. Read
[`layout.md`](./layout.md) first: it defines the account trees these paths refer
to.

gh reaches the API over HTTPS with an OAuth token and reads one active account
from a single config file, so an account is identified here by a config directory
rather than a key — the keys in [`git.md`](./git.md) serve git alone. Give each
account its own config directory, then select the directory by path.

## Log in once per account

### macOS / Linux

```bash
GH_CONFIG_DIR=~/.config/gh-account1 gh auth login --git-protocol https
GH_CONFIG_DIR=~/.config/gh-account2 gh auth login --git-protocol https
```

### Windows

```powershell
$env:GH_CONFIG_DIR = "$env:AppData\gh-account1"
gh auth login --git-protocol https

$env:GH_CONFIG_DIR = "$env:AppData\gh-account2"
gh auth login --git-protocol https
```

Each token carries its own scopes, so they can differ by account: grant a scope
only to the accounts whose work needs it. `gh auth refresh -h github.com -s
<scope>` adds one to a token without disturbing the scopes already on it.

Each token goes to the system credential store, filed under its account username,
which keeps the config directories independent, and `gh auth status` names the
store holding each one. Run [Verification](#verification) before trusting the
result: an account with no entry of its own falls back to a shared one, and gh
then calls the API as whichever account logged in last.

PowerShell has no `VAR=value command` prefix, so the variable is set on its own
line and stays set for the rest of the session. Step 3 sets it per directory
once configured.

## Point the default at your fallback account

gh reads its default config directory whenever `GH_CONFIG_DIR` is unset:
`$XDG_CONFIG_HOME/gh` if that variable is set, and otherwise
`%AppData%\GitHub CLI` on Windows or `~/.config/gh` elsewhere. Linking it to one
account gives that account the fallback role and keeps a single token on disk
rather than a copy.

If you have used gh before, that directory already exists and the link command
refuses to overwrite it. Move it aside first — it also makes a ready-made config
directory for whichever account it currently holds:

### macOS / Linux

```bash
mv ~/.config/gh ~/.config/gh-account1      # keeps its existing login
ln -s ~/.config/gh-account2 ~/.config/gh
```

### Windows

```powershell
# keeps its existing login
Move-Item "$env:AppData\GitHub CLI" "$env:AppData\gh-account1"

New-Item -ItemType SymbolicLink -Path "$env:AppData\GitHub CLI" `
         -Target "$env:AppData\gh-account2"
```

Creating a symbolic link needs Developer Mode enabled or an elevated shell.

## Select the directory by path

### macOS / Linux

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

`.zshenv` loads for non-interactive shells, so scripts and coding agents get the
variable; `.zshrc` would reach interactive shells alone. The `chpwd` hook
re-evaluates on every directory change, so a shell that starts in one account
tree and moves to another follows along. The trailing slash in `"$PWD/"` matches
the account tree root itself, not just the paths beneath it.

Under bash, put the same function in `~/.bashrc` and set
`PROMPT_COMMAND=_gh_ctx` in place of the `chpwd` hook. bash has no `.zshenv`
equivalent, so that reaches interactive shells alone — the same limit the Windows
profile carries below.

### Windows

In `$PROFILE`:

```powershell
function Set-GhContext {
  $dir = if (($PWD.Path + '\') -like "$HOME\Repos\account1\*") {
    'gh-account1'
  } else {
    'gh-account2'
  }
  $env:GH_CONFIG_DIR = "$env:AppData\$dir"
}

if (-not $__basePrompt) { $__basePrompt = $function:prompt }
function prompt { Set-GhContext; & $__basePrompt }
Set-GhContext
```

PowerShell re-renders the prompt after every command, so wrapping `prompt` is the
closest analog to the `chpwd` hook: the variable follows every directory change.
The bare `Set-GhContext` on the last line mirrors the `_gh_ctx` call at the foot
of `.zshenv`, setting the variable once as the profile loads.

Appending `'\'` to `$PWD.Path` matches the account tree root itself, not just the
paths beneath it. The `$__basePrompt` guard keeps a re-sourced profile from
wrapping the wrapper.

**The `prompt` hook is interactive-only.** A script launched with `pwsh -File`
does load `$PROFILE`, so it starts in the right account. But PowerShell calls
`prompt` from the REPL alone, so a script that changes directory mid-run keeps
the value it started with; call `Set-GhContext` after any such `cd`.

A profile skipped altogether — `pwsh -NoProfile`, a remote session, or a
`Restricted` execution policy — leaves `GH_CONFIG_DIR` unset and falls through to
the default directory, so make that default the account whose work is
most often automated.

> Export a path, never a token. `GH_TOKEN=$(gh auth token -u <user>)` fails twice
> over: gh hands back the active account's token whatever `-u` says, and an
> exported token then outranks every config directory, pinning one account across
> all of them. A plaintext `oauth_token` in a `hosts.yml` wins the same way — gh
> reads the environment first, the config file second, and the credential store
> last.

## Verification

### macOS / Linux

```bash
exec zsh                                          # load the new ~/.zshenv
cd ~/Repos/account1 && gh api user --jq .login    # -> <username1>
cd ~/Repos/account2 && gh api user --jq .login    # -> <username2>
```

### Windows

Open a new PowerShell session first, so `$PROFILE` loads.

```powershell
cd "$HOME\Repos\account1"
gh api user --jq .login          # -> <username1>

cd "$HOME\Repos\account2"
gh api user --jq .login          # -> <username2>
```

Then confirm isolation with a private repo each account owns. The other account's
`gh repo view` must fail — shared access proves nothing.

## Troubleshooting

| Symptom                                                           | Cause                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `gh auth status` names one account, `gh api user` returns another | That account has no credential store entry of its own, so gh reads the shared slot; log in again for that account |
| Identity stops following directories                              | `_gh_ctx` sits in `.zshrc` rather than `.zshenv`, or the `chpwd` hook went unregistered; on Windows, the `prompt` hook is interactive-only, so a script that changes directory mid-run keeps the value it started with |
| Every account tree answers as the same account                    | `GH_TOKEN` or `GITHUB_TOKEN` is set in the environment, or a plaintext `oauth_token` sits in that directory's `hosts.yml`; both outrank the config directory |
| `Could not resolve to a Repository`                               | Right repo, wrong account for the current path                                                    |
| A scope disappears after `gh auth refresh`                        | `--reset-scopes` returns the token to the default minimum and `--remove-scopes` drops the ones you name; plain `-s` only adds. `repo`, `read:org` and `gist` cannot be removed |
| `gh auth refresh` prints nothing and changes nothing               | It waits on a one-time code prompt, so it needs a terminal; run it in a real shell, not through an editor or agent |
