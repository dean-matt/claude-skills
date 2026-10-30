#!/usr/bin/env bash
# Check ranked candidates for readiness and name the first one worth taking.
#
#   next.sh [--criteria] <issue>...        or the numbers on stdin, one per line, in rank order
#
# Runs ready.sh four candidates at a time and prints a line per candidate, in rank order:
# "<n>: ready", "<n>: needs criteria: <why>" (--criteria only) or "<n>: not ready: <why>". Stops after
# the first batch holding a takeable issue and ends "take <n>" or "none". Takeable means ready,
# or with --criteria also needs criteria. Needs `gh` and `jq`.
set -euo pipefail

flag=""
if [ "${1:-}" = --criteria ]; then flag=--criteria; shift; fi
here=$(cd "$(dirname "$0")" && pwd)
ready=${READY:-$here/../../issue/scripts/ready.sh}
repo=${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}

if [ $# -gt 0 ]; then candidates=("$@"); else candidates=(); while read -r c; do [ -n "$c" ] && candidates+=("$c"); done; fi

check() {
  out=$("$1" $2 "$4" "$5" 2>&1 | paste -sd'|' - | sed 's/|/; /g') || true
  printf '%s\t%s: %s\n' "$3" "$4" "${out:-no answer}"
}

batch=4
for ((i = 0; i < ${#candidates[@]}; i += batch)); do
  results=$(printf '%s\n' "${candidates[@]:i:batch}" | awk '{ print NR, $0 }' |
    xargs -P "$batch" -L1 bash -c "$(declare -f check); check \"\$@\"" _ "$ready" "$flag" |
    sort -n | cut -f2-)
  printf '%s\n' "$results"
  first=$(printf '%s\n' "$results" | awk -F': ' '$2 == "ready" || $2 ~ /^needs criteria/ { print $1; exit }')
  if [ -n "$first" ]; then echo "take $first"; exit 0; fi
done
echo none
