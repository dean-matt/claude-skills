# Criteria, in `auto`

Step 2 sends an issue that `next.sh` calls `needs criteria` here, then returns to step 2b.

Dispatch a fresh subagent that runs [`issue`](../../issue/SKILL.md) in reshape and autonomous mode
on issue `<n>`. The issue is already claimed. Ask for each question it decided with its answer,
and each question it left for a person with a recommendation and alternatives. Running `auto`
authorizes writing criteria, never building an issue without them.

Then run `next.sh` for `<n>`. `ready` goes to step 2b.

Add `needs-user` to `<n>` before each `AskUserQuestion` below and remove it once the user answers
([`claim`](../../issue/references/claim.md#waiting-on-the-user)).

- **Questions for a person.** Ask them yourself in one `AskUserQuestion`, recommended answer first.
  Dispatch a fresh subagent with the issue and the user's answers, quoted as theirs; it records
  each as `Answered` and edits any criterion the answer changes. A yes to a split creates the new
  issues as [`issue`](../../issue/SKILL.md#splitting) says; this run carries on with `<n>`.

Stop when the user declines a question or chooses to stop (quote the question), or when `<n>` is
not `ready` afterwards (give the reason). A stop keeps the claim on `<n>`, as
[`claim`](../../issue/references/claim.md#release) says.
