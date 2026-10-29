# Severity

One scale for the whole plugin. Each level answers the same question: how bad is the worst
outcome? Each use applies it to a different thing.

| Level | Worst outcome | Review finding | Bug (`severity:` label) | Change risk |
|---|---|---|---|---|
| `critical` | Data loss, a security hole, or the main path broken | Wrong in the main path, or an acceptance criterion missed | Data loss, a crash, or a wrong result in use | Touches stored data, a migration, auth or security |
| `high` | A bug or regression with no easy way around it | Wrong in an edge path, or breaks a check | Broken with no reasonable workaround | Adds a dependency, changes a shared interface, or spans areas |
| `medium` | Works, but costs rework or a workaround | A changed behavior with no test, duplicated code, or an unenforced rule broken | Broken, with a workaround | Changes behavior within one area, with no interface change |
| `low` | Cosmetic or rare | Naming or clarity | Cosmetic or rare | A local change with nothing a user sees beyond the criteria |
| `info` | No effect | A note | Not a defect: works as designed, or a note | Docs or trivial |

- **Review findings:** `critical`, `high` and `medium` block. Each review's own table
  ([`review-pr`](../../review-pr/SKILL.md), [`review-design`](../../review-design/SKILL.md)) gives
  the detail for its subject.
- **Bugs:** [`triage`](../../triage/SKILL.md) proposes the label and the user confirms it.
  Severity never reorders the queue.
- **Change risk:** a `risk:<level>` label on the issue, set by the criteria stage from the
  criteria and a search of the code they reach, taking the higher of two levels when unsure. It
  decides which design stages run; the
  [pipeline](../../issue/references/pipeline.md#which-stages-an-issue-needs) says how. The table
  rates what the change touches; three things raise it:
  - **The core path:** a change to what users do most (saving, loading, the main flow) is at least
    `high`, since a bug there costs every user.
  - **Uncertainty:** a root cause the criteria do not pin down, or a pattern the repository does
    not use yet, raises it one level.
  - **No tests:** a change to code no test covers raises it one level, since a regression there
    shows only in use.

  Raises add up, to `critical` at most.
- Take the highest level that applies.
