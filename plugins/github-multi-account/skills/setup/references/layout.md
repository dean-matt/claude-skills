# Layout and Resolution

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
