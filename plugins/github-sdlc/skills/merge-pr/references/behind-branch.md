# Recovering a branch behind the default branch

For a branch the gate reports behind. `$n` is the pull request number. Branch protection that
requires the default branch's tip makes `gh pr merge` refuse a pull request that sat while
another merged.

## Update the branch on the server

```bash
gh api --method PUT "repos/{owner}/{repo}/pulls/$n/update-branch"
```

This merges the default branch in on the server and keeps every pushed commit; never rebase or
force push instead. A 422 exits non-zero with its reason on stderr:

- `There are no new commits on the base branch`: already current; go to the wait.
- Any other 422: a conflict. Merge locally to resolve or hand over
  ([`conflicts.md`](conflicts.md)).

## Wait out the stale window

The call answers 202 and queues the merge. The local branch, whose tip `wait-checks` and the gate
judge, carries it only after a pull.

```bash
for _ in $(seq 8); do
  sleep 10
  gh pr view "$n" --json mergeable,mergeStateStatus \
    --jq 'select(.mergeable != "UNKNOWN" and .mergeStateStatus != "BEHIND")' | grep -q . &&
    { echo ready; break; }
done
```

If the loop ends without `ready`, read `gh pr view "$n" --json mergeStateStatus --jq
.mergeStateStatus` and rerun it. Still `BEHIND`: the update never landed or the default branch
moved; update again. After three reruns, hand back to the user with that reading.

## After every update

Run *Raise the version* again where the repository opted in: two pull requests raising the
version to the same number do not conflict, so a clean update can leave nothing raised. Then wait
on the checks and run the gate again.
