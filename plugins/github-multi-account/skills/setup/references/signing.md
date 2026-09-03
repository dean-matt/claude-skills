# Commit signing

Sign each commit as the account that owns the repo. The key, the git config and
the GitHub registration all follow the account tree the rest of this skill uses,
so no command asks which identity you are in.

Read [`layout.md`](./layout.md) first: it defines the account trees. Signing
reuses the keys from [`git.md`](./git.md), and registering them uses the config
directories from [`gh.md`](./gh.md).

An SSH key signs as well as authenticates, so no new keypair is needed. GitHub
keeps authentication keys and signing keys in separate lists, which is the step
that catches people out: the same key is uploaded twice, once per type.

## 1. Turn on SSH signing

The signing format is one machine-wide choice. In `~/.gitconfig`:

```ini
[gpg]
	format = ssh
[gpg "ssh"]
	allowedSignersFile = ~/.config/git/allowed_signers
```

`allowedSignersFile` is what lets git verify a signature locally. Step 3 fills it in.

## 2. Give each account its signing key

In `~/.gitconfig-account1`, beside the email and URL rewrite it already holds:

```ini
[user]
	signingkey = ~/.ssh/id_ed25519_account1.pub
[commit]
	gpgsign = true
[tag]
	gpgsign = true
```

`signingkey` names the **public** half; git finds the private key beside it.

**`gpgsign` belongs in the account file, not in `~/.gitconfig`.** Set globally, a
repo outside every account tree inherits signing with no `signingkey` to sign
with, and every commit there fails. Set per account, such a repo simply commits
unsigned.

## 3. Let git verify signatures locally

Create `~/.config/git/allowed_signers`, one line per account:

```
<email1> namespaces="git" ssh-ed25519 AAAAC3NzaC1...
<email2> namespaces="git" ssh-ed25519 AAAAC3NzaC1...
```

Each line is the address that account commits under, then the key type and
material copied from its `.pub` file. Leave off the trailing comment. Without
this file `git log --show-signature` reports that no principal matched, even
though the signature itself is good.

## 4. Register each key as a signing key

Signed in as that account, open
[`github.com/settings/ssh/new`](https://github.com/settings/ssh/new), set **Key
type** to **Signing Key**, and paste the same `.pub` you uploaded for
authentication.

The dropdown defaults to **Authentication Key**. Leaving it there adds a second
authentication key and no signing key. Nothing reports the mistake: commits keep
signing, and stay Unverified on GitHub with no error anywhere.

Through gh instead, which needs a scope the default token lacks:

### macOS / Linux

```bash
cd ~/Repos/account1
gh auth refresh -h github.com -s admin:ssh_signing_key
gh ssh-key add ~/.ssh/id_ed25519_account1.pub --type signing --title "$(hostname -s) (signing)"
```

### Windows

```powershell
cd "$HOME\Repos\account1"
gh auth refresh -h github.com -s admin:ssh_signing_key
gh ssh-key add "$HOME\.ssh\id_ed25519_account1.pub" --type signing --title "$env:COMPUTERNAME (signing)"
```

`-s` adds to the scopes a token already carries rather than replacing them, so
each account holds only the scopes its work needs.

**`gh auth refresh` needs a terminal.** It prints a one-time code and waits for
you, so run it in a real shell. Given no TTY it exits silently having done
nothing, and the only symptom is that the scope never appears in
`gh auth status`.

**The browser authorizes whichever account it is signed into**, not the account
gh believes it is — the one step the repo path cannot decide. GitHub allows one
signed-in account per browser session, so use a private window for each account
after the first, then confirm:

```bash
gh api user --jq .login
```

## 5. Authorize SSO where an org enforces it

On [`github.com/settings/keys`](https://github.com/settings/keys), click
**Configure SSO** beside the new signing key, then **Authorize**. The
authorization you gave the authentication key does not carry over.

## Verification

The local half and the GitHub half fail independently, so check both.

```bash
cd ~/Repos/account1/example1-api
git commit --allow-empty -m "signing test"
git log --show-signature -1      # -> Good "git" signature for <email1>
```

A good signature naming that account's address proves steps 1 to 3. Push, and a
**Verified** badge on GitHub proves step 4. Only commits made after the key was
registered carry it.

Judge the setup by your own commits alone. A merge commit created through the
GitHub web UI shows Verified whatever you configured, because GitHub signs it
with its own key.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `error: Load key ... invalid format` on commit | `signingkey` names the private key; point it at the `.pub` |
| `No principal matched` from `git log --show-signature` | The committer address is missing from `allowed_signers`, or `allowedSignersFile` is unset |
| Commits verify locally, GitHub says Unverified | The key is registered for authentication alone — step 4, with the type set to Signing Key |
| Unverified in org repos only | The signing key needs its own SSO authorization — step 5 |
| Commits sign as the wrong account | `signingkey` sits in `~/.gitconfig` rather than the account file |
| Signing fails in a repo outside every account tree | `commit.gpgsign` is global; move it into each account file |
| `gh ssh-key add` returns HTTP 404 | The token lacks `admin:ssh_signing_key` — step 4 |
