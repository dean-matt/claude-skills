# Git setup

SSH keys, host aliases and `includeIf` rules. Read [`layout.md`](./layout.md) first: it defines
the account trees every step refers to. gh is configured separately ([`gh.md`](./gh.md)).

## Generate one key per account

### macOS / Linux

```bash
ssh-keygen -t ed25519 -C "<email1> $(hostname -s)" -f ~/.ssh/id_ed25519_account1 -N ""
ssh-keygen -t ed25519 -C "<email2> $(hostname -s)" -f ~/.ssh/id_ed25519_account2 -N ""
```

### Windows

```powershell
ssh-keygen -t ed25519 -C "<email1> $env:COMPUTERNAME" -f "$HOME\.ssh\id_ed25519_account1"
ssh-keygen -t ed25519 -C "<email2> $env:COMPUTERNAME" -f "$HOME\.ssh\id_ed25519_account2"
```

`-f` names the file; the default `id_ed25519` would collide across accounts. `-C` sets the comment
GitHub shows beside the key; it names the machine, which is what you revoke when one is lost, and
the upload below uses it as the key's title. A key without a passphrase lets scripts and coding
agents use it without prompting.

**On Windows**, press Enter twice at each passphrase prompt. The block omits `-N ""` because
Windows PowerShell 5.1 drops an empty-string argument, while PowerShell 7.3+ keeps it; the prompt
works on both.

The Windows paths use `$HOME\.ssh\...` because neither PowerShell nor ssh-keygen expands `~` for a
native command.

Confirm with `ssh-keygen -y -f "$HOME\.ssh\id_ed25519_account1"`: it prints the public key, or
prompts if there is a passphrase.

## Add one SSH host alias per account

Put these near the top of `~/.ssh/config`, above any `Include` line and above any
`Host *` block:

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

`Host` is an invented alias; `HostName` is the real destination. The SSH user is always `git`, so
the key alone decides the account.

**`IdentitiesOnly yes` carries the design.** Without it SSH offers every key the agent holds,
GitHub accepts the first valid one, and you authenticate silently as the wrong account.

Placement matters for the same reason. ssh accumulates every matching `IdentityFile` in the order
it reads them, so a `Host *` default from an earlier `Include` is offered ahead of the account
key, and GitHub accepts the first valid key. `ssh -G github-account1` lists the identities in the
order they are tried.

## Map each account tree to its account

`~/.gitconfig`:

```ini
[includeIf "gitdir:~/Repos/account1/"]
	path = ~/.gitconfig-account1
[includeIf "gitdir:~/Repos/account2/"]
	path = ~/.gitconfig-account2
```

The trailing slash matches the directory and everything beneath it, worktrees included.

On Windows, write `gitdir/i:` in place of `gitdir:`: the filesystem is case-insensitive but the
match is not, so `c:/repos/account1/` never matches `C:/Repos/account1/`.

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

Each account gets its own file. `insteadOf` rewrites the URL prefix at connect time and leaves the
stored remote untouched: `git config --get remote.origin.url` returns the original URL, while
`git remote -v` and `git ls-remote --get-url` show the alias. List both prefixes, since remotes
may use either.

## Upload each public key

The `.pub` half goes to GitHub; the private half stays on the machine. Sign in as that account,
open [`github.com/settings/keys`](https://github.com/settings/keys), choose **New SSH key**, keep
the type **Authentication key**, and paste:

```bash
cat ~/.ssh/id_ed25519_account1.pub
```

If that account's gh is already set up per [`gh.md`](./gh.md), skip the web UI:

### macOS / Linux

```bash
GH_CONFIG_DIR=~/.config/gh-account1 \
  gh ssh-key add ~/.ssh/id_ed25519_account1.pub --title "$(hostname -s)"
```

### Windows

```powershell
$env:GH_CONFIG_DIR = "$env:AppData\gh-account1"
gh ssh-key add "$HOME\.ssh\id_ed25519_account1.pub" --title "$env:COMPUTERNAME"
```

## Authorize SSO where an org enforces it

On [`github.com/settings/keys`](https://github.com/settings/keys), click **Configure SSO**, then
**Authorize** beside the key. Org repos reject an unauthorized key.

## Verification

Test every alias:

```bash
ssh -T git@github-account1    # -> Hi <username1>! You've successfully authenticated...
ssh -T git@github-account2    # -> Hi <username2>!
```

The greeting names the account. Then confirm the rewrite and fetch for real:

```bash
cd ~/Repos/account1/example1-api
git ls-remote --get-url origin   # -> git@github-account1:...
git config user.email            # -> <email1>
git fetch origin
```

## Cloning

Clone with the ordinary HTTPS URL from GitHub, inside the right account tree:

```bash
cd ~/Repos/account1
git clone https://github.com/<org>/<repo>.git
```

`insteadOf` rewrites the URL, so the clone uses that tree's key and the new repo inherits that
account's email. The account tree you stand in decides the account.

## Troubleshooting

| Symptom                                                            | Cause                                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `ssh -T` greets the wrong account                                  | `IdentitiesOnly yes` missing, wrong `IdentityFile`, or another key offered first — check `ssh -G github-account1` |
| `ERROR: The '<org>' organization has enabled or enforced SAML SSO` | Key needs SSO authorization — see Authorize SSO where an org enforces it            |
| `git ls-remote --get-url` returns the raw HTTPS URL                | Repo sits outside every account tree; check the path and the trailing slash. On Windows, check that the rule uses `gitdir/i:` |
| `Permission denied (publickey)` in one account tree only            | That account lacks that key                                                         |
| Commits land under the wrong email                                 | Repo sits outside every account tree, or a local `user.email` overrides the include |
