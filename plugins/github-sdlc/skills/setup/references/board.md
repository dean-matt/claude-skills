# The project board

Skills move an issue's card between statuses, looking the project, field and option up by name;
nothing is hard-coded.

| Status | Set by |
|---|---|
| Triage | `issue`, on creation with an Open question unticked; `triage`, on an issue filed elsewhere |
| Todo | `issue`, on creation with no Open question unticked; `triage`, when the issue is ready to pick |
| In Development | `auto`, `build` or `issue`, on claim |
| In Review | `open-pr` |
| Done | `merge-pr` |

A board lacking a status skips that move and says so; `setup` offers to add the missing option.
A board with `In Progress` and no `In Development` uses `In Progress`, and `setup` offers to rename
it. A board's `In Design` status is no longer set; `setup` offers to remove it once no card holds it.

## Find the project

```bash
owner=<owner>; repo=<repo>
gh api graphql -f query='query($o:String!,$r:String!){repository(owner:$o,name:$r){projectsV2(first:10){nodes{number title}}}}' \
  -f o="$owner" -f r="$repo" --jq '.data.repository.projectsV2.nodes'
```

One project: use it. Several: ask. None: skip board steps; this is not an error.

## Move a card

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/setup/scripts/move-card.mjs" <project> <owner> <issue-url> "<status>"
```

It caches the project, field and option ids for an hour, so a move is two calls, not four.
Repeating a move changes only the status. Exit 3: the board has no such status; skip the move
and say so. Exit 2: see *Failures*.

## Failures

- **"rate limit exceeded":** stop and report; do not retry in a loop.
- **A missing `project` scope, a permission error, or `Could not resolve to a ProjectV2`:** stop,
  do not retry, and report that this login cannot edit the project. Fix: `gh auth refresh -s
  project`, and the owner adds the login under the project's access.
- A failed card move never undoes the work around it. Report the card as not moved.
