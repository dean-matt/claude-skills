# Labels

Prefixed so they are recognizable and cannot collide with a repository's own. `setup` creates
whichever are missing and touches none that exist, apart from the rename it offers below.
Re-running is safe.

| Label | Meaning |
|---|---|
| `type:feat`, `type:fix`, `type:chore`, `type:docs`, `type:spike` | The kind of issue |
| `severity:critical`, `severity:high`, `severity:medium`, `severity:low` | How bad a bug is. Bugs only. `triage` proposes and the user confirms |
| `ai-review:completed`, `ai-review:changes-requested` | The state of a pull request's review |
| `<agent>:designed` | The stage's section is written. Accumulates |
| `<agent>:review-passed`, `<agent>:changes-requested` | The stage's review result. Only one is set |

`<agent>` is `criteria-agent`, `ui-agent`, `technical-agent` or `test-agent`, as
[`pipeline.md`](../../issue/references/pipeline.md) lists. For the criteria stage,
`criteria-agent:designed` reads as "written".

The repository owns `area:*` and any label it already has. `triage` uses the existing
`area:*` labels and never invents one.

```bash
mk() { gh label create "$1" --color "$2" --description "$3" --force >/dev/null; }
for t in feat fix chore docs spike; do mk "type:$t" 1D76DB "Kind of issue"; done
mk severity:critical B60205 "Data loss, a crash, or a wrong result in use"
mk severity:high D93F0B "Broken with no reasonable workaround"
mk severity:medium FBCA04 "Broken, with a workaround"
mk severity:low 0E8A16 "Cosmetic or rare"
mk ai-review:completed 0E8A16 "AI review finished; nothing waits on a person"
mk ai-review:changes-requested D93F0B "AI review left something for a person"
for a in criteria ui technical test; do
  mk "$a-agent:designed" C5DEF5 "Section written"
  mk "$a-agent:review-passed" 0E8A16 "Section review passed"
  mk "$a-agent:changes-requested" D93F0B "Section review has findings"
done
```

`--force` updates an existing label's color and description, so run it only where the user
agreed to the plugin owning these names.

## Retiring old names

If a repository has `review:approved` or `review:changes-requested`, offer to rename them so
open pull requests follow. A `blocked` label repeats the native dependency; offer to remove it
after checking that no board view depends on it.

```bash
gh label edit "review:approved" --name "ai-review:completed"
gh label edit "review:changes-requested" --name "ai-review:changes-requested"
```
