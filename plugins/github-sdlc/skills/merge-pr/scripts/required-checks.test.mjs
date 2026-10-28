import assert from "node:assert/strict";
import { test } from "node:test";
import { checkedCommit, versionOnly } from "./required-checks.mjs";

const diff = (...lines) =>
  ["diff --git a/package.json b/package.json", "--- a/package.json", "+++ b/package.json", "@@ -3 +3 @@", ...lines].join("\n");
const bump = diff('-  "version": "0.61.0",', '+  "version": "0.61.1",');

test("a diff of one version line is version-only; anything more is not", () => {
  assert.equal(versionOnly(bump), true);
  assert.equal(versionOnly(diff('-  "name": "a",', '+  "name": "b",')), false);
  assert.equal(versionOnly(`${bump}\n+  "x": 1,`), false);
  assert.equal(versionOnly(`${bump}\n${bump}`), false);
});

const git = (message, d) => (file, args) => {
  if (args[0] === "log") return message;
  if (args[0] === "diff") return d;
  if (args[0] === "rev-parse") return "parent\n";
  throw new Error(args.join(" "));
};

test("a [skip ci] version commit is judged on its parent", () => {
  assert.equal(checkedCommit("head", git("chore: release 0.61.1 [skip ci]", bump)), "parent");
});

test("a version commit without [skip ci], or a [skip ci] commit changing more, is judged itself", () => {
  assert.equal(checkedCommit("head", git("chore: release 0.61.1", bump)), "head");
  assert.equal(checkedCommit("head", git("fix: x [skip ci]", diff("-a", "+b"))), "head");
  assert.equal(checkedCommit("head", () => { throw new Error("no git"); }), "head");
});
