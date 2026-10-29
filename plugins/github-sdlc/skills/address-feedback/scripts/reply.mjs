/**
 * Answers review threads in one review.
 *
 *   reply.mjs <pr> <replies.json>   replies.json: [{ "id": <comment id>, "body": "**Applied** — ..." }]
 *
 * A reply posted through the REST reply endpoint becomes a review of its own, so a pass with
 * thirty findings leaves thirty empty reviews. This opens one pending review, adds every reply
 * to it, and submits it once. `id` is the finding's comment id (`databaseId`). Needs `gh`.
 * The exported function is pure so it can be tested.
 */
import { readFileSync } from "node:fs";
import { capture } from "../../merge-pr/scripts/capture.mjs";

const THREADS =
  "query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){id reviewThreads(first:100){nodes{id comments(first:1){nodes{databaseId}}}}}}}";
const OPEN = "mutation($p:ID!){addPullRequestReview(input:{pullRequestId:$p}){pullRequestReview{id}}}";
const REPLY =
  "mutation($rv:ID!,$t:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewId:$rv,pullRequestReviewThreadId:$t,body:$b}){comment{id}}}";
const SUBMIT =
  "mutation($rv:ID!){submitPullRequestReview(input:{pullRequestReviewId:$rv,event:COMMENT}){pullRequestReview{id}}}";

/**
 * Pairs each reply with the thread its finding opened.
 *
 * @param {{ id: number, body: string }[]} replies
 * @param {{ id: string, comments: { nodes: { databaseId: number }[] } }[]} threads
 * @returns {{ threadId: string, body: string }[]}
 * @throws when a reply names a finding with no thread, so none is posted
 */
export function plan(replies, threads) {
  const byComment = new Map(threads.map((t) => [t.comments.nodes[0]?.databaseId, t.id]));
  const missing = replies.filter((r) => !byComment.has(r.id)).map((r) => r.id);
  if (missing.length > 0) throw new Error(`no thread for comment ${missing.join(", ")}`);
  return replies.map((r) => ({ threadId: byComment.get(r.id), body: r.body }));
}

/**
 * @param {string[]} argv
 * @param {typeof capture} [run]
 * @param {(path: string) => string} [read]
 * @returns {string} a one-line summary
 */
export function reply(argv, run = capture, read = (p) => readFileSync(p, "utf8")) {
  const [n, file] = argv;
  if (!n || !file) throw new Error("usage: reply.mjs <pr> <replies.json>");
  const replies = JSON.parse(read(file));
  const call = (args) => JSON.parse(run("gh", ["api", "graphql", ...args]));
  const { owner, name } = JSON.parse(
    run("gh", ["repo", "view", "--json", "owner,name", "--jq", "{owner: .owner.login, name: .name}"]),
  );
  const pr = call(["-f", `query=${THREADS}`, "-f", `o=${owner}`, "-f", `r=${name}`, "-F", `n=${n}`]).data.repository
    .pullRequest;
  const planned = plan(replies, pr.reviewThreads.nodes);
  if (planned.length === 0) return `pr #${n}: no replies`;
  const review = call(["-f", `query=${OPEN}`, "-f", `p=${pr.id}`]).data.addPullRequestReview.pullRequestReview.id;
  for (const { threadId, body } of planned)
    call(["-f", `query=${REPLY}`, "-f", `rv=${review}`, "-f", `t=${threadId}`, "-f", `b=${body}`]);
  call(["-f", `query=${SUBMIT}`, "-f", `rv=${review}`]);
  return `pr #${n}: ${planned.length} repl${planned.length === 1 ? "y" : "ies"} in one review`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(reply(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(2);
  }
}
