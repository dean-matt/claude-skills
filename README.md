# claude-skills

Skills for Claude Code, packaged as installable plugins.

Each skill is a directory holding a `SKILL.md` and whatever reference material it
needs. The format is the Agent Skills format, so the skill directories also work
in claude.ai, Claude Desktop, and the Agent SDK — the plugin wrapper here is what
makes them installable in one command.

## Skills

| Plugin                 | Skill                             | What it does                                                       |
| ---------------------- | --------------------------------- | ------------------------------------------------------------------ |
| `github-multi-account` | `setup-multiple-github-accounts`  | Run any number of GitHub accounts on one machine. An SSH key per account, git `includeIf` routing by repo path, and gh CLI config-directory switching, so the repo path decides the account and no command ever switches identities. |

## Installing

Add the marketplace once:

```
/plugin marketplace add dean-matt/claude-skills
```

Then install what you want:

```
/plugin install github-multi-account@dean-matt
```

Both commands also work from a shell as `claude plugin marketplace add ...` and
`claude plugin install ...`.

## Installing a skill without the plugin

Skills stand on their own. Symlink one into your skills directory and any tool
that reads the Agent Skills format will find it:

```bash
git clone https://github.com/dean-matt/claude-skills.git
ln -s "$PWD/claude-skills/plugins/github-multi-account/skills/setup-multiple-github-accounts" \
      ~/.claude/skills/setup-multiple-github-accounts
```

## License

[MIT](./LICENSE).
