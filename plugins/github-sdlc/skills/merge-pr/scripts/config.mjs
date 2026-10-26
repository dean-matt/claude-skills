/**
 * Reads the repository's optional `.claude/github-sdlc.json` and the facts every script
 * needs from GitHub, so no script hard-codes a branch name or a path.
 *
 * Keys read here: `protectedPaths` (globs), `checks` ("none" opts a repository out of
 * waiting on checks) and `versionBump` (see version-bump.mjs). Absent keys mean no fence, the
 * checks wait, and no bump.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { capture } from "./capture.mjs";

/** @returns {Record<string, any>} the parsed file, or `{}` where the repository has none */
export function readConfig(root = capture("git", ["rev-parse", "--show-toplevel"]).trim()) {
  const path = join(root, ".claude", "github-sdlc.json");
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`${path} is not valid JSON: ${error.message}`);
  }
}

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
