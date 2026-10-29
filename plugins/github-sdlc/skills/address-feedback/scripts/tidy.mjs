/**
 * Hides superseded review passes.
 *
 *   tidy.mjs issue <n> <stage>   minimize earlier design passes as outdated
 *   tidy.mjs issue <n> <stage> --passed   minimize all of a passed stage's passes
 *   tidy.mjs pr <n>              minimize earlier review passes, resolve answered threads
 *
 * The last pass stays visible, since the merge gate reads it, until a design stage passes. A person's comment, an
 * `**Accepted**` record and a thread waiting on a verdict are never touched. Minimized comments
 * stay in the API. Needs `gh`. The exported functions are pure so they can be tested.
 */
import { capture } from "../../merge-pr/scripts/capture.mjs";
import { PASS_MARKER, VERIFY_MARKER } from "../../merge-pr/scripts/merge-gate.mjs";

export const designMarker = (stage) => `<!-- design-pass:${stage} -->`;

/**
 * A reply comment from before verdicts went inline in the pass itself. Issues written then still
 * carry them.
 *
 * @param {string} body @param {string} stage
 */
export function isLegacyReply(body, stage) {
  return new RegExp(`^Replies to design pass \\d+ \\(${stage}\\b`).test(body);
}

/**
 * Whether a `critical`, `high` or `medium` finding in the comment carries a verdict that waits on
 * the user. A declined `low` or `info` is a taste call refused and waits on nobody.
 *
 * @param {string} body
 */
export const waiting = (body) =>
  body
    .split(/^\d+\. /m)
    .some((item) => /\*\*(critical|high|medium)\*\*/.test(item) && /\*\*(Declined|Held for the user)\*\*/.test(item));

/**
 * Comments of one stage that an earlier pass left behind: every pass before the last, and the
 * legacy replies before it, unless one still holds a declined or held `critical`, `high` or `medium`. The last pass
 * stays with whatever follows it.
 *
 * @param {{ node_id: string, body: string }[]} comments oldest first
 * @param {string} stage
 * @returns {string[]} node ids to minimize
 */
export function staleDesign(comments, stage) {
  const last = comments.findLastIndex((c) => c.body.startsWith(designMarker(stage)));
  return comments
    .filter(
      (c, i) =>
        i < last &&
        (c.body.startsWith(designMarker(stage)) || isLegacyReply(c.body, stage)) &&
        !waiting(c.body),
    )
    .map((c) => c.node_id);
}

/**
 * Comments of a stage that passed review: every pass and legacy reply, declined findings
 * included, since the passing review settled them. A pass holding a finding for the user stays.
 *
 * @param {{ node_id: string, body: string }[]} comments
 * @param {string} stage
 * @returns {string[]}
 */
export function passedDesign(comments, stage) {
  return comments
    .filter(
      (c) =>
        (c.body.startsWith(designMarker(stage)) || isLegacyReply(c.body, stage)) &&
        !c.body.includes("**Held for the user**"),
    )
    .map((c) => c.node_id);
}

/**
 * Reviews an earlier pass left behind: every marked pass before the last, and the bodiless
 * reviews that only carry verdict replies before it.
 *
 * @param {{ node_id: string, body: string }[]} reviews oldest first
 * @returns {string[]}
 */
export function staleReviews(reviews) {
  const isPass = (r) => r.body.includes(PASS_MARKER) || r.body.includes(VERIFY_MARKER);
  const last = reviews.findLastIndex(isPass);
  return reviews
    .filter((r, i) => i < last && (isPass(r) || r.body === ""))
    .map((r) => r.node_id);
}

/**
 * Threads that carry a verdict and are done: the last reply is `**Applied**` or `**Accepted**`.
 * A `**Declined**` thread waits on the user, and a thread whose last word is the reviewer's has
 * had no answer.
 *
 * @param {{ id: string, isResolved: boolean, comments: { nodes: { body: string }[] } }[]} threads
 * @returns {string[]}
 */
export function doneThreads(threads) {
  return threads
    .filter((t) => !t.isResolved && /^\*\*(Applied|Accepted)\*\*/.test(t.comments.nodes.at(-1)?.body ?? ""))
    .map((t) => t.id);
}

const MINIMIZE = "mutation($id:ID!){minimizeComment(input:{subjectId:$id,classifier:OUTDATED}){minimizedComment{isMinimized}}}";
const RESOLVE = "mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}";
const THREADS =
  "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved comments(last:1){nodes{body}}}}}}}";

/** @param {string[]} args @param {typeof capture} run */
function gh(args, run) {
  return JSON.parse(run("gh", args) || "null");
}

/**
 * @param {string[]} argv
 * @param {typeof capture} [run]
 * @returns {string} a one-line summary
 */
export function tidy(argv, run = capture) {
  const [kind, n, stage, flag] = argv;
  const mutate = (query, id) => gh(["api", "graphql", "-f", `query=${query}`, "-f", `id=${id}`], run);
  if (kind === "issue" && n && stage) {
    const comments = gh(["api", "--paginate", "--slurp", `repos/{owner}/{repo}/issues/${n}/comments`], run).flat();
    const passed = flag === "--passed";
    const stale = passed ? passedDesign(comments, stage) : staleDesign(comments, stage);
    for (const id of stale) mutate(MINIMIZE, id);
    return `issue #${n} ${stage}: minimized ${stale.length} ${passed ? "passed" : "earlier"} comment(s)`;
  }
  if (kind === "pr" && n) {
    const reviews = gh(["api", "--paginate", "--slurp", `repos/{owner}/{repo}/pulls/${n}/reviews`], run).flat();
    const stale = staleReviews(reviews);
    for (const id of stale) mutate(MINIMIZE, id);
    const { owner, name } = gh(["repo", "view", "--json", "owner,name", "--jq", "{owner: .owner.login, name: .name}"], run);
    const threads = gh(["api", "graphql", "-f", `query=${THREADS}`, "-f", `o=${owner}`, "-f", `r=${name}`, "-F", `n=${n}`], run)
      .data.repository.pullRequest.reviewThreads.nodes;
    const done = doneThreads(threads);
    for (const id of done) mutate(RESOLVE, id);
    return `pr #${n}: minimized ${stale.length} earlier review(s), resolved ${done.length} thread(s)`;
  }
  throw new Error("usage: tidy.mjs issue <n> <stage> [--passed] | tidy.mjs pr <n>");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(tidy(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(2);
  }
}
