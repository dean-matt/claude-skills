# claude-skills

Skills for Claude Code, packaged as installable plugins. Each skill is a directory in the
[Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) format, holding a `SKILL.md`
and whatever reference material it needs — a format that carries to claude.ai, Claude Desktop and
the Agent SDK, so the directories work there too.

## Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)

## Getting started

Point a marketplace at your local clone and install from it:

```bash
git clone https://github.com/dean-matt/claude-skills.git
cd claude-skills
claude plugin validate .
claude plugin marketplace add .
claude plugin install github-multi-account@dean-matt
```

Every command here also runs inside Claude Code as `/plugin ...`.

A local marketplace holds a snapshot rather than a live view of your clone, so after editing a
manifest run `claude plugin marketplace update dean-matt` and reinstall.

`validate` checks JSON syntax and manifest schema, and nothing else — see
[`CONTRIBUTING.md`](CONTRIBUTING.md) for what it leaves uncovered.

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

A plugin namespaces its skills, so `setup` reads as `/github-multi-account:setup` once installed.
Outside a plugin nothing supplies that namespace, so give the symlink a fuller name and match the
`name:` field in `SKILL.md` to it.

## Project structure

```
.claude-plugin/marketplace.json     the plugin registry — what `marketplace add` reads
plugins/<plugin>/
  .claude-plugin/plugin.json        name, description, version
  skills/<skill>/SKILL.md           frontmatter plus the instructions Claude loads
  skills/<skill>/reference.md       the depth, loaded only when the skill needs it
```

Claude Code looks for those paths exactly as they sit above; the layout is not a choice. Two files
register a skill — `marketplace.json` lists the plugin, `plugin.json` names it — and nothing checks
that they agree, or that either matches its directory name.

Browse [`plugins/`](plugins/) for the current set of skills, or run
`claude plugin details <plugin>` once installed.

## Troubleshooting

- **An installed skill does not appear.** Plugin changes apply on restart. Restart Claude Code,
  then check `claude plugin list`.
- **A change does not arrive.** The marketplace holds a snapshot and has to refresh before
  `plugin update` can see it. Run `claude plugin marketplace update dean-matt` first, then
  reinstall.
- **A skill loads but never triggers.** Check the frontmatter `description` — it is what Claude
  matches against, and `validate` only warns when it is absent, never when it is vague.

## Further reading

| File | What it covers |
|---|---|
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | Adding a skill, authoring conventions, versioning, branching and pull requests |
| [`plugins/github-multi-account/skills/setup/reference.md`](plugins/github-multi-account/skills/setup/reference.md) | The multi-account config in full — file shapes, verification, failure modes |
| [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) | The `SKILL.md` format, frontmatter fields, progressive disclosure |
| [Plugins](https://docs.claude.com/en/docs/claude-code/plugins) | Installing and managing plugins |
| [Plugin marketplaces](https://docs.claude.com/en/docs/claude-code/plugin-marketplaces) | The `marketplace.json` schema and hosting |

## Contributing

Branch from `main`, and see [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](./LICENSE).
