import assert from "node:assert/strict";
import { test } from "node:test";
import { childRank, placeSplit } from "./place-split.mjs";

const read = (rank, milestone = { title: "M1" }, field = { id: "F" }) =>
  JSON.stringify({ data: {
    repository: { issue: { url: "https://github.com/o/r/issues/10", milestone, projectItems: { nodes: [{ project: { number: 1 }, rank: rank == null ? null : { number: rank } }] } } },
    repositoryOwner: { projectV2: { id: "P", field } },
  } });
const split = { project: "1", owner: "o", repo: "r", parent: "10", children: ["11", "12"] };

function gh(answer) {
  const calls = [];
  const run = (_f, args) => {
    calls.push(args);
    if (args[0] === "api") return answer;
    if (args[1] === "item-add") return JSON.stringify({ id: `I${args.at(-3).split("/").pop()}` });
    return "";
  };
  return { run, calls };
}

test("children take the parent's milestone and ranks just after it, in order", () => {
  const g = gh(read(5));
  placeSplit(split, g.run);
  const numbers = g.calls.filter((a) => a[1] === "item-edit").map((a) => [a[3], a.at(-1)]);
  assert.deepEqual(numbers, [["I11", "5.001"], ["I12", "5.002"]]);
  assert.equal(g.calls.filter((a) => a[0] === "issue" && a.includes("M1")).length, 2);
});

test("a parent with no rank leaves the children unranked", () => {
  const g = gh(read(null));
  assert.match(placeSplit(split, g.run), /no rank/);
  assert.equal(g.calls.some((a) => a[1] === "item-edit"), false);
});

test("a parent with no milestone sets none", () => {
  const g = gh(read(5, null));
  placeSplit(split, g.run);
  assert.equal(g.calls.some((a) => a[0] === "issue"), false);
});

test("a board with no Rank field ranks nothing", () => {
  const g = gh(read(5, { title: "M1" }, null));
  placeSplit(split, g.run);
  assert.equal(g.calls.some((a) => a[1] === "item-edit"), false);
});

test("rank arithmetic avoids float drift", () => {
  assert.equal(childRank(0.1, 2), 0.102);
});
