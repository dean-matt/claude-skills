/**
 * Facts about the repository that every script needs, read from GitHub and git rather than
 * from a file the plugin owns: the default branch, the protected paths, and whether the
 * repository runs any checks at all.
 */
import { capture } from "./capture.mjs";

/** The repository's default branch, as GitHub names it. */
export function defaultBranch() {
  return capture("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"]).trim();
}

/**
 * A glob as a regular expression over a repository-relative path. `**` crosses directories,
 * `*` stays within one, and a pattern ending in `/` matches everything beneath it.
 *
 * @param {string} glob
 */
export function globToRegex(glob) {
  const body = (glob.endsWith("/") ? `${glob}**` : glob)
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, "\u0000")
    .replace(/\*/g, "[^/]*")
    .replaceAll("\u0000", ".*");
  return new RegExp(`^${body}$`);
}

/** @param {string[]} globs */
export function matchesAny(globs, path) {
  return globs.some((g) => globToRegex(g).test(path));
}

/** Where a repository lists the paths whose changes need its owner's sign-off. */
export const PROTECTED_FILE = ".github/protected-paths.txt";

/** One glob per line; a blank line and a `#` comment are ignored. */
export function parseList(text) {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l !== "" && !l.startsWith("#"));
}

/**
 * The paths the default branch protects, read from the default branch's copy of the list and
 * never the pull request's, so a pull request cannot widen or empty the list it is judged
 * against. The list protects itself: an edit to it needs the same sign-off. A repository with
 * no list has no fence.
 *
 * @param {string} base the default branch
 * @param {(file: string, args: string[]) => string} [run]
 * @returns {string[]}
 */
export function protectedPaths(base, run = capture) {
  let text;
  try {
    text = run("git", ["show", `origin/${base}:${PROTECTED_FILE}`]);
  } catch {
    return [];
  }
  return [...parseList(text), PROTECTED_FILE];
}

/**
 * Whether the repository runs checks at all: any workflow file in the tree at `ref`. With
 * none, and no required check, there is nothing for a head to report and nothing to wait on.
 *
 * @param {string} ref a commit or branch
 * @param {(file: string, args: string[]) => string} [run]
 */
export function hasWorkflows(ref, run = capture) {
  try {
    return run("git", ["ls-tree", "-r", "--name-only", ref, ".github/workflows/"]).trim() !== "";
  } catch {
    return false;
  }
}
