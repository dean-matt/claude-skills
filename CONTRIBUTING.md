# Contributing

Conventions for working in `claude-skills`. What the repo is and how to install from it are in
[`README.md`](README.md); what each skill does is in that skill's own `SKILL.md` and
`reference.md`.

## Adding a skill

1. Decide whether it belongs in an existing plugin or a new one. A plugin is a distribution unit,
   not a category — group skills that a person would install together, and split ones they would
   not.
2. For a new plugin, create `plugins/<plugin>/.claude-plugin/plugin.json` with `name`,
   `description`, `version`, `author`, `homepage`, `license` and `keywords`. Copy the shape from
   [`github-multi-account`](plugins/github-multi-account/.claude-plugin/plugin.json). `name` must
   match the directory.
3. Create `plugins/<plugin>/skills/<skill>/SKILL.md`. The `name:` in the frontmatter must match
   the skill directory, and the body holds the instructions Claude follows.
4. Put the depth in `reference.md` alongside it. `SKILL.md` stays short and points at it.
5. For a new plugin, add an entry to [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json)
   with `name`, `source` and `description`. Claude Code shows that description and the one in
   `plugin.json` in different places, so keep the two saying the same thing.
6. Validate, install from a local marketplace, and invoke the skill before opening a pull request.
   Invoking it is the part that matters — see **What `validate` does not cover** below:

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
  pointers. Detail needed only sometimes belongs in `reference.md`, read when the work calls for
  it.
- **`name:` matches the directory.** For the plugin and the skill alike. A mismatch is the most
  common reason a skill silently fails to load, and nothing in the tooling flags it.
- **Name skills for the action, not the domain.** The plugin already supplies the namespace, so
  `/github-multi-account:setup` reads well while `/github-multi-account:github-setup` stutters.
- **Instructions, not prose.** Claude reads a skill; a person browsing does not. Prefer
  imperatives, concrete commands and file paths to explanations of concepts.

## What `validate` does not cover

`claude plugin validate` reads manifests. That is all it does, and the two invocations differ:

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

A green `validate` therefore means the JSON is well-formed and the required fields are present.
Whether the skill loads, or fires, it does not say. That is what step 7 of **Adding a skill** is
for: install from a local marketplace and invoke the skill.

## Versioning and releases

`plugin.json` carries a semver `version`, bumped in the same commit as the change it describes:
patch for a wording or fix, minor for new capability, major for a rename or a removed skill.
Installed copies only move when the version does, so a change shipped without a bump does not
reach anyone who already has the plugin.

Tag a release once the bump is on `main`:

```bash
claude plugin tag plugins/github-multi-account --dry-run
claude plugin tag plugins/github-multi-account --push
```

The tag is `{name}--v{version}`, taken from `plugin.json`, and the dry run prints the marketplace
entry it resolved through the `source` path. Treat it as a convenience, not a gate: with
`plugin.json` naming a different plugin than the marketplace entry, it still tagged cleanly. Read
the dry-run output rather than trusting it to object.

## Maintaining the README

`README.md` is onboarding only — what this repo is, what is in it, how to install, how to find
everything else. Three rules:

- **The section order is the contract.** Title, Prerequisites, Getting started, Common commands,
  Project structure, Troubleshooting, Further reading, Contributing, License — no additions. A
  reader who knows the order knows where to look without scanning, which is worth more than any
  one section sitting where it would read best alone. Nothing enforces the order, so check it by
  eye.
- **Content that tells you how to do something goes to a skill's `reference.md`, or to
  `CONTRIBUTING.md`, and gets a Further reading row.** The README links to depth rather than
  holding it.
- **Content that tells you what used to be true gets deleted.** Git is the record of what changed.
- **The README lists no skills.** Adding one should touch no file outside its own plugin, so the
  README points at `plugins/` and lets the directory be the catalog. `SKILL.md` frontmatter is the
  canonical description; `plugin.json` and `marketplace.json` carry it verbatim to each other.

## Git branching

**Branch from `main`.** This repo has no `release/*` branches: nothing deploys from here, and
`main` is its only long-lived branch. Keep branches short-lived, and merge as soon as review
clears.

Branch names are lowercase and hyphenated, describing the change:

```
add-gpg-signing-skill
fix-includeif-path-quoting
```

Commit subjects follow the existing log: lowercase, imperative, no type prefix, no ticket key —
`shorten the skill name to setup`, `correct which command shows the unrewritten remote URL`. Say
what the commit does to the repo.

## Pull request standards

Small repo, so the bar is short:

- `claude plugin validate .` passes
- Skill installed from a local marketplace and invoked, not only read
- `plugin.json` version bumped, if a skill's behavior changed
- Change scoped to one concern, with no unrelated work bundled in
- Diff self-reviewed before review was requested

Squash on merge. The branch name is disposable; the commit subject is what stays in the log.
