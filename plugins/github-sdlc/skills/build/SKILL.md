---
name: build
description: Take one GitHub issue from open to a pull request ready for review — check it is ready, claim it, open an isolated worktree, implement, run the checks, take screenshots, commit, push and open the pull request. Use when asked to implement, build, fix or work an issue.
argument-hint: "[issue-number] [--draft] [--autonomous]"
---

# Building an issue

Read the repository's CLAUDE.md and CONTRIBUTING.md first; they outrank this skill.

## Options

Pass `--draft` and `--autonomous`, e.g. `/github-sdlc:build 42 --draft`.

Ask only if the request does not say:

- **Draft**: open the pull request as a draft.
- **Autonomous**: no questions; stop only on the conditions under *Stop*.

## Steps

1. **Choose.** With no issue named, invoke [`pick-issue`](../pick-issue/SKILL.md).
2. **Check it is ready before claiming it.** Read the issue in full: criteria, Out of scope (a
   fence), and the UI/UX, Technical and Test Design.
   ```bash
   "${CLAUDE_PLUGIN_ROOT}/skills/issue/scripts/ready.sh" <n>
   ```
   Skip the script when the caller says `next.sh` just returned `take <n>`.
   On `not ready`, stop and report why. On `not in the pipeline`, ask whether to run the
   pipeline from [`issue`](../issue/SKILL.md) or build as written (write the approach, get
   approval, then build); in autonomous mode stop and report. Check every number or shape the
   issue states against the code.
3. **Claim** by creating the branch, which a second session cannot, or resume your own from a
   stopped run. Never use `gh issue develop`, which succeeds twice.
   See [`references/claim-and-worktree.md`](references/claim-and-worktree.md).
4. **Mark it In Progress** on the board ([`board.md`](../setup/references/board.md)), if configured.
5. **Follow the design.** The Technical Design is the plan; the Test Design lists the tests, by
   AC. An issue built as written follows the approach approved in step 2.
6. **Implement** the smallest change that meets the criteria, with its tests. Where the code
   makes the design wrong, depart from it and note each departure and why, for the pull
   request's Deviations. Never edit the issue. Update docs the change made stale in the same
   commit.
7. **Run the check command** and fix failures at the cause. Never push past a failure.
8. **Prose pass** with [`technical-writing`](../technical-writing/SKILL.md) over commit
   messages, comments and docs.
9. **Screenshots** if a user can see the change: [`screenshots`](../screenshots/SKILL.md).
10. **Commit and push**, one commit per concern, in the repository's commit style.
11. **Open the pull request** with [`open-pr`](../open-pr/SKILL.md).
12. **Hand off** to [`review-pr`](../review-pr/SKILL.md). Do not merge.

## Stop

Stop and report, never forcing, when the issue is held, an edit appears that this run did not
make (a second driver), the check fails twice for a reason you cannot fix, or the issue needs the
user's decision. A second bug found on the way becomes its own issue.

A stop keeps the claim: the branch, the assignment and the **In Progress** card stand, so the
issue stays yours ([`claim.md`](../issue/references/claim.md#release)). Close the worktree when
the run ends; push any commits first.

## Report

End with:

- the issue taken, or the reason none was
- the pull request number, or the condition that stopped the run before one opened
- the label left on it, and where its review pass ran (the `pr-auditor` agent, or not)
- what waits on the user: a held deviation, a declined `critical` or `warning`, a protected
  path, a second issue this run filed. Write "nothing" when there is none.
