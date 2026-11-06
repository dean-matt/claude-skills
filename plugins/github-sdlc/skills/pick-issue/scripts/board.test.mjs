import assert from "node:assert/strict";
import { test } from "node:test";
import { readBoard, shape } from "./board.mjs";

const node = (number, extra = {}) => ({
  status: { name: "Todo" },
  rank: { number: 10 },
  content: { __typename: "Issue", number, milestone: { title: "M1", dueOn: null }, assignees: { nodes: [{ login: "me" }] } },
  ...extra,
});

test("shape matches the fields pick-issue reads from item-list", () => {
  assert.deepEqual(shape([node(5)]), [
    { status: "Todo", rank: 10, milestone: { title: "M1", dueOn: "" }, assignees: ["me"], content: { type: "Issue", number: 5 } },
  ]);
});

test("a card with no rank, milestone or status reads as null", () => {
  const bare = { status: null, rank: null, content: { __typename: "Issue", number: 6, milestone: null, assignees: { nodes: [] } } };
  assert.deepEqual(shape([bare])[0], {
    status: null, rank: null, milestone: null, assignees: [], content: { type: "Issue", number: 6 },
  });
});

test("readBoard follows the cursor to the last page", () => {
  const pages = [
    { hasNextPage: true, endCursor: "c1", nodes: [node(1)] },
    { hasNextPage: false, endCursor: "c2", nodes: [node(2)] },
  ];
  const seen = [];
  const run = (_f, args) => {
    seen.push(args.filter((a) => a.startsWith("after=")));
    const p = pages.shift();
    return JSON.stringify({ data: { repositoryOwner: { projectV2: { items: { pageInfo: p, nodes: p.nodes } } } } });
  };
  assert.deepEqual(readBoard("1", "o", run).items.map((i) => i.content.number), [1, 2]);
  assert.deepEqual(seen, [[], ["after=c1"]]);
});

test("a missing project throws", () => {
  const run = () => JSON.stringify({ data: { repositoryOwner: null } });
  assert.throws(() => readBoard("9", "o", run), /no project 9/);
});
