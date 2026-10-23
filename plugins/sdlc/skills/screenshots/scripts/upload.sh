#!/usr/bin/env bash
# Upload one image to GitHub's user-attachments store and print its URL.
#
#   upload.sh <file> [owner/repo]
#
# The endpoint is unofficial and undocumented, so it can change. The repo defaults to the
# current directory's. Needs `gh` (authenticated) and `jq`. Prints the URL to stdout; on any
# failure prints the raw response to stderr and exits non-zero.
set -euo pipefail

file=${1:?usage: upload.sh <file> [owner/repo]}
repo=${2:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}
name=$(basename "$file")

case "$(printf %s "$name" | tr "[:upper:]" "[:lower:]")" in
  *.png) mime=image/png ;;
  *.jpg | *.jpeg) mime=image/jpeg ;;
  *.gif) mime=image/gif ;;
  *.webp) mime=image/webp ;;
  *.mp4) mime=video/mp4 ;;
  *.mov) mime=video/quicktime ;;
  *) echo "unsupported file type: $name" >&2; exit 2 ;;
esac

repo_id=$(gh api "repos/$repo" --jq .id)
token=$(gh auth token)

body=$(curl -sS --fail-with-body -X POST \
  "https://uploads.github.com/user-attachments/assets?name=$(jq -rn --arg n "$name" '$n|@uri')&content_type=$mime&repository_id=$repo_id" \
  -H "Authorization: Bearer $token" -H "Accept: application/json" \
  --data-binary "@$file") || { printf '%s\n' "$body" >&2; exit 1; }

url=$(jq -r '[.. | strings | select(startswith("https://github.com/user-attachments/"))] | first // empty' <<<"$body")
[ -n "$url" ] || { printf 'no attachment URL in response: %s\n' "$body" >&2; exit 1; }
printf '%s\n' "$url"
