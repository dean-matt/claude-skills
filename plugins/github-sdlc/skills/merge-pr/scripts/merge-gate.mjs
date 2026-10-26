/**
 * The eight conditions that decide whether a pull request is fit to land.
 *
 * `merge-pr` runs this and stops where it exits non-zero, handing the user the condition it
 * named. Every decision is a pure function over the shapes GitHub returns, which is what lets
 * `merge-gate.test.mjs` call them on payloads copied from real reviews.
 *
 * Input: a pull request number, then optionally the full SHA whose checks count; without one
 * the checks are those of the commit `headCommit` names. Running the file gathers the inputs
 * with `gh` and `git`, prints a line per condition, and exits 1 where any blocks.
 */
import { realpathSync } from "node:fs";
import { capture } from "./capture.mjs";
import { defaultBranch, hasWorkflows, matchesAny, protectedPaths } from "./repo.mjs";
import {
  expectedChecks,
  headCommit,
  isGreen,
  missingChecks,
  readChecks,
} from "./required-checks.mjs";

/**
 * The severity marker `review-pr` writes at the head of a posted finding. A body this cannot
 * read is `unreadable`, which blocks: a finding the gate cannot classify is the one it must
 * not wave through.
 */
const MARKER = /^\*\*(critical|warning|comment)\*\*/;

export function severity(body) {
  return MARKER.exec(body ?? "")?.[1] ?? "unreadable";
}

export function notGreen(checks) {
  return checks.filter((c) => !isGreen(c)).map((c) => c.name);
}

/**
 * A required check that has not reported blocks like a red one: a head too new to judge has
 * not passed. With no required name the reported checks stand in, and a head with none
 * reported blocks, unless the repository runs no checks at all (`noCi`).
 *
 * @param {{ name: string, bucket: string }[]} checks
 * @param {string[]} expected
 * @param {boolean} noCi no required check and no workflow file: nothing can report
 */
export function checksBlocked(checks, expected, noCi = false) {
  if (noCi) return null;
  if (checks.length === 0) return "no check has reported on this head yet";
  const missing = missingChecks(expected, checks).map((name) => `${name} (not reported)`);
  const blocked = [...notGreen(checks), ...missing];
  return blocked.length === 0 ? null : blocked.join(", ");
}

/**
 * GitHub merges the head it shows, so a judged commit it does not show yet is not the one
 * that would land: the push is still propagating, or the local branch and origin differ.
 */
export function headBlocked(shown, sha) {
  return shown === sha
    ? null
    : `GitHub shows ${shown} as the head, not ${sha} — wait for the push to show, or bring the local branch level with origin`;
}

/** The line `review-pr` opens a pass body with. It renders as nothing on GitHub. */
export const PASS_MARKER = "<!-- audit-pass -->";

/**
 * The review passes, oldest first. A pass carries `PASS_MARKER`; verdict replies land as
 * reviews with no body, and a person's review carries neither, so neither spends one of
 * `PASS_CAP` nor stands in as the last pass whose findings this reads.
 *
 * Where no review carries the marker the bodied ones are the passes, which is how a pull
 * request reviewed before the marker existed still reaches the gate.
 */
export function passes(reviews) {
  const bodied = reviews.filter((r) => r.body !== "");
  const marked = bodied.filter((r) => r.body.includes(PASS_MARKER));
  return marked.length === 0 ? bodied : marked;
}

export function blockingFindings(comments) {
  return comments.filter((c) => severity(c.body) !== "comment").map((c) => c.html_url);
}

/**
 * The passes a run spends before this condition stops asking for a clean one.
 * `address-feedback` loops against this number rather than carrying one of its own.
 */
export const PASS_CAP = 3;

const plural = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/**
 * Where the last pass sits against the tip, printed beside "the review converged". No
 * condition reads it, because what a later commit means is a judgment: the fix answering that
 * pass, or code nobody has read. The range it names lets a reader weigh the commits.
 *
 * @param {string | null} sha
 * @param {string} head
 * @param {number | null} behind
 * @param {string} base the default branch
 */
export function staleNote(sha, head, behind, base) {
  if (sha === null) return null;
  const short = sha.slice(0, 8);
  if (behind === null) return `the last pass read ${short}, which is not on this branch`;
  if (behind === 0) return `the last pass read ${short}, the tip of this branch`;
  return `the last pass read ${short}, with ${plural(behind, "commit")} of this branch's own since — git log ${short}..${head.slice(0, 8)} ^origin/${base}`;
}

/**
 * The pass that reads a fix is what answers the finding, so this wants a last pass whose
 * findings are all `comment`. A pass that found nothing satisfies it by posting a body and no
 * comments. At `PASS_CAP` it stops asking: the thread verdicts already hold the fix, and
 * demanding a pass the run may not take leaves a hand merge as the only way out.
 */
export function reviewBlocked(reviews, findings) {
  const count = passes(reviews).length;
  if (count === 0) return "no review pass found — nothing has reviewed this";
  const blocking = blockingFindings(findings);
  if (blocking.length === 0 || count >= PASS_CAP) return null;
  return [`pass ${count} of ${PASS_CAP} returned a blocking finding — review again`, ...blocking].join(
    "\n      ",
  );
}

/**
 * What the cap did, printed beside the condition. At the cap it names the waiver, since a
 * condition that stops asking in silence is one nobody audits. Past the cap it names the
 * overage rather than blocking: a submitted review cannot be withdrawn and any bodied one
 * counts, a person's "LGTM" included, so a block there is one nothing clears.
 */
export function capNote(reviews, findings) {
  const count = passes(reviews).length;
  if (count > PASS_CAP)
    return `${count} passes, past the cap of ${PASS_CAP} — read the extra passes before merging`;
  if (count === PASS_CAP && blockingFindings(findings).length > 0)
    return `the cap of ${PASS_CAP} passes stopped this condition asking — the thread verdicts carry what it found`;
  return null;
}

export const LABEL_DONE = "ai-review:completed";

/**
 * The review label must read exactly `ai-review:completed`. Any other `ai-review:` label
 * means a pass left something for the user.
 *
 * @param {string[]} labels
 */
export function labelBlocked(labels) {
  const review = labels.filter((l) => l.startsWith("ai-review:"));
  if (review.length === 1 && review[0] === LABEL_DONE) return null;
  return review.length === 0
    ? `no ${LABEL_DONE} label — the review has not finished`
    : `labelled ${review.join(", ")}, which waits on the user`;
}

const VERDICT = /^\*\*(Applied|Declined)\*\*/;

/**
 * The API omits `in_reply_to_id` on a top-level comment rather than sending null, so a
 * strict comparison against null matches nothing and the condition passes everything.
 */
const isFinding = (c) => c.in_reply_to_id === undefined || c.in_reply_to_id === null;

export function unanswered(comments) {
  const answered = new Set(
    comments.filter((c) => VERDICT.test(c.body)).map((c) => String(c.in_reply_to_id)),
  );
  return comments.filter((c) => isFinding(c) && !answered.has(String(c.id))).map((c) => c.html_url);
}

const DECLINED = /^\*\*Declined\*\*/;
const ACCEPTED = /^\*\*Accepted\*\*/;

/**
 * GitHub records who posted a comment, so the login checked is the comment's own and not a
 * name written into its body. Every agent a session drives runs as that session's account, so
 * a signer's record proves the account, not who is at the keyboard; `signoff` is the only
 * sanctioned writer.
 *
 * @param {{ body?: string, user?: { login: string } }} c
 * @param {string[]} who the signers
 */
const isAccepted = (c, who) => ACCEPTED.test(c.body ?? "") && who.includes(c.user?.login ?? "");

/**
 * A declined `comment` is a taste call refused and ends a healthy review; anything else is a
 * judgment the user has not seen — unless a signer's `**Accepted**` reply in the same thread
 * records that they have.
 */
export function blockingDeclines(comments, who) {
  const findings = new Map(comments.map((c) => [String(c.id), c.body]));
  const accepted = new Set(
    comments.filter((c) => isAccepted(c, who)).map((c) => String(c.in_reply_to_id)),
  );
  return comments
    .filter((c) => DECLINED.test(c.body))
    .filter((c) => severity(findings.get(String(c.in_reply_to_id))) !== "comment")
    .filter((c) => !accepted.has(String(c.in_reply_to_id)))
    .map((c) => c.html_url);
}

const BODY_DECLINED = /^\*\*Declined\*\* (critical|warning)\b/;

/**
 * A finding the pass could not anchor to a line has no thread, so its verdict is a plain pull
 * request comment opening `**Declined** critical` or `**Declined** warning`, and a signer's
 * `**Accepted**` is a later plain comment. GitHub gives such comments no reply link, so an
 * acceptance clears every body decline posted before it, never one posted after.
 * `comments` must run oldest first, as the API returns them.
 */
export function blockingBodyDeclines(comments, who) {
  let pending = [];
  for (const c of comments) {
    if (BODY_DECLINED.test(c.body ?? "")) pending.push(c.html_url);
    else if (isAccepted(c, who)) pending = [];
  }
  return pending;
}

/**
 * A signer's record tied to the head it read: a comment opening `<opener> <head sha>` posted
 * after the head commit. The sha rules out a record for another head and the timestamp one
 * dated before this head's commit, so a push after the record needs a new one.
 */
function records(opener, head, headDate, comments, who) {
  const pattern = new RegExp(`^\\*\\*${opener}\\*\\* ([0-9a-f]{7,40})\\b`);
  return comments.filter((c) => {
    const sha = pattern.exec(c.body ?? "")?.[1];
    return (
      sha !== undefined &&
      head.startsWith(sha) &&
      who.includes(c.user?.login ?? "") &&
      Date.parse(c.created_at ?? "") > Date.parse(headDate)
    );
  });
}

/**
 * The protected paths no signer has cleared. A signer clears them with a pull request comment
 * opening `**Accepted protected** <head sha> —` and naming each path. A path counts as named
 * only as a whole token, so `packages/web/package.json` never names the root one.
 *
 * @param {string[]} paths
 * @param {string} head
 * @param {string} headDate ISO date of the head commit
 * @param {{ body?: string, created_at?: string, user?: { login: string } }[]} comments
 * @param {string[]} who the signers
 */
export function unsignedPaths(paths, head, headDate, comments, who) {
  const named = new Set(
    records("Accepted protected", head, headDate, comments, who).flatMap((c) =>
      (c.body ?? "").split(/[\s,:]+/).map((t) => t.replace(/^`|`$/g, "")),
    ),
  );
  return paths.filter((p) => !named.has(p));
}

const DEVIATION = /^[-*]\s+\*\*(Narrowing|Addition)\b/i;

/**
 * The Narrowing and Addition lines of a pull request body's Deviations section. Each changes
 * what the issue agreed, so each waits on the user.
 */
export function heldDeviations(body) {
  const lines = (body ?? "").split("\n");
  const start = lines.findIndex((l) => /^##\s+Deviations\s*$/.test(l));
  if (start === -1) return [];
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((l) => /^##\s/.test(l));
  return (end === -1 ? rest : rest.slice(0, end)).filter((l) => DEVIATION.test(l));
}

/**
 * The held deviations no signer has confirmed. A signer confirms with a pull request comment
 * opening `**Confirmed** <head sha> —`, which covers every held deviation at that head.
 */
export function unconfirmedDeviations(body, head, headDate, comments, who) {
  const held = heldDeviations(body);
  if (held.length === 0) return [];
  return records("Confirmed", head, headDate, comments, who).length > 0 ? [] : held;
}

/**
 * A non-null return blocks the merge and is the sentence the user reads, so a branch that is
 * only behind takes its own: `merge-pr` recovers that one by updating from the default
 * branch, and cannot recover a conflict.
 */
export function mergeBlocked({ mergeable, mergeStateStatus }, base) {
  if (mergeable === "CONFLICTING" || mergeStateStatus === "DIRTY") return "the branch conflicts";
  if (mergeable === "UNKNOWN") return "GitHub is still computing mergeability — ask again";
  if (mergeStateStatus === "BEHIND")
    return `the branch is behind ${base} — update it, then run the checks and the gate again`;
  return null;
}

export const UNLINKED = "the pull request is not linked to its issue";

/**
 * The issue `open-pr` names on the body's first line must come back in GitHub's
 * `closingIssuesReferences`. GitHub has dropped that link with the body intact, which leaves
 * the pull request off the issue and the board, so this reads the link and not the body. It
 * warns rather than blocks: the fault is GitHub's and only a hand link repairs it.
 *
 * @param {string} body
 * @param {number[]} closing
 */
export function linkNote(body, closing) {
  const first = (body ?? "").split("\n")[0].trim();
  const named = /^>?\s*Closes #(\d+)/i.exec(first)?.[1];
  if (named === undefined) return "the body does not open with > Closes #<issue>";
  if (closing.includes(Number(named))) return null;
  return `GitHub has not linked #${named} — link it from the pull request's Development box`;
}

const gh = (args) => JSON.parse(capture("gh", args));
const git = (args) => capture("git", args).trim();

/**
 * How many of the branch's own commits on `head` the last pass never saw, or null where the
 * branch does not carry the pass's `commit_id` — a review left on another head relates to
 * nothing here. `^origin/<base>` keeps a merge from the base branch out of the count: what it
 * carries arrived with a review of its own.
 *
 * @param {string | null} sha
 * @param {string} head
 * @param {string} base
 * @param {string | undefined} [cwd]
 * @returns {number | null}
 */
export function sinceLastPass(sha, head, base, cwd) {
  if (sha === null) return null;
  try {
    capture("git", ["merge-base", "--is-ancestor", sha, head], { stdio: "ignore", cwd });
  } catch {
    return null;
  }
  const count = capture("git", ["rev-list", "--count", `${sha}..${head}`, `^origin/${base}`], { cwd });
  return Number(count.trim());
}

const signers = () =>
  gh(["api", "--paginate", "repos/{owner}/{repo}/collaborators"]).map((c) => c.login);

function gate(n, given) {
  const base = defaultBranch();
  const api = (path) => gh(["api", "--paginate", path]);
  const failures = [];
  const report = (ok, condition, detail) => {
    console.log(`${ok ? "pass" : "FAIL"}  ${condition}${ok ? "" : `\n      ${detail}`}`);
    if (!ok) failures.push(condition);
  };

  const pr = gh([
    "pr",
    "view",
    n,
    "--json",
    "headRefOid,headRefName,body,labels,closingIssuesReferences,mergeable,mergeStateStatus",
  ]);
  const head = pr.headRefOid;

  let checkFailure;
  try {
    const sha = headCommit(pr.headRefName, given);
    const names = expectedChecks(base);
    const noCi = names.length === 0 && !hasWorkflows(sha);
    checkFailure = headBlocked(head, sha) ?? checksBlocked(readChecks(sha), names, noCi);
  } catch (error) {
    checkFailure = `could not read the required checks or the commit: ${error.message}`;
  }
  report(checkFailure === null, "every check is green", checkFailure);

  capture("git", ["fetch", "--quiet", "origin", base, head]);

  const reviews = api(`repos/{owner}/{repo}/pulls/${n}/reviews`);
  const pass = passes(reviews).at(-1) ?? null;
  const findings =
    pass === null ? [] : api(`repos/{owner}/{repo}/pulls/${n}/reviews/${pass.id}/comments`);
  const reviewFailure = reviewBlocked(reviews, findings);
  report(reviewFailure === null, "the review converged", reviewFailure);
  const note = capNote(reviews, findings);
  if (note !== null) console.log(`      ${note}`);
  const readSha = pass?.commit_id ?? null;
  const age = staleNote(readSha, head, sinceLastPass(readSha, head, base), base);
  if (age !== null) console.log(`      ${age}`);
  if (pass !== null)
    console.log(`      the pass body is review ${pass.id} — read it for a finding no line anchors`);

  const label = labelBlocked(pr.labels.map((l) => l.name));
  report(label === null, `the review is labelled ${LABEL_DONE}`, label);

  const comments = api(`repos/{owner}/{repo}/pulls/${n}/comments`);
  const issueComments = api(`repos/{owner}/{repo}/issues/${n}/comments`);
  const who = signers();
  const open = unanswered(comments);
  report(open.length === 0, "every thread carries a verdict", open.join("\n      "));
  const declined = [
    ...blockingDeclines(comments, who),
    ...blockingBodyDeclines(issueComments, who),
  ];
  report(
    declined.length === 0,
    "no declined finding is critical or warning",
    declined.join("\n      "),
  );

  const mergeBase = git(["merge-base", `origin/${base}`, head]);
  const changed = git(["diff", "--name-only", mergeBase, head]).split("\n").filter(Boolean);
  const headDate = git(["show", "-s", "--format=%cI", head]);
  const fence = protectedPaths(base);
  const reached = changed.filter((p) => matchesAny(fence, p));
  const unsigned = unsignedPaths(reached, head, headDate, issueComments, who);
  report(unsigned.length === 0, "the diff reaches no protected path", unsigned.join("\n      "));

  const held = unconfirmedDeviations(pr.body, head, headDate, issueComments, who);
  report(
    held.length === 0,
    "every Narrowing and Addition deviation is confirmed",
    held.join("\n      "),
  );

  const unlinked = linkNote(
    pr.body,
    pr.closingIssuesReferences.map((i) => i.number),
  );
  if (unlinked !== null) console.log(`warn  ${UNLINKED}\n      ${unlinked}`);

  const conflict = mergeBlocked(pr, base);
  report(conflict === null, "the branch merges cleanly", conflict);

  return failures;
}

if (process.argv[1] !== undefined && import.meta.filename === realpathSync(process.argv[1])) {
  const [n, given] = process.argv.slice(2);
  if (n === undefined) {
    console.error("usage: node merge-gate.mjs <pr> [sha]");
    process.exit(2);
  }
  const failures = gate(n, given);
  if (failures.length > 0) {
    console.error(`\n${failures.length} condition(s) block the merge. Hand each to the user.`);
    process.exit(1);
  }
  console.log("\nall conditions hold");
}
