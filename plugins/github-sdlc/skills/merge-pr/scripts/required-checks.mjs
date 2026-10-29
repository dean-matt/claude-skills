/**
 * The check names the default branch's rules require, and how a pull request's checks measure
 * against them. `merge-gate.mjs` and `wait-checks.mjs` both read this, so the ruleset stays
 * the only place a name is written down.
 *
 * The ruleset API lists rulesets only. A repository using classic branch protection shows no
 * required name here, so it is judged on the checks that have reported; a required check that
 * has not reported yet will not be waited on.
 *
 * A repository whose rules name no required check is judged on the checks that have
 * reported, so every one must be green; a head with none reported cannot be judged unless the
 * repository runs no checks at all, which the caller works out from its workflow files.
 */
import { capture } from "./capture.mjs";

export const GH_TIMEOUT_MS = 30 * 1000;
const OPTIONS = { timeout: GH_TIMEOUT_MS };

/**
 * Names the effective rules for `branch` require, as GitHub applies them.
 *
 * @param {string} branch
 * @param {(file: string, args: string[], options: { timeout: number }) => string} [run]
 */
export function expectedChecks(branch, run = capture) {
  const rules = JSON.parse(run("gh", ["api", `repos/{owner}/{repo}/rules/branches/${branch}`], OPTIONS));
  return rules
    .filter((r) => r.type === "required_status_checks")
    .flatMap((r) => r.parameters.required_status_checks.map((c) => c.context));
}

/**
 * The commit whose checks count: `sha` where the caller names one, else the tip of the local
 * branch `branch`, else that branch's tip on origin for a branch never checked out here.
 * Local branches are shared by every worktree, so the tip reads the same from the main
 * checkout as from the issue's. GitHub's own record of the head lags a push, and its checks
 * then describe the commit before, so that record is never the source.
 *
 * @param {string} branch the pull request's `headRefName`
 * @param {string | undefined} sha
 * @param {(file: string, args: string[], options?: object) => string} [run]
 */
export function headCommit(branch, sha, run = capture) {
  if (sha !== undefined) return sha;
  try {
    return run("git", ["rev-parse", "--verify", "--quiet", `refs/heads/${branch}`]).trim();
  } catch {
    const ref = run("git", ["ls-remote", "--exit-code", "origin", `refs/heads/${branch}`], OPTIONS);
    return ref.split("\t")[0];
  }
}

/**
 * Whether a diff changes one file's `"version"` line and nothing else.
 *
 * @param {string} diff `git diff -U0` output
 */
export function versionOnly(diff) {
  const files = diff.match(/^diff --git /gm) ?? [];
  const lines = diff.split("\n").filter((l) => /^[-+]/.test(l) && !/^(---|\+\+\+) /.test(l));
  return files.length === 1 && lines.length === 2 && lines.every((l) => /^[-+]\s*"version":/.test(l));
}

/**
 * The commit whose checks stand for `sha`. A version-only commit pushed with `[skip ci]` runs no
 * checks; its parent differs from it by the version line alone, so the parent's checks stand.
 * Anything else, or a failed read, is judged on its own checks.
 *
 * @param {string} sha
 * @param {(file: string, args: string[]) => string} [run]
 */
export function checkedCommit(sha, run = capture) {
  try {
    if (!run("git", ["log", "-1", "--format=%B", sha]).includes("[skip ci]")) return sha;
    if (!versionOnly(run("git", ["diff", "-U0", `${sha}^`, sha]))) return sha;
    return run("git", ["rev-parse", `${sha}^`]).trim();
  } catch {
    return sha;
  }
}

/**
 * The latest run of each check on `sha`. A required check posted as a commit status rather
 * than a check run reads as unreported, which waits rather than passes. A failed call, or one
 * past `GH_TIMEOUT_MS`, reads as nothing reported.
 *
 * @param {string} sha
 */
export function readChecks(sha, run = capture) {
  const path = `repos/{owner}/{repo}/commits/${sha}/check-runs?per_page=100`;
  try {
    const pages = JSON.parse(run("gh", ["api", "--paginate", "--slurp", path], OPTIONS));
    return pages.flatMap((p) => p.check_runs).map((c) => ({ name: c.name, bucket: bucket(c) }));
  } catch (error) {
    console.error(
      error.code === "ETIMEDOUT"
        ? `reading the checks on ${sha} timed out after ${GH_TIMEOUT_MS} ms`
        : `could not read the checks on ${sha}: ${error.message}`,
    );
    return [];
  }
}

const BUCKETS = {
  success: "pass",
  skipped: "skipping",
  neutral: "skipping",
  cancelled: "cancel",
  failure: "fail",
  timed_out: "fail",
  action_required: "fail",
  startup_failure: "fail",
};

function bucket({ status, conclusion }) {
  return status === "completed" ? (BUCKETS[conclusion] ?? "pending") : "pending";
}

export function missingChecks(expected, checks) {
  const seen = new Set(checks.map((c) => c.name));
  return expected.filter((name) => !seen.has(name));
}

/** A check that reported green, or that the workflow chose to skip. */
export function isGreen(check) {
  return check.bucket === "pass" || check.bucket === "skipping";
}
