# Git setup

SSH keys, host aliases and `includeIf` rules. Read [`layout.md`](./layout.md)
first: it defines the account trees every step below refers to. Configuring `gh`
is a separate job, and works without this one — see [`gh.md`](./gh.md).

## 1. Generate one key per account

```bash
ssh-keygen -t ed25519 -C "<email1> (mac)" -f ~/.ssh/id_ed25519_account1 -N ""
ssh-keygen -t ed25519 -C "<email2> (mac)" -f ~/.ssh/id_ed25519_account2 -N ""
```

`-f` names the file; the default name would collide across accounts. `-N ""`
skips the passphrase. Add one later with
`ssh-keygen -p -f ~/.ssh/id_ed25519_account1`.

## 2. Add one SSH host alias per account

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

## 3. Map each account tree to its account

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
time, so the stored remote stays untouched: `git config --get remote.origin.url`
still returns the original URL, while `git remote -v` and `git ls-remote
--get-url` apply the rewrite and show the alias. Cloning with a plain
`https://github.com/...` URL inside any account tree works. List both prefixes
because remotes may use either.

## 4. Upload each public key

The `.pub` half goes to GitHub; the private half stays on the machine. Sign in as
that account, open `github.com/settings/keys`, choose **New SSH key**, leave the
type as **Authentication key**, and paste the output of:

```bash
cat ~/.ssh/id_ed25519_account1.pub
```

If that account's `gh` is already set up per [`gh.md`](./gh.md), skip the web UI:

```bash
GH_CONFIG_DIR=~/.config/gh-account1 \
  gh ssh-key add ~/.ssh/id_ed25519_account1.pub --title "$(hostname -s)"
```

## 5. Authorize SSO where an org enforces it

On `github.com/settings/keys`, click **Configure SSO**, then **Authorize** beside
the key. Org repos reject an unauthorized key.

## Verification

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

## Cloning

Clone with the ordinary HTTPS URL from GitHub, inside the right account tree:

```bash
cd ~/Repos/account1
git clone https://github.com/<org>/<repo>.git
```

`insteadOf` rewrites the URL, so the clone uses that account tree's key and the
new repo inherits that account's email. The account tree you stand in decides the
account, which is the only rule to remember day to day.

## Troubleshooting

| Symptom                                                            | Cause                                                                               |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `ssh -T` greets the wrong account                                  | `IdentitiesOnly yes` missing, or wrong `IdentityFile`                               |
| `ERROR: The '<org>' organization has enabled or enforced SAML SSO` | Key needs SSO authorization — step 5                                                |
| `git ls-remote --get-url` returns the raw HTTPS URL                | Repo sits outside every account tree; check the path and the trailing slash         |
| `Permission denied (publickey)` in one account tree only                   | That account lacks that key                                                         |
| Commits land under the wrong email                                 | Repo sits outside every account tree, or a local `user.email` overrides the include |
