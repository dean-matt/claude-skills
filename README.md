# claude-skills

Skills for Claude Code, packaged as installable plugins. Each skill is a directory in the
[Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) format, holding a `SKILL.md`
and whatever reference material it needs. That format carries to claude.ai, Claude Desktop and
the Agent SDK, so the skill directories work there too; the
[plugin](https://docs.claude.com/en/docs/claude-code/plugins) wrapper only makes them installable
in one command.

Most people arriving here want to install one — start at Getting started. Everything else is for
changing or adding a skill.

## Prerequisites

- [Claude Code](https://docs.claude.com/en/docs/claude-code/overview)

Nothing else. No build, no dependency install, no runtime — the repo is Markdown and two JSON
manifests.

## Getting started

Point a marketplace at your local clone and install from it. That is the whole loop: edit a
`SKILL.md`, reinstall, invoke the skill, see the change.

```bash
git clone https://github.com/dean-matt/claude-skills.git
cd claude-skills
claude plugin validate .
claude plugin marketplace add .
claude plugin install github-multi-account@dean-matt
```

`validate` is the only check here, and a narrow one: JSON syntax and manifest schema. Run it
before every commit, and see Contributing for what it leaves uncovered. Every command below also
runs inside Claude Code as `/plugin ...`.

A local marketplace holds a snapshot rather than a live view of your clone. After changing a
manifest, run `claude plugin marketplace update dean-matt` and reinstall.

## Common commands

```bash
# Install for real, from GitHub
claude plugin marketplace add dean-matt/claude-skills
claude plugin install github-multi-account@dean-matt

# Pick up published changes
claude plugin marketplace update dean-matt
claude plugin update github-multi-account

# Inspect — component inventory and projected token cost
claude plugin details github-multi-account

# Check the manifests, or one plugin's
claude plugin validate .
claude plugin validate plugins/github-multi-account

# Remove
claude plugin uninstall github-multi-account
claude plugin marketplace remove dean-matt
```

### Without the plugin

Skills stand on their own. Symlink one into a skills directory and any tool that reads the Agent
Skills format will find it:

```bash
ln -s "$PWD/plugins/github-multi-account/skills/setup" \
      ~/.claude/skills/github-multi-account
```

A plugin namespaces its skills, so a short name like `setup` reads as
`/github-multi-account:setup` once installed. Outside a plugin nothing supplies that namespace, so
give the symlink a fuller name and match the `name:` field in `SKILL.md` to it.

## Project structure

```
.claude-plugin/marketplace.json     the plugin registry — one entry per plugin, this is what
                                    `marketplace add` reads
plugins/<plugin>/
  .claude-plugin/plugin.json        the plugin manifest — name, description, version
  skills/<skill>/SKILL.md           frontmatter plus the instructions Claude loads
  skills/<skill>/reference.md       the depth, loaded only when the skill needs it
```

The plugin format fixes this layout rather than leaving it to taste: Claude Code looks for the
`.claude-plugin/` directories, the manifest filenames and `skills/` exactly where they sit above.
Two files register a skill — `marketplace.json` lists the plugin, and the plugin's own
`plugin.json` names it. Nothing checks that they agree, or that either matches its directory name,
so keep them in sync by hand.

Every skill lives under [`plugins/<plugin>/skills/`](plugins/). Browse that directory for the
current set — each `SKILL.md` opens with the description Claude matches against — or run
`claude plugin details <plugin>` once installed.

## Troubleshooting

- **An installed skill does not appear.** Plugin changes apply on restart. Restart Claude Code,
  then check `claude plugin list`.
- **Edits to a local clone have no effect.** The marketplace holds a snapshot. Run
  `claude plugin marketplace update dean-matt` and reinstall.
- **A published change does not arrive.** The marketplace has to refresh before `plugin update`
  can see it. Run `claude plugin marketplace update dean-matt` first.
- **`validate` warns about a missing description or author.** Both manifests carry those fields;
  a warning means one was dropped.
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

Branch from `main`; this repo has no `release/*` branches. Commit subjects are lowercase and
imperative. `claude plugin validate .` must pass before a pull request.

Full conventions: [`CONTRIBUTING.md`](CONTRIBUTING.md).

## License

[MIT](./LICENSE).
