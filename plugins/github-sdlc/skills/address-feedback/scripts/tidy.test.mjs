import assert from "node:assert/strict";
import { test } from "node:test";
import { PASS_MARKER } from "../../merge-pr/scripts/merge-gate.mjs";
import { doneThreads, staleDesign, staleReviews, tidy } from "./tidy.mjs";

const c = (node_id, body) => ({ node_id, body });

test("design: every pass and reply before the last pass is stale, the last pass and what follows are not", () => {
  const comments = [
    c("p1", "<!-- design-pass:criteria -->\n1. **critical** — x"),
    c("r1", "Replies to design pass 1 (criteria):\n1. **Applied**"),
    c("human", "looks right to me"),
    c("p2", "<!-- design-pass:criteria -->\n1. **warning** — y"),
    c("r2", "<!-- design-replies:criteria -->\n1. **Applied**"),
  ];
  assert.deepEqual(staleDesign(comments, "criteria"), ["p1", "r1"]);
});

test("design: another stage's passes and the decisions comment are left alone", () => {
  const comments = [
    c("u1", "<!-- design-pass:ui -->\nx"),
    c("d", "Open questions, all resolved: 1."),
    c("p1", "<!-- design-pass:criteria -->\nx"),
    c("p2", "<!-- design-pass:criteria -->\nx"),
  ];
  assert.deepEqual(staleDesign(comments, "criteria"), ["p1"]);
});

test("design: a stage with one pass has nothing stale", () => {
  assert.deepEqual(staleDesign([c("p1", "<!-- design-pass:test -->\nx")], "test"), []);
});

test("pr: earlier marked passes and bodiless verdict reviews are stale, the last pass is not", () => {
  const reviews = [
    c("a", `${PASS_MARKER}\nfirst`),
    c("v", ""),
    c("person", "please rename this"),
    c("b", `${PASS_MARKER}\nsecond`),
    c("v2", ""),
  ];
  assert.deepEqual(staleReviews(reviews), ["a", "v"]);
});

test("pr: only Applied and Accepted threads are resolved", () => {
  const t = (id, body, isResolved = false) => ({ id, isResolved, comments: { nodes: [{ body }] } });
  assert.deepEqual(
    doneThreads([
      t("done", "**Applied** — renamed"),
      t("ok", "**Accepted** — keep it"),
      t("declined", "**Declined** — out of scope"),
      t("open", "**warning** — no answer yet"),
      t("already", "**Applied**", true),
    ]),
    ["done", "ok"],
  );
});

test("tidy minimizes through GraphQL and reports the count", () => {
  const calls = [];
  const run = (file, args) => {
    calls.push(args.join(" "));
    if (args.includes("--slurp")) return JSON.stringify([[c("p1", "<!-- design-pass:ui -->"), c("p2", "<!-- design-pass:ui -->")]]);
    return "{}";
  };
  assert.equal(tidy(["issue", "7", "ui"], run), "issue #7 ui: minimized 1 earlier comment(s)");
  assert.ok(calls.some((l) => l.includes("minimizeComment") && l.includes("id=p1")));
  assert.ok(!calls.some((l) => l.includes("id=p2")));
});

test("tidy refuses a call it does not understand", () => {
  assert.throws(() => tidy(["issue", "7"]), /usage/);
});
