import assert from "node:assert/strict";
import { test } from "node:test";
import { classify } from "./scan.mjs";

const base = { base: "main", worktrees: [], branches: [], prs: [], assigned: [] };
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
