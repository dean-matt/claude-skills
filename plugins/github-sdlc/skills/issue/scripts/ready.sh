#!/usr/bin/env bash
# Decide whether an issue is ready to build, from its labels, body and native relationships.
#
#   ready.sh <issue> [owner/repo]
#
# Prints "ready" and exits 0; or one "not ready: <reason>" line per failure and exits 1.
# Blockers, sub-issues, open questions and state are checked for every issue. The stage labels
# are checked only for an issue in the pipeline, meaning one carrying a *-agent: label. An issue
# that passes the first checks but is not in the pipeline prints "not in the pipeline" and
# exits 2, so a caller can offer to run the pipeline or build from the issue as written.
# Needs `gh` and `jq`.
set -euo pipefail

n=${1:?usage: ready.sh <issue> [owner/repo]}
repo=${2:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}

issue=$(gh api "repos/$repo/issues/$n")
labels=$(jq -r '[.labels[].name] | join("\n")' <<<"$issue")
body=$(jq -r '.body // ""' <<<"$issue")

# `grep -c` reads all its input. `grep -q` exits at its first match, and under pipefail the
# `printf` feeding it then dies of SIGPIPE on a large body, which reads as "no match".
has() { [ "$(printf '%s\n' "$labels" | grep -cxF -- "$1")" -gt 0 ]; }
body_has() { [ "$(printf '%s\n' "$body" | grep -c -- "$1")" -gt 0 ]; }

pipeline=0
[ "$(printf '%s\n' "$labels" | grep -c -- '-agent:')" -gt 0 ] && pipeline=1

fail=0
no() { echo "not ready: $1"; fail=1; }

type=$(printf '%s\n' "$labels" | awk -F: '$1 == "type" && t == "" { t = $2 } END { print t }')

if [ "$pipeline" -eq 1 ]; then
  stages="criteria"
  if [ "$type" != spike ]; then
    body_has '^## UI/UX Design' && stages="$stages ui"
    stages="$stages technical test"
  fi
  for s in $stages; do
    has "$s-agent:changes-requested" && no "$s review has findings to address"
    has "$s-agent:review-passed" || no "$s has not passed review"
  done
fi

open_questions=$(printf '%s\n' "$body" | awk '
  /^## /{inq = ($0 == "## Open questions"); next}
  inq && /^- \[ \]/{n++}
  END{print n+0}')
[ "$open_questions" -eq 0 ] || no "$open_questions open question(s) unticked"

blockers=$(gh api "repos/$repo/issues/$n/dependencies/blocked_by" --jq '[.[] | select(.state=="open") | .number] | map("#"+tostring) | join(", ")')
[ -z "$blockers" ] || no "blocked by $blockers"

children=$(gh api "repos/$repo/issues/$n/sub_issues" --jq '[.[] | select(.state=="open")] | length')
[ "$children" -eq 0 ] || no "a parent with $children open sub-issue(s); take a child"

[ "$(jq -r .state <<<"$issue")" = open ] || no "the issue is closed"

[ "$fail" -eq 0 ] || exit 1
if [ "$pipeline" -eq 0 ]; then echo "not in the pipeline"; exit 2; fi
echo ready
