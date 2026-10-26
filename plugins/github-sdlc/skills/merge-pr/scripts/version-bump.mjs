/**
 * Raises a version at the merge, for a repository that opted in. A repository that did not has
 * no `versionBump` in `.claude/github-sdlc.json`, and this prints `no bump (not enabled)`.
 *
 *   "versionBump": { "file": "package.json", "feat": "minor", "other": "patch",
 *                    "skip": ["docs/**", "**\/*.md"] }
 *
 * A pull request that changes a path outside `skip` raises the version over the default
 * branch's once: a `feat` title raises what `feat` names, every other type what `other` names.
 * A version already above the default branch's is left as it is, so a rerun changes nothing.
 *
 * Run `node version-bump.mjs <pr>` in the branch's checkout. It edits `file` and prints the new
 * version; committing and pushing are the caller's. The file must be JSON whose first
 * `"version"` is top-level and reads MAJOR.MINOR.PATCH, and only that line is rewritten. A
 * `Cargo.toml` or `pyproject.toml` is the ceiling,
 * and parsing them is the way out.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { capture } from "./capture.mjs";
import { defaultBranch, matchesAny, readConfig } from "./config.mjs";

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;

export const DEFAULTS = {
  file: "package.json",
  feat: "minor",
  other: "patch",
  skip: ["docs/**", "**/*.md", "*.md"],
};

const raise = ([major, minor, patch], kind) =>
  kind === "major"
    ? `${major + 1}.0.0`
    : kind === "minor"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

/**
 * @param {{ changed: string[], title: string, version: string, base: string,
 *           rules?: Partial<typeof DEFAULTS> }} input
 * @returns {string | null} the version to write, or null when the version stands
 */
export function bumpedVersion({ changed, title, version, base, rules = {} }) {
  const r = { ...DEFAULTS, ...rules };
  const theirs = SEMVER.exec(base)?.slice(1).map(Number);
  if (theirs === undefined) throw new Error(`the default branch's version "${base}" is not MAJOR.MINOR.PATCH.`);
  if (!changed.some((p) => !matchesAny(r.skip, p))) return null;
  const ours = SEMVER.exec(version)?.slice(1).map(Number);
  if (ours !== undefined) {
    const differs = ours.findIndex((part, i) => part !== theirs[i]);
    if (differs !== -1 && ours[differs] > theirs[differs]) return null;
  }
  return raise(theirs, /^feat(\(.*\))?!?:/.test(title) ? r.feat : r.other);
}

if (process.argv[1] !== undefined && import.meta.filename === realpathSync(process.argv[1])) {
  const pr = process.argv[2];
  if (!/^\d+$/.test(pr ?? "")) {
    console.error("usage: node version-bump.mjs <pr>");
    process.exit(2);
  }
  const rules = readConfig().versionBump;
  if (rules === undefined) {
    console.log("no bump (not enabled)");
    process.exit(0);
  }
  const file = rules.file ?? DEFAULTS.file;
  const base = defaultBranch();
  const git = (...args) => capture("git", args).trim();
  git("fetch", "--quiet", "origin", base);
  const mergeBase = git("merge-base", `origin/${base}`, "HEAD");
  const changed = git("diff", "--name-only", mergeBase, "HEAD").split("\n").filter(Boolean);
  const title = capture("gh", ["pr", "view", pr, "--json", "title", "--jq", ".title"]).trim();
  const theirs = JSON.parse(git("show", `origin/${base}:${file}`)).version;
  const text = readFileSync(file, "utf8");
  const next = bumpedVersion({ changed, title, version: JSON.parse(text).version, base: theirs, rules });
  if (next === null) console.log("no bump");
  else {
    // Only the first `"version"` line changes, so the file's own formatting survives.
    writeFileSync(file, text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`));
    console.log(next);
  }
}
