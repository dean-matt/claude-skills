---
name: review-pr
description: Review one pull request through engineering, testing, QA and editing lenses with a fresh reviewer, post the findings as one GitHub review, and label the pull request. Use when asked to review a pull request, after build opens one, or to re-review after changes.
argument-hint: "<pr-number>"
---

# Reviewing a pull request

The pull request number is the only input about the change. A reviewer who knows how it was
written reads intent into the diff, not the code.

## 1. Dispatch

Send the `github-sdlc:pr-auditor` agent this and nothing about the change:

```
Review pull request <n> with the github-sdlc:review-pr criteria and return findings in the
required format. Do not post, label, merge, edit a tracked file, commit or push.
```

Use a fresh agent for every pass. Two kinds:

- **Full** reads the whole diff, once, as the first pass. It is exhaustive: every lens on every
  changed file, since no later pass reads the diff again.
- **Verify** follows each round of fixes. Add the previous pass's findings and the range
  `<last pass commit>..<head>` to the prompt. It confirms each finding is fixed and flags what the
  fixes broke, and reads nothing else. A clean verify pass ends the review.

## 2. The reviewer's criteria

Read the diff from a detached worktree at the head, outside the repository, and the issue it
closes. Skip what the check command and formatters assert. Four lenses run on every pull request:

- **Engineer**: is it needed; does it exist already; the smallest change; right module; the
  root cause rather than the path the report named.
- **Tester**: non-trivial logic leaves a check that fails if it breaks; a test asserting the
  implementation back to itself counts as none.
- **QA**: acceptance criteria met, out of scope respected, edges exercised — empty, absent,
  zero, negative, concurrent; a visible change carries screenshots.
- **Editor**: the prose the change writes, through [`technical-writing`](../technical-writing/SKILL.md).

Read the pull request's **Deviations** first and judge each: justified, and the right kind? Then
check every acceptance criterion of the closing issue against the diff. The body does not list
them, so a criterion nothing in the diff meets is yours to find.

Add lenses the repository's CLAUDE.md names (security, accessibility, a domain's rules) where the
diff reaches them. A red CI check is a finding.

## 3. Finding format

Every finding is an inline comment on a line the diff changed, so it opens a thread that is
resolved when the fix lands. Give the reviewer `path:line` for each; a finding about the whole
change (a missing test, a Deviations entry) goes on the nearest changed line of the file it
concerns. The body holds a one-line summary and no finding. Open with the severity in bold, then
the defect and its cost:

```
**high** — the retry loop never backs off; a failing upstream gets hammered at full rate.
```

| Severity | Means | Blocks |
|---|---|---|
| `critical` | Wrong in the main path, loses data, opens a security hole, or an acceptance criterion the change does not meet | Yes |
| `high` | Wrong in an edge path, misleading about what the code does, breaks a rule a check enforces, or a departure from the issue that Deviations does not record | Yes |
| `medium` | A changed behavior with no test, duplicated code, or a stated repository rule no check enforces | Yes |
| `low` | Naming or a small clarity issue | No |
| `info` | A note or taste call, reported once | No |

The levels are the plugin's [scale](../setup/references/severity.md); this table applies it to a pass.

Calibrate: a blocking finding names the bug, rule, criterion or test it concerns; a finding that
cannot is `low` or `info`. Report a defect once, with every place it occurs: one finding on the
first line, naming the others ("the inputs at X, Y and Z have no error"). Skip one an earlier pass
raised and a reply answered, and in a verify pass raise nothing in code the fixes did not touch.

A **Narrowing** or **Addition** deviation is a `high` stating it needs the user's confirmation.
A note on a decision worth a reader's attention is an `info` on the line.

Write `**critical**`, never `` `critical` ``: the merge gate parses the marker.

## 4. Post

Post one review per pass, before applying anything. The body starts with `<!-- audit-pass -->`
(invisible; it tells a pass from a person's review). A verify pass opens with
`<!-- audit-verify -->` instead; the gate does not count it against the cap and never reads it as
the last word.

Use `event: REQUEST_CHANGES` while the pass has a `critical`, `high` or `medium`, else `COMMENT`. GitHub
refuses both an approval and a change request on your own pull request: where the post fails for
that reason, repost the same pass as `COMMENT`, which the label and the gate treat alike. A pass
with no findings still posts its marked body.

Run the pass through the check first; a posted review cannot be edited to fix a finding the merge
gate cannot read:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/merge-pr/scripts/check-pass.mjs" pass.json
gh api 'repos/{owner}/{repo}/pulls/<n>/reviews' --input pass.json
```

On exit 1, fix the faults it names and do not post.

`pass.json` holds `commit_id`, `event`, `body` and each line comment as
`{path, line, side, body}`.

## 5. Label and hand off

Label after every pass, full or verify; this skill owns the `ai-review:` label.

- **A `critical`, `high` or `medium` stands:** set `ai-review:changes-requested`, then run
  [`address-feedback`](../address-feedback/SKILL.md), which fixes, replies and loops back here
  for a verify pass, three at most.
- **Nothing blocking:** set `ai-review:completed` once the check command is green and nothing
  waits on the user. Its `low` and `info` findings stand as advice and need no reply. Before
  labelling, dismiss each earlier review still in `CHANGES_REQUESTED`, since only a later approval
  or a dismissal clears it:

  ```bash
  gh api -X PUT repos/{owner}/{repo}/pulls/<n>/reviews/<id>/dismissals -f message='Addressed and verified'
  gh pr edit <n> --add-label ai-review:completed --remove-label ai-review:changes-requested
  ```

  What waits on the user, and leaves `ai-review:changes-requested` in place: a declined
  `critical`, `high` or `medium`; a point a pass asked the user to confirm; a **Narrowing** or
  **Addition** deviation the user has not confirmed; a second bug filed as its own issue. The
  user clears each in conversation, with the record
  [`records.md`](../merge-pr/references/records.md) gives.

This skill never merges.
