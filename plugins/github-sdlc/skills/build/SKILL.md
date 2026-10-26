---
name: build
description: Take one GitHub issue from open to a pull request ready for review — claim it, open an isolated worktree, plan if asked, implement, run the checks, take screenshots, commit, push and open the pull request. Use when asked to implement, build, fix or work an issue.
---

# Building an issue

Read the repository's CLAUDE.md and CONTRIBUTING.md first; they outrank this skill.

## Options

Ask which of these apply only when the request does not say:

- **Plan first**: write the approach (files, tests, risks), get approval, then build.
- **Draft**: open the pull request as a draft.
- **Autonomous**: no questions; stop only on the conditions under *Stop*.

## Steps

1. **Choose.** With no issue named, invoke [`pick-issue`](../pick-issue/SKILL.md).
2. **Claim.** Creating the branch is the claim: it derives from the issue, so a second
   session creating it is refused. Never use `gh issue develop`, which succeeds twice.
   Read [`references/claim-and-worktree.md`](references/claim-and-worktree.md).
3. **Read the issue in full**, acceptance criteria and any out-of-scope list. Out of scope is
   a fence. Check every number or shape it states against the code or data before designing.
4. **Mark it In Progress** on the board when one is configured, as
   [`../setup/references/board.md`](../setup/references/board.md) describes.
5. **Plan** if asked. Present it, then wait.
6. **Implement** at the smallest change that meets the criteria. Tests ride with the code.
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
