import assert from "node:assert/strict";
import { test } from "node:test";
import { plan, reply } from "./reply.mjs";

const thread = (id, databaseId) => ({ id, comments: { nodes: [{ databaseId }] } });

test("plan pairs each reply with the thread its finding opened", () => {
  const threads = [thread("T1", 11), thread("T2", 12)];
  assert.deepEqual(plan([{ id: 12, body: "**Applied** — x" }], threads), [
    { threadId: "T2", body: "**Applied** — x" },
  ]);
});

test("plan names every finding with no thread and posts nothing", () => {
  assert.throws(() => plan([{ id: 11, body: "a" }, { id: 99, body: "b" }, { id: 98, body: "c" }], [thread("T1", 11)]), /99, 98/);
});

test("reply opens one review, adds every reply, and submits once", () => {
  const calls = [];
  const run = (_cmd, args) => {
    const joined = args.join(" ");
    calls.push(joined);
    if (args[0] === "repo") return JSON.stringify({ owner: "o", name: "r" });
    if (joined.includes("reviewThreads"))
      return JSON.stringify({ data: { repository: { pullRequest: { id: "PR", reviewThreads: { nodes: [thread("T1", 11), thread("T2", 12)] } } } } });
    if (joined.includes("addPullRequestReview("))
      return JSON.stringify({ data: { addPullRequestReview: { pullRequestReview: { id: "RV" } } } });
    return "{}";
  };
  const read = () => JSON.stringify([{ id: 11, body: "**Applied** — a" }, { id: 12, body: "**Declined** — b" }]);
  assert.equal(reply(["5", "r.json"], run, read), "pr #5: 2 replies in one review");
  assert.equal(calls.filter((c) => c.includes("addPullRequestReviewThreadReply")).length, 2);
  assert.equal(calls.filter((c) => c.includes("submitPullRequestReview")).length, 1);
  assert.equal(calls.filter((c) => c.includes("addPullRequestReview(")).length, 1);
});

test("reply with a missing thread posts no review", () => {
  const calls = [];
  const run = (_cmd, args) => {
    calls.push(args.join(" "));
    if (args[0] === "repo") return JSON.stringify({ owner: "o", name: "r" });
    return JSON.stringify({ data: { repository: { pullRequest: { id: "PR", reviewThreads: { nodes: [] } } } } });
  };
  assert.throws(() => reply(["5", "r.json"], run, () => JSON.stringify([{ id: 1, body: "x" }])), /no thread/);
  assert.equal(calls.some((c) => c.includes("addPullRequestReview(")), false);
});
