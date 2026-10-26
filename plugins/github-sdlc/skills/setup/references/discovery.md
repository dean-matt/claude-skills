# Discovering a repository

Every `github-sdlc` skill finds these facts itself and asks only when it cannot. `setup` records
the answers in `.claude/github-sdlc.json`; when that file exists, its values win over discovery.

| Fact | Discover by | Fallback |
|---|---|---|
| Repository | `gh repo view --json nameWithOwner,defaultBranchRef` | ask |
| Default branch | the same call | `main` |
| Install command | lockfile: `pnpm-lock.yaml`, `package-lock.json`, `yarn.lock`, `bun.lock`, `uv.lock`, `Cargo.lock`, `go.sum` | none |
| <a id="check-command"></a>Check command | the repository's CLAUDE.md or CONTRIBUTING.md, then a `check`, `ci` or `test` script in `package.json`, `Makefile` target, or CI workflow | ask |
| Project board and its Status options | [`board.md`](board.md) | skip board steps |
| Review labels | `gh label list` | create them (below) |
| Version bump | `.claude/github-sdlc.json` `versionBump` | off |
| Protected paths | `.claude/github-sdlc.json` `protectedPaths` | none |

State which source each fact came from, so a wrong guess is visible.

Labels the plugin owns are listed in [`labels.md`](labels.md).

## `.claude/github-sdlc.json`

Optional. Every key is optional.

```json
{
  "checkCommand": "pnpm check",
  "installCommand": "pnpm install --frozen-lockfile",
  "board": { "owner": "dean-matt", "number": 1 },
  "versionBump": { "file": "package.json", "feat": "minor", "other": "patch", "skip": ["docs/**", "**/*.md"] },
  "protectedPaths": ["docs/mockup/components/"],
  "severity": { "critical": "Losing a character, or a wrong 5e result in play" }
}
```
