# Severity

One scale for the whole plugin. Each level answers the same question: how bad is the worst
outcome? Each use applies it to a different thing.

| Level | Worst outcome | Review finding | Bug (`severity:` label) |
|---|---|---|---|
| `critical` | Data loss, a security hole, or the main path broken | Wrong in the main path, or an acceptance criterion missed | Data loss, a crash, or a wrong result in use |
| `high` | A bug or regression with no easy way around it | Wrong in an edge path, or breaks a check | Broken with no reasonable workaround |
| `medium` | Works, but costs rework or a workaround | A changed behavior with no test, duplicated code, or an unenforced rule broken | Broken, with a workaround |
| `low` | Cosmetic or rare | Naming or clarity | Cosmetic or rare |
| `info` | No effect | A note | Not a defect: works as designed, or a note |

- **Review findings:** `critical`, `high` and `medium` block. [`review-pr`](../../review-pr/SKILL.md)'s
  table gives the detail for a pull request.
- **Bugs:** [`triage`](../../triage/SKILL.md) proposes the label and the user confirms it.
  Severity never reorders the queue.
- Take the highest level that applies.
