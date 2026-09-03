# Layout and Resolution

How a repo's path decides its account: the directory convention both tools read,
and the separate mechanisms each uses to turn that path into an identity.

## Account trees

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

## How a path resolves

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

Configure the halves separately: [`git.md`](./git.md) for git, [`gh.md`](./gh.md)
for gh. Either works without the other. To find out what a machine already does,
start with [`audit.md`](./audit.md).
