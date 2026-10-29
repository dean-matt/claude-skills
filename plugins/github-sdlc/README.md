# github-sdlc

A software delivery workflow for any GitHub repository: set up a project, pick work, build it, open
a structured pull request with screenshots, review it and merge it.

## Goals

Every skill in this plugin serves these goals. Judge each change against them before adding it.

1. **Spend few tokens.** Use a script, not a model call, for anything deterministic. Read only what
   the step needs. Load a reference only when its branch runs. Pass subagents numbers and paths,
   not transcripts.
2. **Finish fast.** Cut wall-clock time from open issue to merged pull request. Cap review passes
   and loops. Wait on checks with a script, not by polling turns.
3. **Do work once.** Never repeat a check, a read or a review whose result has not changed. Run
   independent work in parallel.

Add a subagent dispatch, review pass or loop only where independence or correctness requires it,
such as review and the merge gate.

## Measuring a change

Run `/github-sdlc:auto --count 1` on a test repository before and after the change. Compare the
tokens spent and the wall-clock time for the issue.
