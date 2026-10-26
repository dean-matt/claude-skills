# Discovering a repository

Every `github-sdlc` skill finds these facts itself and asks only when it cannot. `setup` records
an answer as a sentence in the repository's CLAUDE.md, never in a file only this plugin reads; a
statement there wins over discovery.

| Fact | Discover by | Fallback |
|---|---|---|
| Repository | `gh repo view --json nameWithOwner,defaultBranchRef` | ask |
| Default branch | the same call | `main` |
| Install command | lockfile: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`, `uv.lock`, `Cargo.lock`, `go.sum` | none |
| <a id="check-command"></a>Check command | the repository's CLAUDE.md or CONTRIBUTING.md, then a `check`, `ci` or `test` script in `package.json`, `Makefile` target, or CI workflow | ask |
| Project board and its Status options | [`board.md`](board.md) | skip board steps |
| Review labels | `gh label list` | create them (below) |
| Version bump | a sentence in the repository's CLAUDE.md or CONTRIBUTING.md saying the merge raises a version | off |
| Protected paths | `.github/protected-paths.txt` on the default branch | none |
| Runs checks | a workflow file under `.github/workflows/`, or a required check in the ruleset | no checks to wait on |
| Severity rule | a sentence in the repository's CLAUDE.md | `triage` asks |

State which source each fact came from, so a wrong guess is visible.

Labels the plugin owns are listed in [`labels.md`](labels.md).
