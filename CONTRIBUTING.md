# Contributing

Conventions for working in `claude-skills`. What the repo is and how to install it: [`README.md`](README.md).

## Adding a skill

1. Choose an existing plugin or a new one. A plugin is a distribution unit, not a category: group
   skills someone would install together, split ones they would not.
2. For a new plugin, create `plugins/<plugin>/.claude-plugin/plugin.json` with `name`,
   `description`, `version`, `author`, `homepage`, `license` and `keywords`, in the shape of
   [`github-multi-account`](plugins/github-multi-account/.claude-plugin/plugin.json).
3. Create `plugins/<plugin>/skills/<skill>/SKILL.md`. Reference documents, scripts and templates
   sit beside it, reached by relative path. Supporting documents go in `references/`, one file per
   concern, named for its topic (see `setup`).
4. For a new plugin, add an entry with `name`, `source` and `description` to
   [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json). Claude Code shows it and
   the `plugin.json` description in different places, so keep them identical.
5. Before opening a pull request, validate, install from a local marketplace, and invoke the
   skill. Installing proves the manifests; only invoking proves the skill:

   ```bash
   claude plugin validate .
   claude plugin marketplace update dean-matt
   claude plugin install github-multi-account@dean-matt
   ```

## Skill authoring conventions

- **The description is the trigger, not a summary.** Claude loads a skill from its frontmatter
  `description` alone. Write it in the third person: what the skill does, then when to use it, in
  the words a user would say. A description that only describes leaves the skill unloaded when
  needed.
- **`SKILL.md` short, supporting files deep.** Every line of `SKILL.md` costs tokens on every use.
  Keep when-to-use, the shape of the work and pointers; detail needed only sometimes goes in a
  supporting file.
- **`name:` matches the directory**, for plugin and skill alike. A mismatch silently stops the
  skill loading, and nothing in the tooling flags it.
- **Name skills for the action, not the domain.** The plugin supplies the namespace:
  `/github-multi-account:setup`, not `/github-multi-account:github-setup`.
- **Instructions, not prose.** Prefer imperatives, concrete commands and file paths to
  explanations of concepts.
- **Prose follows [`technical-writing`](plugins/github-sdlc/skills/technical-writing/SKILL.md):**
  terse, clear, concise, not much narrative, no history.

## What `validate` does not cover

`claude plugin validate` reads manifests, and the two invocations differ:

- `claude plugin validate .` parses `.claude-plugin/marketplace.json` against its schema, then
  follows each `source` path and parses that `plugin.json` too, reporting as
  `plugins[0] plugin.json → ...`. It does not descend into `skills/`.
- `claude plugin validate plugins/<plugin>` parses that `plugin.json`, then walks
  `skills/*/SKILL.md` and warns on frontmatter with no `description`.

Run both. Neither catches the following:

| Broken thing | What `validate` says |
|---|---|
| `plugin.json` `name` differs from its directory | passes |
| `plugin.json` `name` differs from the marketplace entry | passes |
| `source` points at a directory that does not exist | passes, entry silently skipped |
| `SKILL.md` missing entirely | passes |
| `SKILL.md` frontmatter `name` differs from its directory | passes |
| A `description` present but too vague to trigger on | passes |

A green run does not show that the skill loads or fires. Step 5 of **Adding a skill** does.

## Versioning and releases

`plugin.json` carries a semver `version`, bumped in the commit it describes: patch for a wording
or fix, minor for new capability, major for a rename or removed skill. Installed copies move only
when the version does.

Tag a release once the bump is on `main`:

```bash
claude plugin tag plugins/github-multi-account --dry-run
claude plugin tag plugins/github-multi-account --push
```

The tag is `{name}--v{version}`, taken from `plugin.json`; the dry run prints the marketplace
entry it resolved through `source`. It is a convenience, not a gate: it does not stop a
`plugin.json` that names a different plugin than the marketplace entry.

## Maintaining the README

`README.md` is onboarding only — what this repo is, how to install, how to find everything else.

- **The section order is the contract:** Title, Prerequisites, Getting started, Common commands,
  Project structure, Troubleshooting, Further reading, Contributing, License. No additions;
  nothing enforces it, so check by eye.
- **How-to content goes to the skill that needs it, or here, with a Further reading row.** The
  README links to depth.
- **Delete what used to be true.** Git records what changed.
- **The README lists no skills.** Adding one touches no file outside its plugin; the README points
  at `plugins/`. `SKILL.md` frontmatter is the canonical description; `plugin.json` and
  `marketplace.json` carry it verbatim.

## Git branching

**Branch from `main`.** Nothing deploys from here, so there are no `release/*` branches. Merge when
review clears.

Branch names are lowercase and hyphenated, describing the change:

```
add-gpg-signing-skill
fix-includeif-path-quoting
```

Commit subjects follow the log: lowercase, imperative, no type prefix, no ticket key, saying what
the commit does: `shorten the skill name to setup`.

## Pull request standards

- `claude plugin validate .` passes
- Skill installed from a local marketplace and invoked, not only read
- `plugin.json` version bumped if a skill's behavior changed
- Change scoped to one concern, with no unrelated work bundled in
- Diff self-reviewed before review was requested

Squash on merge. The branch name is disposable; the commit subject is what stays in the log.
