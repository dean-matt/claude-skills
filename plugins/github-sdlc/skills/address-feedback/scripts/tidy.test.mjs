import assert from "node:assert/strict";
import { test } from "node:test";
import { PASS_MARKER, VERIFY_MARKER } from "../../merge-pr/scripts/merge-gate.mjs";
import { doneThreads, staleReviews, tidy } from "./tidy.mjs";

const c = (node_id, body) => ({ node_id, body });

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
      t("open", "**high** — no answer yet"),
      t("already", "**Applied**", true),
    ]),
    ["done", "ok"],
  );
});

test("tidy refuses a call it does not understand", () => {
  assert.throws(() => tidy(["issue", "7"]), /usage/);
});

test("a verify pass is hidden once a later pass exists, and counts as the last pass", () => {
  const r = (node_id, body) => ({ node_id, body });
  const reviews = [r("a", `${PASS_MARKER}\nfull`), r("b", `${VERIFY_MARKER}\nfixes`), r("c", `${PASS_MARKER}\nfinal`)];
  assert.deepEqual(staleReviews(reviews), ["a", "b"]);
  assert.deepEqual(staleReviews(reviews.slice(0, 2)), ["a"]);
});
