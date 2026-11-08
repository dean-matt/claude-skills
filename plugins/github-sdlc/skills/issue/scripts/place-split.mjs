/**
 * Gives the issues a split creates the parent's milestone and a board rank just after the
 * parent's, in the order given: the parent's rank + 0.001 for the first, + 0.002 for the next.
 *
 *   place-split.mjs <project> <owner> <parent-number> <child-number>...
 *
 * Other issues keep their ranks. A parent with no rank leaves the children unranked, with the
 * milestone set. Exits 2 on any failure; the issues stay created.
 */
import { capture } from "../../merge-pr/scripts/capture.mjs";

export const STEP = 0.001;

const READ = `query($o:String!,$r:String!,$i:Int!,$n:Int!){
  repository(owner:$o,name:$r){issue(number:$i){url milestone{title}
    projectItems(first:20){nodes{project{number} rank:fieldValueByName(name:"Rank"){... on ProjectV2ItemFieldNumberValue{number}}}}}}
  repositoryOwner(login:$o){... on ProjectV2Owner{projectV2(number:$n){id field(name:"Rank"){... on ProjectV2Field{id}}}}}
}`;

/** @param {number} rank the parent's rank @param {number} k 1-based position in the split */
export const childRank = (rank, k) => Math.round((rank + k * STEP) * 1e6) / 1e6;

/**
 * @param {{ project: string, owner: string, repo: string, parent: string, children: string[] }} split
 * @param {typeof capture} [run]
 * @returns {string} a one-line summary
 */
export function placeSplit({ project, owner, repo, parent, children }, run = capture) {
  const data = JSON.parse(
    run("gh", ["api", "graphql", "-f", `query=${READ}`, "-f", `o=${owner}`, "-f", `r=${repo}`, "-F", `i=${parent}`, "-F", `n=${project}`]),
  ).data;
  const issue = data.repository.issue;
  const board = data.repositoryOwner?.projectV2;
  if (!board) throw new Error(`no project ${project} for ${owner}`);
  const rank = issue.projectItems.nodes.find((n) => String(n.project.number) === String(project))?.rank?.number;
  const url = (n) => issue.url.replace(/\/\d+$/, `/${n}`);
  children.forEach((child, i) => {
    if (issue.milestone) run("gh", ["issue", "edit", child, "--repo", `${owner}/${repo}`, "--milestone", issue.milestone.title]);
    if (rank == null || !board.field?.id) return;
    const item = JSON.parse(
      run("gh", ["project", "item-add", project, "--owner", owner, "--url", url(child), "--format", "json"]),
    ).id;
    run("gh", [
      "project", "item-edit", "--id", item, "--project-id", board.id,
      "--field-id", board.field.id, "--number", String(childRank(rank, i + 1)),
    ]);
  });
  const ranked = rank != null && board.field?.id;
  return `${children.length} issue(s) placed: milestone ${issue.milestone?.title ?? "none"}, ${ranked ? `rank after ${rank}` : "no rank"}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [project, owner, parent, ...children] = process.argv.slice(2);
  try {
    if (!children.length) throw new Error("usage: place-split.mjs <project> <owner> <parent-number> <child-number>...");
    const repo = capture("gh", ["repo", "view", "--json", "name", "--jq", ".name"]).trim();
    console.log(placeSplit({ project, owner, repo, parent, children }));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(2);
  }
}
