---
name: build
description: Take one GitHub issue from open to a pull request ready for review — claim it, open an isolated worktree, plan if asked, implement, run the checks, take screenshots, commit, push and open the pull request. Use when asked to implement, build, fix or work an issue.
---

# Building an issue

Read the repository's CLAUDE.md and CONTRIBUTING.md first; they outrank this skill.

## Options

Ask which of these apply only when the request does not say:

- **Draft**: open the pull request as a draft.
- **Autonomous**: no questions; stop only on the conditions under *Stop*.

## Steps

1. **Choose.** With no issue named, invoke [`pick-issue`](../pick-issue/SKILL.md).
2. **Claim.** Creating the branch is the claim: it derives from the issue, so a second
   session creating it is refused. Never use `gh issue develop`, which succeeds twice.
   Read [`references/claim-and-worktree.md`](references/claim-and-worktree.md).
3. **Check it is ready**, and read it in full: the criteria, Out of scope, and the UI/UX,
   Technical and Test Design. Out of scope is a fence.
   ```bash
   "${CLAUDE_PLUGIN_ROOT}/skills/issue/scripts/ready.sh" <n>
   ```
   On `not ready`, stop and report why. On `not in the pipeline`, ask: run the pipeline from
   [`issue`](../issue/SKILL.md), or build from the issue as written (write the approach first,
   get approval, then build). Check every number or shape the issue states against the code.
4. **Mark it In Progress** on the board when one is configured, as
   [`../setup/references/board.md`](../setup/references/board.md) describes.
5. **Follow the design.** The Technical Design is the plan; the Test Design says which tests
   to write, by AC.
6. **Implement** at the smallest change that meets the criteria. Tests ride with the code. When
   the code makes the design wrong, depart from it and keep a note of each departure and why,
   for the pull request's Deviations. Never edit the issue.
   Update docs the change made stale in the same commit.
7. **Run the check command** and fix failures at the cause. Never push past a failure.
8. **Prose pass** with [`technical-writing`](../technical-writing/SKILL.md) over commit
   messages, comments and docs.
9. **Screenshots** if a user can see the change: [`screenshots`](../screenshots/SKILL.md).
10. **Commit and push**, one commit per concern, in the repository's commit style.
11. **Open the pull request** with [`open-pr`](../open-pr/SKILL.md).
12. **Hand off** to [`review-pr`](../review-pr/SKILL.md). Do not merge.

## Stop

Stop and report, without forcing, when: the issue is held; an edit appears that this run did
not make (a second driver); the check fails twice for a reason you cannot fix; or the issue
needs a decision that is the user's. A second bug found on the way becomes its own issue, not
part of this branch.

Close the worktree when the run ends; the branch and pull request stand.

## Report

End with these, so a caller can act without reading the run:

- the issue taken, or the reason none was
- the pull request number, or the condition that stopped the run before one opened
- the label left on it, and where its review pass ran (the `pr-auditor` agent, or not)
- what waits on the user: a held deviation, a declined `critical` or `warning`, a protected
  path, a second issue this run filed. Write "nothing" when there is none.
