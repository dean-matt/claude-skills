# claude-skills

Skills for Claude Code, packaged as installable plugins. Each skill is a directory holding a
`SKILL.md` and its reference material, in the
[Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) format, which claude.ai, Claude
Desktop and the Agent SDK also read.

## Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)
- For `github-sdlc`: the [GitHub CLI](https://cli.github.com/), authenticated, `jq`, and Node 20.11+

## Getting started

Point a marketplace at your local clone and install from it:

```bash
git clone https://github.com/dean-matt/claude-skills.git
cd claude-skills
claude plugin validate .
claude plugin marketplace add .
claude plugin install github-multi-account@dean-matt
```

`validate` checks JSON syntax and manifest schema only; [`CONTRIBUTING.md`](CONTRIBUTING.md) lists
what it misses.

A local marketplace holds a snapshot of your clone. After editing a manifest, run
`claude plugin marketplace update dean-matt` and reinstall.

Every `claude plugin` command also runs inside Claude Code as `/plugin ...`.

## Common commands

```bash
# Install from GitHub
claude plugin marketplace add dean-matt/claude-skills
claude plugin install github-multi-account@dean-matt

# Pick up published changes
claude plugin marketplace update dean-matt
claude plugin update github-multi-account

# Component inventory and projected token cost
claude plugin details github-multi-account

# Check every manifest, or one plugin
claude plugin validate .
claude plugin validate plugins/github-multi-account

# Run the github-sdlc script and hook tests
node --test $(git ls-files '*.test.mjs')

# Remove
claude plugin uninstall github-multi-account
claude plugin marketplace remove dean-matt
```

### Without the plugin

Symlink a skill into a skills directory and any tool reading the Agent Skills format will find it:

```bash
ln -s "$PWD/plugins/github-multi-account/skills/setup" \
      ~/.claude/skills/github-multi-account
```

A plugin namespaces its skills: `setup` becomes `/github-multi-account:setup`. Outside a plugin,
give the symlink a fuller name and set `name:` in `SKILL.md` to match.

## Project structure

```
.claude-plugin/marketplace.json     the plugin registry — what `marketplace add` reads
plugins/<plugin>/
  .claude-plugin/plugin.json        name, description, version
  skills/<skill>/SKILL.md           frontmatter plus the instructions Claude loads
  skills/<skill>/...                whatever else that skill needs, read on demand
```

Claude Code reads exactly these paths. Two files register a skill: `marketplace.json` lists the
plugin and `plugin.json` names it. Nothing checks that they agree, or that either matches its
directory name.

Browse [`plugins/`](plugins/) for the current set of skills, or run
`claude plugin details <plugin>` once installed.

## Troubleshooting

- **An installed skill does not appear.** Plugin changes apply on restart. Restart Claude Code,
  then run `claude plugin list`.
- **A change does not arrive.** Refresh the marketplace snapshot first
  (`claude plugin marketplace update dean-matt`), then reinstall.
- **A skill loads but never triggers.** Check the frontmatter `description`, which Claude matches
  against. `validate` warns when it is absent, never when it is vague.

## Further reading

| File | What it covers |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Adding a skill, authoring conventions, versioning, branching and pull requests |
| [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) | The `SKILL.md` format, frontmatter fields, progressive disclosure |
| [Plugins](https://docs.claude.com/en/docs/claude-code/plugins) | Installing and managing plugins |
| [Plugin marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces) | The `marketplace.json` schema and hosting |

## Contributing

Branch from `main`, and see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](./LICENSE).
