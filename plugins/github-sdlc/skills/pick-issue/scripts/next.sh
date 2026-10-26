#!/usr/bin/env bash
# Check ranked candidates for readiness in parallel and name the first one worth taking.
#
#   next.sh [--design] <issue>...        or the numbers on stdin, one per line, in rank order
#
# Runs ready.sh on the candidates ten at a time and prints one line per candidate, in rank
# order: "<n>: ready", "<n>: needs design: <why>" (with --design) or "<n>: not ready: <why>".
# Stops after the first batch that holds a takeable issue, so a long backlog of blocked
# issues costs one batch per ten and a ready one near the top costs one. Ends with
# "take <n>", or "none". Without --design only a ready issue is takeable; with it, an issue
# that needs design is too. Needs `gh` and `jq`.
set -euo pipefail

flag=""
if [ "${1:-}" = --design ]; then flag=--design; shift; fi
here=$(cd "$(dirname "$0")" && pwd)
ready=${READY:-$here/../../issue/scripts/ready.sh}
repo=${REPO:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}

if [ $# -gt 0 ]; then candidates=("$@"); else candidates=(); while read -r c; do [ -n "$c" ] && candidates+=("$c"); done; fi

check() {
  out=$("$1" $2 "$4" "$5" 2>&1 | paste -sd'|' - | sed 's/|/; /g') || true
  printf '%s\t%s: %s\n' "$3" "$4" "${out:-no answer}"
}

batch=10
for ((i = 0; i < ${#candidates[@]}; i += batch)); do
  results=$(printf '%s\n' "${candidates[@]:i:batch}" | awk '{ print NR, $0 }' |
    xargs -P "$batch" -L1 bash -c "$(declare -f check); check \"\$@\"" _ "$ready" "$flag" |
    sort -n | cut -f2-)
  printf '%s\n' "$results"
  first=$(printf '%s\n' "$results" | awk -F': ' '$2 == "ready" || $2 ~ /^needs design/ { print $1; exit }')
  if [ -n "$first" ]; then echo "take $first"; exit 0; fi
done
echo none
