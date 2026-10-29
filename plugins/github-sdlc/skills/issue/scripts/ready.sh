#!/usr/bin/env bash
# Decide whether an issue is ready to build, from its body and native relationships.
#
#   ready.sh [--criteria] <issue> [owner/repo]
#
# Prints "ready" and exits 0; or one "not ready: <reason>" line per failure and exits 1. An issue
# that passes every other check but has no acceptance criteria prints "no acceptance criteria" and
# exits 2, so a caller can offer to write them or build from the issue as written.
#
# With --criteria, an issue that passes the other checks but has no criteria or an unticked Open
# question prints "needs criteria: <why>" and exits 3: it is `issue`'s to finish, not the build's.
# Every other failure still prints "not ready", exit 1. Needs `gh` and `jq`.
set -euo pipefail

criteria=0
if [ "${1:-}" = --criteria ]; then criteria=1; shift; fi
n=${1:?usage: ready.sh [--criteria] <issue> [owner/repo]}
repo=${2:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}

issue=$(gh api "repos/$repo/issues/$n")
body=$(jq -r '.body // ""' <<<"$issue")

fail=0
no() { echo "not ready: $1"; fail=1; }
gaps=""
gap() { gaps="${gaps:+$gaps; }$1"; }

# `grep -c` reads all its input. `grep -q` exits at its first match, and under pipefail the
# `printf` feeding it then dies of SIGPIPE on a large body, which reads as "no match".
has_criteria=$([ "$(printf '%s\n' "$body" | grep -c 'AC1\b')" -gt 0 ] && echo 1 || echo 0)

open_questions=$(printf '%s\n' "$body" | awk '
  /^## |<summary><h2>/{inq = ($0 == "## Open questions"); next}
  inq && /^- \[ \]/{n++}
  END{print n+0}')
if [ "$open_questions" -ne 0 ]; then
  # `issue` decides an open question in autonomous mode, so --criteria hands it on.
  if [ "$criteria" -eq 1 ]; then gap "$open_questions open question(s) unticked"
  else no "$open_questions open question(s) unticked"; fi
fi

# A section is wrapped in <details open>. A wrapper left unclosed folds the rest of the issue into
# it, so unequal counts of opening and closing tags is a failure whichever section lost its tag.
opened=$(printf '%s\n' "$body" | grep -c '^[[:space:]]*<details' || true)
closed=$(printf '%s\n' "$body" | grep -c '^[[:space:]]*</details>' || true)
[ "$opened" -eq "$closed" ] || no "$opened <details> opened and $closed closed; a section wrapper is broken"

blockers=$(gh api "repos/$repo/issues/$n/dependencies/blocked_by" --jq '[.[] | select(.state=="open") | .number] | map("#"+tostring) | join(", ")')
[ -z "$blockers" ] || no "blocked by $blockers"

children=$(gh api "repos/$repo/issues/$n/sub_issues" --jq '[.[] | select(.state=="open")] | length')
[ "$children" -eq 0 ] || no "a parent with $children open sub-issue(s); take a child"

[ "$(jq -r .state <<<"$issue")" = open ] || no "the issue is closed"

[ "$has_criteria" -eq 1 ] || gap "no acceptance criteria"

if [ "$criteria" -eq 1 ]; then
  [ "$fail" -eq 0 ] || exit 1
  if [ -n "$gaps" ]; then echo "needs criteria: $gaps"; exit 3; fi
  echo ready
  exit 0
fi

[ "$fail" -eq 0 ] || exit 1
if [ -n "$gaps" ]; then echo "$gaps"; exit 2; fi
echo ready
