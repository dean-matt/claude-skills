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

Use a fresh agent for every pass.

## 2. The reviewer's criteria

Read the diff from a detached worktree at the head, outside the repository, and the issue it
closes. Skip what the check command and formatters assert. Four lenses run on every pull request:

- **Engineer**: is it needed; does it exist already; the smallest change; right module; the
  root cause rather than the path the report named.
- **Tester**: non-trivial logic leaves a check that fails if it breaks; a test asserting the
  implementation back to itself counts as none.
- **QA**: acceptance criteria met, out of scope respected, edges exercised — empty, absent,
  zero, negative, concurrent.
- **Editor**: the prose the change writes, through [`technical-writing`](../technical-writing/SKILL.md).

Read the pull request's **Deviations** first and judge each: justified, and the right kind? Then
check every acceptance criterion of the closing issue against the diff. The body does not list
them, so a criterion nothing in the diff meets is yours to find.

Add lenses the repository's CLAUDE.md names (security, accessibility, a domain's rules) where the
diff reaches them. A red CI check is a finding.

## 3. Finding format

Open with the severity in bold, then the defect and its cost:

```
**warning** — the retry loop never backs off; a failing upstream gets hammered at full rate.
```

| Severity | Means |
|---|---|
| `critical` | Wrong at runtime, misleading about what the code does, or an acceptance criterion the change does not meet |
| `warning` | Contradicts the repository's stated rules, or a departure from the issue that Deviations does not record |
| `comment` | A taste call, reported once |

A **Narrowing** or **Addition** deviation is a `warning` stating it needs the user's confirmation.
A note on a decision worth a reader's attention is a `comment` on the line, never body text.

Write `**critical**`, never `` `critical` ``: the merge gate parses the marker.

## 4. Post

Post one review per pass, before applying anything. The body starts with `<!-- audit-pass -->`
(invisible; it tells a pass from a person's review). Use `event: COMMENT`; GitHub refuses an
approval on your own pull request. A pass with no findings still posts its marked body.

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

Set `ai-review:changes-requested` while findings stand. Then run
[`address-feedback`](../address-feedback/SKILL.md), which loops back here until a pass returns
nothing blocking and sets `ai-review:completed`. This skill never merges.
