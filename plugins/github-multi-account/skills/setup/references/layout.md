# Layout and Resolution

How a repo's path decides its account: the directory convention both tools read, and how each
turns the path into an identity.

## Account trees

Give every account an account tree: one folder under your repo root holding every repo for that
account. Group by account, not by client; nest client folders inside the tree.

```
~/Repos/
├── account1/                     -> GitHub account <username1>
│   ├── example1-api/             repo
│   ├── example1-web/             repo
│   └── wt/                       worktrees of the repos above, covered by the same rule
│       └── example1-web-1042/
└── account2/                     -> GitHub account <username2>
    └── example2/                 grouping folder, not a repo
        ├── example2-storefront/  repo
        └── example2-admin/       repo
```

## How a path resolves

The path is the only input. git and gh read it separately: git authenticates over SSH with a key,
gh over HTTPS with a token.

```
                    ┌─ git: includeIf in ~/.gitconfig -> ~/.gitconfig-account1
                    │                                        |
                    │                                        +- user.email
repo path ──────────┤                                        +- url insteadOf
                    │                                              |
                    │                                        SSH alias -> that account's key
                    │
                    └─ gh:  shell hook -> GH_CONFIG_DIR -> ~/.config/gh-account1
                                                                 |
                                                            that account's token
```

Every SSH alias points at `github.com` but presents a different key; a URL rewrite sends each
account tree to its own alias. Each gh config directory holds one account; a shell function
exports the matching one.

Configure each half separately: [`git.md`](./git.md), [`gh.md`](./gh.md). Either works alone. To
see what a machine already does, start with [`audit.md`](./audit.md).
