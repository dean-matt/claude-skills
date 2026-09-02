# Multiple GitHub Accounts on One Machine

Work any number of GitHub accounts at once. Both git and gh read the account from
the repo's path, so no command ever switches identities.

Each account needs six things:

- an account tree holding its repos
- an SSH key
- a `Host` alias in `~/.ssh/config`
- a git config file
- an `includeIf` rule pointing at its account tree
- a gh config directory

The examples use two accounts, `account1` and `account2`; a third repeats the same
pattern once more. Rename the labels to suit, adjust `~/Repos` to your repo root,
and replace `<username1>` and `<email1>` with real values.

## Contents

- [Multiple GitHub Accounts on One Machine](#multiple-github-accounts-on-one-machine)
	- [Contents](#contents)
	- [Layout](#layout)
	- [How it resolves](#how-it-resolves)
	- [Git setup](#git-setup)
		- [1. Generate one key per account](#1-generate-one-key-per-account)
		- [2. Add one SSH host alias per account](#2-add-one-ssh-host-alias-per-account)
		- [3. Map each account tree to its account](#3-map-each-account-tree-to-its-account)
		- [4. Upload each public key](#4-upload-each-public-key)
		- [5. Authorize SSO where an org enforces it](#5-authorize-sso-where-an-org-enforces-it)
		- [Verify git](#verify-git)
		- [Cloning](#cloning)
		- [Git troubleshooting](#git-troubleshooting)
	- [GitHub CLI](#github-cli)
		- [1. Log in once per account](#1-log-in-once-per-account)
		- [2. Point the default at your fallback account](#2-point-the-default-at-your-fallback-account)
		- [3. Select the directory by path](#3-select-the-directory-by-path)
		- [Verify gh](#verify-gh)
		- [gh troubleshooting](#gh-troubleshooting)
	- [Audit an existing machine](#audit-an-existing-machine)
		- [Audit git](#audit-git)
		- [Audit gh](#audit-gh)

## Layout

Give every account an account tree: one folder under your repo root holding every
repo for that account. Group repos by account, not by client, and nest client
folders inside the account tree.

```
~/Repos/
├── account1/                     -> GitHub account <username1>
│   ├── example1-api/             repo
│   ├── example1-web/             repo
│   └── wt/                       worktrees of the repos above, covered automatically
│       └── example1-web-1042/
└── account2/                     -> GitHub account <username2>
    └── example2/                 grouping folder, not a repo
        ├── example2-storefront/  repo
        └── example2-admin/       repo
```

## How it resolves

The path is the only input. Git and gh read it separately, because they
authenticate differently: git over SSH with a key, gh over HTTPS with a token.

```
                    ┌─ git: includeIf in ~/.gitconfig -> ~/.gitconfig-account1
                    │                                        |
                    │                                        +- user.email
repo path ──────────┤                                        +- url insteadOf
                    │                                              |
                    │                                        SSH alias -> that account's key
                    │
                    └─ gh:  _gh_ctx in ~/.zshenv -> GH_CONFIG_DIR -> ~/.config/gh-account1
                                                                          |
                                                                     that account's token
```

Every SSH alias points at `github.com` but presents a different key, and a URL
rewrite sends each account tree to its own alias. Each gh config directory holds one
account, and a shell function exports the matching one.

Configure the halves separately. Either works without the other.

## Git setup

### 1. Generate one key per account

```bash
ssh-keygen -t ed25519 -C "<email1> (mac)" -f ~/.ssh/id_ed25519_account1 -N ""
ssh-keygen -t ed25519 -C "<email2> (mac)" -f ~/.ssh/id_ed25519_account2 -N ""
```

`-f` names the file; the default name would collide across accounts. `-N ""`
skips the passphrase. Add one later with
`ssh-keygen -p -f ~/.ssh/id_ed25519_account1`.

### 2. Add one SSH host alias per account

Append to `~/.ssh/config`, below any `Include` line:

```
Host github-account1
	HostName github.com
	User git
	IdentityFile ~/.ssh/id_ed25519_account1
	IdentitiesOnly yes

Host github-account2
	HostName github.com
	User git
	IdentityFile ~/.ssh/id_ed25519_account2
	IdentitiesOnly yes
```

`Host` is an invented alias; `HostName` is the real destination. GitHub always
authenticates as `git`, so identity comes from the key.

**`IdentitiesOnly yes` carries the whole design.** Omit it and SSH offers every
key the agent holds, GitHub accepts the first valid one, and you authenticate
silently as the wrong account. The more accounts on the machine, the likelier
that misfire.

### 3. Map each account tree to its account

`~/.gitconfig`:

```ini
[includeIf "gitdir:~/Repos/account1/"]
	path = ~/.gitconfig-account1
[includeIf "gitdir:~/Repos/account2/"]
	path = ~/.gitconfig-account2
```

The trailing slash matches the directory and everything beneath it, which covers
worktrees.

`~/.gitconfig-account1`:

```ini
[user]
	email = <email1>
[url "git@github-account1:"]
	insteadOf = https://github.com/
	insteadOf = git@github.com:
```

`~/.gitconfig-account2`:

```ini
[user]
	email = <email2>
[url "git@github-account2:"]
	insteadOf = https://github.com/
	insteadOf = git@github.com:
```

Each account gets its own file. `insteadOf` rewrites the URL prefix at connect
time, so stored remotes stay untouched: `git remote -v` still shows the original
URL, and cloning with a plain `https://github.com/...` URL inside any account
tree works. List both prefixes because remotes may use either.

### 4. Upload each public key

The `.pub` half goes to GitHub; the private half stays on the machine.

```bash
cat ~/.ssh/id_ed25519_account1.pub   # upload to <username1>
cat ~/.ssh/id_ed25519_account2.pub   # upload to <username2>
```

For each key: sign in as that account, open `github.com/settings/keys`, choose
**New SSH key**, set the type to **Authentication key**, and paste the line.

### 5. Authorize SSO where an org enforces it

On `github.com/settings/keys`, click **Configure SSO**, then **Authorize** beside
the key. Org repos reject an unauthorized key.

### Verify git

Test every alias:

```bash
ssh -T git@github-account1    # -> Hi <username1>! You've successfully authenticated...
ssh -T git@github-account2    # -> Hi <username2>!
```

The greeting names the account, proving the right key mapped to the right
identity. Then confirm the rewrite and fetch for real:

```bash
cd ~/Repos/account1/example1-api
git ls-remote --get-url origin   # -> git@github-account1:...
git config user.email            # -> <email1>
git fetch origin
```

### Cloning

Clone with the ordinary HTTPS URL from GitHub, inside the right account tree:

```bash
cd ~/Repos/account1
git clone https://github.com/<org>/<repo>.git
```

`insteadOf` rewrites the URL, so the clone uses that account tree's key and the
new repo inherits that account's email. The account tree you stand in decides the
account, which is the only rule to remember day to day.

### Git troubleshooting

| Symptom                                                            | Cause                                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `ssh -T` greets the wrong account                                  | `IdentitiesOnly yes` missing, or wrong `IdentityFile`                               |
| `ERROR: The '<org>' organization has enabled or enforced SAML SSO` | Key needs SSO authorization — step 5                                                |
| `git ls-remote --get-url` returns the raw HTTPS URL                | Repo sits outside every account tree; check the path and the trailing slash         |
| `Permission denied (publickey)` in one account tree only                   | That account lacks that key                                                         |
| Commits land under the wrong email                                 | Repo sits outside every account tree, or a local `user.email` overrides the include |

## GitHub CLI

The SSH split covers git alone. `gh` never uses SSH: it calls the API over HTTPS
with an OAuth token, and reads one active account from a single config file. Give
each account its own config directory, then select the directory by path.

### 1. Log in once per account

```bash
GH_CONFIG_DIR=~/.config/gh-account1 gh auth login
GH_CONFIG_DIR=~/.config/gh-account2 gh auth login
```

Each token goes to the system credential store, filed under its account username,
which keeps the config directories independent. `gh auth status` names the store
holding each one. Check the accounts with [Verify gh](#verify-gh) before trusting
them: an account with no entry of its own falls back to a shared one, and gh then
calls the API as whichever account logged in last.

### 2. Point the default at your fallback account

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

### 3. Select the directory by path

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

### Verify gh

Open a new shell first: the current one has not sourced `~/.zshenv`, so it still
holds the old environment.

```bash
cd ~/Repos/account1 && gh api user --jq .login    # -> <username1>
cd ~/Repos/account2 && gh api user --jq .login    # -> <username2>
```

Then confirm isolation with a private repo each account owns. The other account's
`gh repo view` must fail — shared access proves nothing.

### gh troubleshooting

| Symptom                                                           | Cause                                                                                             |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `gh auth status` names one account, `gh api user` returns another | That account has no credential store entry of its own, so gh read the shared slot; log in again for that account |
| Identity stops following directories                              | `_gh_ctx` sits in `.zshrc` rather than `.zshenv`, or the `chpwd` hook went unregistered           |
| Every account tree answers as the same account                    | `GH_TOKEN` or `GITHUB_TOKEN` is set in the environment, or a plaintext `oauth_token` sits in that directory's `hosts.yml`; both outrank the config directory |
| `Could not resolve to a Repository`                               | Right repo, wrong account for the current path                                                    |
| A scope disappears after `gh auth refresh`                        | Refresh replaces the token; pass `-s <scope>` for every scope you need |

## Audit an existing machine

On a machine already set up — inherited, half-finished, or newly answering as the
wrong account — these checks show what it actually does. Run them in order and
stop at the first answer that surprises you: that check names what to fix.

### Audit git

#### 1. The rules

```bash
git config --global --get-regexp 'includeif.*path'
```

Expect one rule per account tree, each `gitdir` path ending in a slash. Drop the
slash and the rule matches the account tree itself, but nothing inside it.

#### 2. The account trees

```bash
ls ~/Repos
```

Every entry should be an account tree. A repo sitting directly in the root belongs
to no account and commits under your global identity.

#### 3. A repo from each tree

Stand in one and ask git who it is:

```bash
git config user.email            # -> that account's address
git ls-remote --get-url origin   # -> git@github-<account>:...
```

A raw `https://github.com/` URL means no rule matched this path. The wrong address
means the same, unless the repo overrides it locally. `git config --local
user.email` answers that, and an answer there beats the include.

#### 4. The keys

Greet GitHub through each alias:

```bash
ssh -T git@github-account1
```

The greeting names the account. A wrong name means the `Host` block lacks
`IdentitiesOnly yes`, or points at the wrong `IdentityFile`.

### Audit gh

#### 5. The account per tree

From inside each account tree:

```bash
echo $GH_CONFIG_DIR              # -> that account's config directory
gh auth status                   # -> the account gh believes it is
gh api user --jq .login          # -> the account GitHub answers as
```

An unchanged `GH_CONFIG_DIR` means `_gh_ctx` never ran: confirm it sits in
`~/.zshenv` and that the `chpwd` hook is registered. Two different account names
point at the credential store instead — see
[gh troubleshooting](#gh-troubleshooting).
