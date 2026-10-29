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

Set `ai-review:changes-requested` while a `critical`, `high` or `medium` stands. Then run
[`address-feedback`](../address-feedback/SKILL.md), which loops back here: verify passes until
one returns nothing blocking, three at most. It sets `ai-review:completed` once that pass is
clean. A first pass with nothing blocking sets `ai-review:completed`
itself; its `low` and `info` findings stand as advice and need no reply. This skill never merges.
