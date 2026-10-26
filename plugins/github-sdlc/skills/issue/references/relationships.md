# Native relationships

Relationships live only in GitHub's fields. The body never repeats them.

| Relationship | Field |
|---|---|
| Blocked by | issue dependency |
| Part of | sub-issue of the parent |
| Closes | the closing keyword in a pull request body |
| Related to | a plain `#n` mention where the text needs it |
| Duplicate | close with the duplicate reason and a comment naming the original |

The two REST calls take an issue's numeric `id`, not its number:

```bash
id() { gh api "repos/{owner}/{repo}/issues/$1" --jq .id; }
gh api -X POST "repos/{owner}/{repo}/issues/<n>/dependencies/blocked_by" -F issue_id="$(id <blocker>)"
gh api -X POST "repos/{owner}/{repo}/issues/<parent>/sub_issues" -F sub_issue_id="$(id <child>)"
```

Read them back with `GET .../dependencies/blocked_by`, `.../sub_issues` and `.../parent`.
