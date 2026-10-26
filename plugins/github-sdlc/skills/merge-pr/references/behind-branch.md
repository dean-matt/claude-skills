# Recovering a branch behind the default branch

Reached where the gate answers that the branch is behind. `$n` is the pull request number.
Branch protection that requires a head carrying the default branch's tip makes `gh pr merge`
refuse a pull request that sat while another merged.

## Update the branch on the server

```bash
gh api --method PUT "repos/{owner}/{repo}/pulls/$n/update-branch"
```

That merges the default branch in on the server and leaves every pushed commit alone; never
rebase or force push instead. A 422 exits non-zero with its reason on stderr.
`There are no new commits on the base branch` means the branch is already current, so carry on
to the wait. Any other 422 is a conflict the update left untouched: merge locally so it can be
resolved or handed over, as [`conflicts.md`](conflicts.md) says.

## Wait out the stale window

The call answers 202 and queues the merge. The local branch, whose tip `wait-checks` and the
gate judge, carries it only after a pull.

```bash
for _ in $(seq 8); do
  sleep 10
  gh pr view "$n" --json mergeable,mergeStateStatus \
    --jq 'select(.mergeable != "UNKNOWN" and .mergeStateStatus != "BEHIND")' | grep -q . &&
    { echo ready; break; }
done
```

Where a run ends without `ready`, read `gh pr view "$n" --json mergeStateStatus --jq .mergeStateStatus`
and reinvoke. Still `BEHIND` means the update never landed or the default branch moved again:
update again. Three reinvocations go to the user, carrying that reading.

## After every update

Run *Raise the version* again where the repository opted in: two pull requests raising the
version to the same number do not conflict, so a clean update can leave this branch at the
default branch's version with nothing raised. Then wait on the checks and run the gate again.
