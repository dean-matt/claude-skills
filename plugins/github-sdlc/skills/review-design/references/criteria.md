# Checklist: acceptance criteria

Stage: criteria. Covers Summary, Reproduction, Open questions, Out of scope and the criteria.

- Summary opens with the problem, then the goal.
- One `risk:<level>` label, checked against the code the criteria reach
  ([scale](../../setup/references/severity.md)). A missing label is a `medium`; a level below what
  they touch (stored data, a migration, auth, a shared interface, several areas) is a `high`,
  since it skips design the issue needs. Give the reason in the finding.
- A bug's Reproduction has steps, **Actual** and **Expected**.
- Every criterion states an **observable result**, not an activity, and someone who did not
  write it could check it.
- Criteria are numbered `AC1`, `AC2`, … with no gaps or duplicates.
- Together they cover the Summary's goal. For a bug, `AC1` is the **Expected** behavior.
- **Size:** the issue is one slice that ships alone. Where its criteria fall into two or more
  groups that each ship, and pass their own checks, without the others, and the issue has more
  than three criteria or a group changes stored data, it is a `medium`. Propose the split: each
  group's criterion numbers, a title, and the order they ship in.
- No two criteria contradict each other, and none contradicts Out of scope.
- No design detail hides in a criterion: a keying scheme, file name or algorithm.
- Out of scope exists. `Nothing` is acceptable.
- Every unresolved point is an unticked Open question; none that changes a criterion is left
  unanswered while the criterion reads as settled.
- `## Open questions` is present only while one item is unticked. A section of ticked items is a
  `medium`: the answers belong in the sections that carry them.
- A section a stage wrote is wrapped as `shape.md` says: `<details open>` and `</details>`
  paired, the heading as `<summary><h2>…</h2></summary>`, a blank line after `<summary>`. A broken wrapper is a `medium`; a missing one on a
  section the stage just rewrote is a `low`.
- A UI/UX Design heading is present exactly when a user can see the change.
- The issue's type matches its content, and a bug has a `type:fix` label.
- No relationship (blocked by, part of) is written in the body.
