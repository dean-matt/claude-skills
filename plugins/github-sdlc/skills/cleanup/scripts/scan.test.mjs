import assert from "node:assert/strict";
import { test } from "node:test";
import { classify, retrying } from "./scan.mjs";

const base = { base: "main", worktrees: [], branches: [], prs: [], assigned: [], here: { branch: null, dirty: false } };
const branch = (name, extra = {}) => ({ name, local: "aaa", remote: "aaa", ahead: 2, ...extra });
const pr = (head, state, extra = {}) => ({ number: 7, state, head, sha: "aaa", closes: [], ...extra });
const one = (facts) => classify({ ...base, ...facts })[0];

test("a branch with an open pull request is kept", () => {
  assert.equal(one({ branches: [branch("feat/1-x")], prs: [pr("feat/1-x", "OPEN")] }).verdict, "keep");
});

test("a merged branch is safe only while every copy sits at the merged head", () => {
  const prs = [pr("feat/1-x", "MERGED")];
  assert.equal(one({ branches: [branch("feat/1-x")], prs }).verdict, "safe");
  assert.equal(one({ branches: [branch("feat/1-x", { local: "bbb" })], prs }).verdict, "ask");
});

test("a branch closed without merging is asked about", () => {
  assert.equal(one({ branches: [branch("feat/1-x")], prs: [pr("feat/1-x", "CLOSED")] }).verdict, "ask");
});

test("with no pull request, an empty branch is safe and one with commits is kept", () => {
  assert.equal(one({ branches: [branch("fix/2-y", { ahead: 0 })] }).verdict, "safe");
  assert.equal(one({ branches: [branch("fix/2-y")] }).verdict, "keep");
});

test("a dirty worktree is kept whatever its pull request says", () => {
  const facts = {
    worktrees: [{ path: "/r/.claude/worktrees/1", branch: "feat/1-x", dirty: true }],
    branches: [branch("feat/1-x")],
    prs: [pr("feat/1-x", "MERGED")],
  };
  assert.equal(one(facts).verdict, "keep");
});

test("a clean worktree follows its branch, and one on an unknown branch is asked about", () => {
  const w = (branchName) => ({ path: "/r/.claude/worktrees/1", branch: branchName, dirty: false });
  const merged = { branches: [branch("feat/1-x")], prs: [pr("feat/1-x", "MERGED")] };
  assert.equal(one({ ...merged, worktrees: [w("feat/1-x")] }).verdict, "safe");
  assert.equal(one({ worktrees: [w("scratch")] }).verdict, "ask");
});

test("an assignment is asked about unless a branch or an open pull request holds it", () => {
  assert.equal(one({ assigned: [5] }).kind, "assignment");
  assert.deepEqual(classify({ ...base, assigned: [5], branches: [branch("feat/5-z")], prs: [pr("feat/5-z", "OPEN")] }).filter((r) => r.kind === "assignment"), []);
  assert.deepEqual(classify({ ...base, assigned: [5], prs: [pr("other", "OPEN", { closes: [5] })] }).filter((r) => r.kind === "assignment"), []);
});

test("the branch checked out in the main checkout is flagged, and kept if that checkout is dirty", () => {
  const facts = { branches: [branch("feat/1-x")], prs: [pr("feat/1-x", "MERGED")] };
  const clean = one({ ...facts, here: { branch: "feat/1-x", dirty: false } });
  assert.equal(clean.verdict, "safe");
  assert.match(clean.reason, /checked out here/);
  assert.equal(one({ ...facts, here: { branch: "feat/1-x", dirty: true } }).verdict, "keep");
});

test("retrying returns the first success and pauses longer after each failure", () => {
  const pauses = [];
  let calls = 0;
  const result = retrying(
    () => {
      if (++calls < 3) throw new Error("HTTP 502");
      return "ok";
    },
    { pause: (ms) => pauses.push(ms) },
  );
  assert.deepEqual([result, calls, pauses], ["ok", 3, [2000, 4000]]);
});

test("retrying rethrows the last error once the attempts are spent", () => {
  let calls = 0;
  assert.throws(
    () =>
      retrying(
        () => {
          calls++;
          throw new Error("HTTP 504");
        },
        { pause: () => {} },
      ),
    /HTTP 504/,
  );
  assert.equal(calls, 3);
});
