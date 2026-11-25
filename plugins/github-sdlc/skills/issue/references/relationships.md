# Native relationships

Relationships live only in GitHub's fields. The body never repeats them.

| Relationship | Field |
|---|---|
| Blocked by | issue dependency |
| Closes | the closing keyword in a pull request body |
| Related to | a plain `#n` mention where the text needs it |
| Duplicate | close with the duplicate reason and a comment naming the original |

The REST call takes an issue's numeric `id`, not its number:

```bash
id() { gh api "repos/{owner}/{repo}/issues/$1" --jq .id; }
gh api -X POST "repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by" -F issue_id="$(id <blocker>)"
```

Read it back with `GET .../dependencies/blocked_by`. Never add a sub-issue: a parent stays open
beside its children and skews the milestone's progress.

Closing a blocker clears the block: the dependency stays on record as closed and
`issue_dependencies_summary.blocked_by` drops to zero, so edit nothing when a blocker merges.
