# The project board

Skills move an issue's card between statuses. They look the project, field and option up by
name each time, so nothing here is hard-coded and a rebuilt board needs no edit.

| Status | Set by |
|---|---|
| Triage | `triage`, on a new issue |
| Todo | `triage`, when the issue is ready to pick |
| In Progress | a design stage or `build`, on claim |
| In Review | `open-pr` |
| Done | `merge-pr` |

A board lacking a status skips that move and says so. `setup` offers to add the missing
options.

## Find the project

```bash
owner=<owner>; repo=<repo>
gh api graphql -f query='query($o:String!,$r:String!){repository(owner:$o,name:$r){projectsV2(first:10){nodes{number title}}}}' \
  -f o="$owner" -f r="$repo" --jq '.data.repository.projectsV2.nodes'
```

One project: use it. Several: ask. None: skip board steps; this is not an error.

## Move a card

```bash
proj=<number>
pid=$(gh project view "$proj" --owner "$owner" --format json --jq .id)
field=$(gh project field-list "$proj" --owner "$owner" --format json \
  --jq '.fields[] | select(.name=="Status")')
fid=$(jq -r .id <<<"$field")
opt=$(jq -r --arg s "<status>" '.options[] | select(.name==$s) | .id' <<<"$field")
item=$(gh project item-add "$proj" --owner "$owner" --url <issue-url> --format json --jq .id)
gh project item-edit --id "$item" --project-id "$pid" --field-id "$fid" --single-select-option-id "$opt"
```

`item-add` returns the item an issue already has, so repeating a move changes only the status.

## Failures

- **"rate limit exceeded":** stop and report; do not retry in a loop.
- **A missing `project` scope, a permission error, or `Could not resolve to a ProjectV2`:**
  stop without retrying and report that this login cannot edit the project. The fix is
  `gh auth refresh -s project`, plus the owner adding the login under the project's access.
- A failure moving a card never undoes the work around it. Report the card as not moved and
  carry on.
