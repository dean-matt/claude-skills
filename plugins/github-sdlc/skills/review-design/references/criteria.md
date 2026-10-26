# Checklist: acceptance criteria

Stage: criteria. Covers Summary, Reproduction, Open questions, Out of scope and the criteria.

- Summary opens with the problem, then the goal. A bug's Reproduction has steps, **Actual**
  and **Expected**.
- Every criterion states an **observable result**, not an activity, and someone who did not
  write it could check it.
- Criteria are numbered `AC1`, `AC2`, … with no gaps or duplicates.
- Together they cover the Summary's goal. For a bug, `AC1` is the **Expected** behavior.
- No two criteria contradict each other, and none contradicts Out of scope.
- No design detail hides in a criterion: a keying scheme, file name or algorithm.
- Out of scope exists. `Nothing` is acceptable.
- Every unresolved point is an unticked Open question; none that changes a criterion is left
  unanswered while the criterion reads as settled.
- `## Open questions` is present only while one item is unticked. A section of ticked items is a
  `warning`: the answers belong in the sections that carry them.
- A section a stage wrote is wrapped as `shape.md` says: `<details open>` and `</details>`
  paired, a blank line after `<summary>`. A broken wrapper is a `warning`; a missing one on a
  section the stage just rewrote is a `comment`.
- A `## UI/UX Design` heading is present exactly when a user can see the change.
- The issue's type matches its content, and a bug has a `type:fix` label.
- No relationship (blocked by, part of) is written in the body.
