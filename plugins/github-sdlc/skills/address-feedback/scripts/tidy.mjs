/**
 * Closes out the review noise once a review has converged, so an issue or a pull request does
 * not carry every pass it took to get there.
 *
 *   tidy.mjs issue <n> <stage>   minimize earlier design passes and their replies as outdated
 *   tidy.mjs pr <n>              minimize earlier review passes, resolve answered threads
 *
 * The last pass stays visible, with whatever follows it: it is the one a reader needs, and the
 * merge gate reads it. A person's comment, an `**Accepted**` record and a thread still waiting
 * on a verdict are never touched. Minimizing hides a comment behind a "show" link; it is not
 * deleted and the API still returns it.
 *
 * Needs `gh`. The exported functions are pure so the choice of what to hide is testable.
 */
import { capture } from "../../merge-pr/scripts/capture.mjs";
import { PASS_MARKER } from "../../merge-pr/scripts/merge-gate.mjs";

export const designMarker = (stage) => `<!-- design-pass:${stage} -->`;

/** @param {string} body @param {string} stage */
export function isDesignReply(body, stage) {
  return body.startsWith(`<!-- design-replies:${stage} -->`) ||
    new RegExp(`^Replies to design pass \\d+ \\(${stage}\\b`).test(body);
}

/**
 * Comments of one stage that an earlier pass left behind: every pass and reply before the last
 * pass. Replies to the last pass stay with it.
 *
 * @param {{ node_id: string, body: string }[]} comments oldest first
 * @param {string} stage
 * @returns {string[]} node ids to minimize
 */
export function staleDesign(comments, stage) {
  const last = comments.findLastIndex((c) => c.body.startsWith(designMarker(stage)));
  return comments
    .filter((c, i) => i < last && (c.body.startsWith(designMarker(stage)) || isDesignReply(c.body, stage)))
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
  const last = reviews.findLastIndex((r) => r.body.includes(PASS_MARKER));
  return reviews
    .filter((r, i) => i < last && (r.body.includes(PASS_MARKER) || r.body === ""))
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
  const [kind, n, stage] = argv;
  const mutate = (query, id) => gh(["api", "graphql", "-f", `query=${query}`, "-f", `id=${id}`], run);
  if (kind === "issue" && n && stage) {
    const comments = gh(["api", "--paginate", "--slurp", `repos/{owner}/{repo}/issues/${n}/comments`], run).flat();
    const stale = staleDesign(comments, stage);
    for (const id of stale) mutate(MINIMIZE, id);
    return `issue #${n} ${stage}: minimized ${stale.length} earlier comment(s)`;
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
  throw new Error("usage: tidy.mjs issue <n> <stage> | tidy.mjs pr <n>");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(tidy(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(2);
  }
}
