# Contributing

Conventions for working in `claude-skills`. What the repo is and how to install from it are in
[`README.md`](README.md).

## Adding a skill

1. Decide whether it belongs in an existing plugin or a new one. A plugin is a distribution unit,
   not a category: group skills someone would install together, split ones they would not.
2. For a new plugin, create `plugins/<plugin>/.claude-plugin/plugin.json` with `name`,
   `description`, `version`, `author`, `homepage`, `license` and `keywords` — copy the shape from
   [`github-multi-account`](plugins/github-multi-account/.claude-plugin/plugin.json).
3. Create `plugins/<plugin>/skills/<skill>/SKILL.md`, and put the depth beside it in
   `reference.md`.
4. For a new plugin, add an entry to [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)
   with `name`, `source` and `description`. Claude Code shows that description and the one in
   `plugin.json` in different places, so keep the two saying the same thing.
5. Validate, install from a local marketplace, and invoke the skill before opening a pull request.
   Invoking it is the part that matters:

   ```bash
   claude plugin validate .
   claude plugin marketplace update dean-matt
   claude plugin install github-multi-account@dean-matt
   ```

## Skill authoring conventions

- **The description is the trigger, not a summary.** Claude decides whether to load a skill from
  its frontmatter `description` alone. Write it in the third person, state what the skill does,
  then state when to use it, in the words a user would actually say. A description that only
  describes leaves the skill unloaded at the moment it is needed.
- **`SKILL.md` short, `reference.md` deep.** Claude loads `SKILL.md` whenever the skill triggers,
  so every line costs tokens on every use. Keep it to when-to-use, the shape of the work, and
  pointers; detail needed only sometimes belongs in `reference.md`.
- **`name:` matches the directory**, for the plugin and the skill alike. A mismatch is the most
  common reason a skill silently fails to load, and nothing in the tooling flags it.
- **Name skills for the action, not the domain.** The plugin already supplies the namespace, so
  `/github-multi-account:setup` reads well while `/github-multi-account:github-setup` stutters.
- **Instructions, not prose.** Claude reads a skill; a person browsing does not. Prefer
  imperatives, concrete commands and file paths to explanations of concepts.

## What `validate` does not cover

`claude plugin validate` reads manifests, and the two invocations differ:

- `claude plugin validate .` parses `.claude-plugin/marketplace.json` against its schema, then
  follows each `source` path and parses that `plugin.json` too, reporting as
  `plugins[0] plugin.json → ...`. It does not descend into `skills/`.
- `claude plugin validate plugins/<plugin>` parses that `plugin.json`, then walks
  `skills/*/SKILL.md` and warns on frontmatter with no `description`.

Run both. Neither catches the following, each confirmed by breaking it deliberately:

| Broken thing | What `validate` says |
|---|---|
| `plugin.json` `name` differs from its directory | passes |
| `plugin.json` `name` differs from the marketplace entry | passes |
| `source` points at a directory that does not exist | passes, entry silently skipped |
| `SKILL.md` missing entirely | passes |
| `SKILL.md` frontmatter `name` differs from its directory | passes |
| A `description` present but too vague to trigger on | passes |

Whether the skill loads, or fires, a green run does not say. That is what step 5 of **Adding a
skill** is for.

## Versioning and releases

`plugin.json` carries a semver `version`, bumped in the same commit as the change it describes:
patch for a wording or fix, minor for new capability, major for a rename or a removed skill.
Installed copies only move when the version does.

Tag a release once the bump is on `main`:

```bash
claude plugin tag plugins/github-multi-account --dry-run
claude plugin tag plugins/github-multi-account --push
```

The tag is `{name}--v{version}`, taken from `plugin.json`, and the dry run prints the marketplace
entry it resolved through the `source` path. Treat it as a convenience, not a gate: with
`plugin.json` naming a different plugin than the marketplace entry, it still tagged cleanly.

## Maintaining the README

`README.md` is onboarding only — what this repo is, how to install, how to find everything else.

- **The section order is the contract.** Title, Prerequisites, Getting started, Common commands,
  Project structure, Troubleshooting, Further reading, Contributing, License — no additions.
  Nothing enforces it, so check by eye.
- **Content that tells you how to do something goes to a skill's `reference.md`, or here, and gets
  a Further reading row.** The README links to depth rather than holding it.
- **Content that tells you what used to be true gets deleted.** Git is the record of what changed.
- **The README lists no skills.** Adding one should touch no file outside its own plugin, so the
  README points at `plugins/` and lets the directory be the catalog. `SKILL.md` frontmatter is the
  canonical description; `plugin.json` and `marketplace.json` carry it verbatim to each other.

## Git branching

**Branch from `main`.** There are no `release/*` branches, nothing deploys from here, and branches
are merged as soon as review clears.

Branch names are lowercase and hyphenated, describing the change:

```
add-gpg-signing-skill
fix-includeif-path-quoting
```

Commit subjects follow the existing log: lowercase, imperative, no type prefix, no ticket key —
`shorten the skill name to setup`, `correct which command shows the unrewritten remote URL`. Say
what the commit does to the repo.

## Pull request standards

- `claude plugin validate .` passes
- Skill installed from a local marketplace and invoked, not only read
- `plugin.json` version bumped, if a skill's behavior changed
- Change scoped to one concern, with no unrelated work bundled in
- Diff self-reviewed before review was requested

Squash on merge. The branch name is disposable; the commit subject is what stays in the log.
