/**
 * Raises a version at the merge. The caller runs this only where the repository says the merge
 * raises one (its CLAUDE.md or CONTRIBUTING.md), so nothing here asks whether to.
 *
 *   node version-bump.mjs <pr> [--file package.json] [--feat minor] [--other patch] [--skip <glob>]...
 *
 * The defaults are the usual convention: a `feat` title raises the minor and every other type
 * the patch, over the default branch's version, once; a pull request changing only docs and
 * Markdown leaves it alone; a version already above the default branch's is left as it is, so
 * a rerun changes nothing; and a pull request a bot opened is skipped. Each flag overrides one
 * default for a repository with unusual rules, and `--skip` repeats.
 *
 * Run it in the branch's checkout. It edits `--file` and prints the new version; committing and
 * pushing are the caller's. The file must be JSON whose first `"version"` is top-level and reads
 * MAJOR.MINOR.PATCH, and only that line is rewritten. A `Cargo.toml` or `pyproject.toml` is the
 * ceiling, and parsing them is the way out.
 */
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import { capture } from "./capture.mjs";
import { parseArgs } from "node:util";
import { defaultBranch, matchesAny } from "./repo.mjs";

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

/**
 * A pull request a bot opened carries no change of the maintainers' own to version.
 *
 * @param {{ login?: string, is_bot?: boolean } | undefined} author
 */
export function isBot(author) {
  return author?.is_bot === true || /\[bot\]$|^app\//.test(author?.login ?? "");
}

if (process.argv[1] !== undefined && import.meta.filename === realpathSync(process.argv[1])) {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      file: { type: "string" },
      feat: { type: "string" },
      other: { type: "string" },
      skip: { type: "string", multiple: true },
    },
  });
  const pr = positionals[0];
  if (!/^\d+$/.test(pr ?? "")) {
    console.error("usage: node version-bump.mjs <pr> [--file f] [--feat kind] [--other kind] [--skip glob]...");
    process.exit(2);
  }
  const rules = Object.fromEntries(Object.entries(values).filter(([, v]) => v !== undefined));
  const file = rules.file ?? DEFAULTS.file;
  const meta = JSON.parse(capture("gh", ["pr", "view", pr, "--json", "title,author"]));
  if (isBot(meta.author)) {
    console.log("no bump (opened by a bot)");
    process.exit(0);
  }
  const base = defaultBranch();
  const git = (...args) => capture("git", args).trim();
  git("fetch", "--quiet", "origin", base);
  const mergeBase = git("merge-base", `origin/${base}`, "HEAD");
  const changed = git("diff", "--name-only", mergeBase, "HEAD").split("\n").filter(Boolean);
  const theirs = JSON.parse(git("show", `origin/${base}:${file}`)).version;
  const text = readFileSync(file, "utf8");
  const next = bumpedVersion({ changed, title: meta.title, version: JSON.parse(text).version, base: theirs, rules });
  if (next === null) console.log("no bump");
  else {
    // Only the first `"version"` line changes, so the file's own formatting survives.
    writeFileSync(file, text.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`));
    console.log(next);
  }
}
