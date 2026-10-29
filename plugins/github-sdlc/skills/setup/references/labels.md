# Labels

Prefixed to avoid colliding with a repository's own. `setup` creates the missing ones and touches
none that exist, apart from the rename below. Re-running is safe.

| Label | Meaning |
|---|---|
| `type:feat`, `type:fix`, `type:chore`, `type:docs`, `type:spike` | The kind of issue |
| `severity:critical`, `severity:high`, `severity:medium`, `severity:low`, `severity:info` | How bad a bug is, on the plugin's [scale](severity.md). Bugs only. `triage` proposes and the user confirms |
| `ai-review:completed`, `ai-review:changes-requested` | The state of a pull request's review |
| `needs-user` | The issue waits on the user's answer. [`claim`](../../issue/references/claim.md#waiting-on-the-user) sets and clears it |

The repository owns `area:*` and any label it already has. `triage` uses the existing
`area:*` labels and never invents one.

```bash
have=$(gh label list --limit 200 --json name --jq '.[].name')
mk() { printf '%s\n' "$have" | grep -qxF "$1" || gh label create "$1" --color "$2" --description "$3" >/dev/null; }
for t in feat fix chore docs spike; do mk "type:$t" 1D76DB "Kind of issue"; done
mk severity:critical B60205 "Data loss, a crash, or a wrong result in use"
mk severity:high D93F0B "Broken with no reasonable workaround"
mk severity:medium FBCA04 "Broken, with a workaround"
mk severity:low 0E8A16 "Cosmetic or rare"
mk severity:info BFD4F2 "Not a defect: works as designed, or a note"
mk needs-user D876E3 "Waits on the user's answer"
mk ai-review:completed 0E8A16 "AI review finished; nothing waits on a person"
mk ai-review:changes-requested D93F0B "AI review left something for a person"
```

A label that already exists is skipped, so a repository's own color or description for it survives.

## Retiring old names

If a repository has `review:approved` or `review:changes-requested`, offer to rename them so open
pull requests follow. A `blocked` label repeats the native dependency; offer to remove it once no
board view depends on it. The `*-agent:*` and `risk:*` labels
belong to retired design stages; offer to remove each that no open issue carries.

```bash
gh label edit "review:approved" --name "ai-review:completed"
gh label edit "review:changes-requested" --name "ai-review:changes-requested"
```
