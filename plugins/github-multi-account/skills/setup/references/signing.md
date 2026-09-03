# Commit signing

Sign each commit as the account that owns the repo, the account tree deciding
which key as it does everywhere else here.

Read [`layout.md`](./layout.md) first: it defines the account trees. Signing
reuses the keys from [`git.md`](./git.md) and the config directories from
[`gh.md`](./gh.md). No new keypair is needed — an SSH key signs as well as it
authenticates — but GitHub keeps signing keys in a list of their own, so the same
key is registered twice.

## Turn on SSH signing

The format is machine-wide. In `~/.gitconfig`:

```ini
[gpg]
	format = ssh
[gpg "ssh"]
	allowedSignersFile = ~/.config/git/allowed_signers
```

`allowedSignersFile` lets git verify signatures locally; the next section fills
it in.

## Give each account its signing key

In `~/.gitconfig-account1`, beside the email and URL rewrite it already holds:

```ini
[user]
	signingkey = ~/.ssh/id_ed25519_account1.pub
[commit]
	gpgsign = true
[tag]
	gpgsign = true
```

`signingkey` points at the `.pub`; git finds the private key beside it. Each
account file names that account's own key.

**`gpgsign` belongs in the account file, not in `~/.gitconfig`.** Set globally, a
repo outside every account tree inherits signing with no `signingkey` to sign
with, and every commit there fails. Set per account, such a repo commits
unsigned.

## Let git verify signatures locally

Create `~/.config/git/allowed_signers` — the directory will not exist yet — with
one line per account:

```
<email1> namespaces="git" ssh-ed25519 AAAAC3NzaC1...
<email2> namespaces="git" ssh-ed25519 AAAAC3NzaC1...
```

Each line is the address that account commits under, then the first two
space-separated fields of its `.pub` file — the trailing comment is left off.
Without this file `git log --show-signature` reports that no principal matched,
even though the signature itself is good.

## Register each key as a signing key

Signed in as that account, open
[`github.com/settings/ssh/new`](https://github.com/settings/ssh/new), set **Key
type** to **Signing Key**, and paste the same `.pub` you uploaded for
authentication.

The dropdown defaults to **Authentication Key**. Left there it adds a second
authentication key and no signing key: commits still sign, GitHub still reads
Unverified, and nothing reports the mistake.

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

**`gh auth refresh` needs a terminal.** It prints a one-time code and waits.
Without a TTY it exits silently having done nothing, and the only symptom is a
scope that never appears in `gh auth status`.

**The browser authorizes whichever account it is signed into**, not the account
gh believes it is — the one step the repo path cannot decide. GitHub allows one
signed-in account per browser session, so use a private window for each account
after the first, then confirm:

```bash
gh api user --jq .login
```

## Authorize the signing key for SSO

A signing key needs its own SSO authorization; the one you gave the
authentication key does not carry over. Same place as in
[`git.md`](./git.md) — **Configure SSO** beside the key, then **Authorize**.

## Verification

The local half and the GitHub half fail independently, so check both.

```bash
mkdir ~/Repos/account1/signing-test && cd ~/Repos/account1/signing-test
git init -q
git commit --allow-empty -m "signing test"
git log --show-signature -1      # -> Good "git" signature for <email1>
cd ~ && rm -rf ~/Repos/account1/signing-test
```

The throwaway repo goes inside the account tree so the `includeIf` rule reaches
it. One created anywhere else inherits no signing key and proves nothing.

A good signature naming that account's address proves the local configuration.
Push, and a **Verified** badge on GitHub proves the key is registered. Only
commits made after that registration carry it.

Judge the setup by your own commits alone. A merge commit created through the
GitHub web UI shows Verified whatever you configured, because GitHub signs it
with its own key.

## Troubleshooting

| Symptom | Cause |
| --- | --- |
| `No principal matched` from `git log --show-signature` | The committer address is missing from `allowed_signers`, or `allowedSignersFile` is unset |
| Commits verify locally, GitHub says Unverified | The key is registered for authentication alone — register it again with the type set to Signing Key |
| Unverified in org repos only | The signing key needs its own SSO authorization, separate from the authentication key's |
| Commits sign as the wrong account | `signingkey` sits in `~/.gitconfig` rather than the account file |
| Signing fails in a repo outside every account tree | `commit.gpgsign` is global; move it into each account file |
| `gh ssh-key add` returns HTTP 404 | The token lacks `admin:ssh_signing_key`; add it with `gh auth refresh` |
