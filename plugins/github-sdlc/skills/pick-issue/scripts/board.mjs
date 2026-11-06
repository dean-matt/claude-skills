/**
 * Reads the open issue cards of a project board in the shape `gh project item-list --format json`
 * prints, with only the fields `pick-issue` reads: `status`, `rank`, `milestone`, `assignees` and
 * `content.{type,number}`.
 *
 *   board.mjs <project> <owner>
 *
 * `gh project item-list` asks for every field of every card, 102 points for 76 cards. This asks
 * for five and costs 1 point per 100 cards. Cards in Done and Triage are left out, as pick-issue
 * never reads them. Exits 2 on any failure, so the caller can fall back to `item-list`.
 */
import { capture } from "../../merge-pr/scripts/capture.mjs";

const QUERY = `query($o:String!,$n:Int!,$q:String!,$after:String){
  repositoryOwner(login:$o){... on ProjectV2Owner{projectV2(number:$n){
    items(first:100,after:$after,query:$q){
      pageInfo{hasNextPage endCursor}
      nodes{
        status:fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}
        rank:fieldValueByName(name:"Rank"){... on ProjectV2ItemFieldNumberValue{number}}
        content{__typename ... on Issue{number milestone{title dueOn} assignees(first:10){nodes{login}}}}
      }}}}}
}`;
const FILTER = "is:issue -status:Done -status:Triage";

/** @param {object[]} nodes the `items.nodes` of one page */
export function shape(nodes) {
  return nodes.map((n) => ({
    status: n.status?.name ?? null,
    rank: n.rank?.number ?? null,
    milestone: n.content?.milestone
      ? { title: n.content.milestone.title, dueOn: n.content.milestone.dueOn ?? "" }
      : null,
    assignees: (n.content?.assignees?.nodes ?? []).map((a) => a.login),
    content: { type: n.content?.__typename, number: n.content?.number },
  }));
}

/**
 * @param {string} project
 * @param {string} owner
 * @param {typeof capture} [run]
 */
export function readBoard(project, owner, run = capture) {
  const items = [];
  for (let after, more = true; more; ) {
    const args = ["api", "graphql", "-f", `query=${QUERY}`, "-f", `o=${owner}`, "-F", `n=${project}`, "-f", `q=${FILTER}`];
    if (after) args.push("-f", `after=${after}`);
    const board = JSON.parse(run("gh", args)).data.repositoryOwner?.projectV2;
    if (!board) throw new Error(`no project ${project} for ${owner}`);
    items.push(...shape(board.items.nodes));
    ({ hasNextPage: more, endCursor: after } = board.items.pageInfo);
  }
  return { items };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [project, owner] = process.argv.slice(2);
  try {
    if (!owner) throw new Error("usage: board.mjs <project> <owner>");
    console.log(JSON.stringify(readBoard(project, owner)));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(2);
  }
}
