import assert from "node:assert/strict";
import { test } from "node:test";
import {
  blockingBodyDeclines,
  blockingDeclines,
  capNote,
  checksBlocked,
  heldDeviations,
  labelBlocked,
  linkNote,
  mergeBlocked,
  PASS_CAP,
  PASS_MARKER,
  passes,
  reviewBlocked,
  severity,
  staleNote,
  unanswered,
  unconfirmedDeviations,
  unsignedPaths,
} from "./merge-gate.mjs";

const pass = (id, extra = {}) => ({ id, body: `${PASS_MARKER}\nfindings`, ...extra });
const finding = (id, sev = "critical") => ({ id, body: `**${sev}** — x`, html_url: `u${id}` });
const reply = (id, to, body, login = "me") => ({
  id,
  in_reply_to_id: to,
  body,
  html_url: `u${id}`,
  user: { login },
});

test("severity reads the bold marker and nothing else", () => {
  assert.equal(severity("**warning** — a"), "warning");
  assert.equal(severity("`critical` — a"), "unreadable");
  assert.equal(severity(" **comment** a"), "unreadable");
  assert.equal(severity(undefined), "unreadable");
});

test("checks: a green head passes, red, missing and silent heads block", () => {
  const green = [{ name: "ci", bucket: "pass" }];
  assert.equal(checksBlocked(green, ["ci"]), null);
  assert.match(checksBlocked([{ name: "ci", bucket: "fail" }], ["ci"]), /ci/);
  assert.match(checksBlocked(green, ["ci", "e2e"]), /e2e \(not reported\)/);
  assert.match(checksBlocked([], ["ci"]), /no check has reported/);
});

test("checks: with no required name the reported checks stand in; none reported blocks", () => {
  assert.equal(checksBlocked([{ name: "ci", bucket: "skipping" }], []), null);
  assert.match(checksBlocked([{ name: "ci", bucket: "pending" }], []), /ci/);
  assert.match(checksBlocked([], []), /no check has reported/);
});

test("checks: a repository that runs no checks has nothing to wait on", () => {
  assert.equal(checksBlocked([], [], true), null);
  assert.match(checksBlocked([], [], false), /no check has reported/);
});

test("passes: marked reviews are the passes, and an unmarked pull request falls back to bodied ones", () => {
  const reviews = [pass(1), { id: 2, body: "" }, { id: 3, body: "LGTM" }, pass(4)];
  assert.deepEqual(passes(reviews).map((r) => r.id), [1, 4]);
  assert.deepEqual(passes([{ id: 5, body: "LGTM" }, { id: 6, body: "" }]).map((r) => r.id), [5]);
});

test("review: no pass blocks, a clean last pass converges, a blocking one asks again until the cap", () => {
  assert.match(reviewBlocked([], []), /nothing has reviewed/);
  assert.equal(reviewBlocked([pass(1)], [finding(1, "comment")]), null);
  assert.match(reviewBlocked([pass(1)], [finding(1)]), /pass 1 of 3 returned a blocking finding/);
  const capped = Array.from({ length: PASS_CAP }, (_, i) => pass(i));
  assert.equal(reviewBlocked(capped, [finding(9)]), null);
});

test("cap note names the waiver and the overage, and is silent otherwise", () => {
  const capped = Array.from({ length: PASS_CAP }, (_, i) => pass(i));
  assert.match(capNote(capped, [finding(1)]), /stopped this condition asking/);
  assert.match(capNote([...capped, pass(9)], []), /past the cap/);
  assert.equal(capNote([pass(1)], [finding(1)]), null);
});

test("label: exactly ai-review:completed passes", () => {
  assert.equal(labelBlocked(["bug", "ai-review:completed"]), null);
  assert.match(labelBlocked(["ai-review:changes-requested"]), /waits on the user/);
  assert.match(labelBlocked(["bug"]), /has not finished/);
  assert.match(labelBlocked(["ai-review:completed", "ai-review:changes-requested"]), /waits on the user/);
});

test("threads: a finding with no verdict reply is unanswered", () => {
  const comments = [finding(1), finding(2), reply(3, 1, "**Applied** in abc")];
  assert.deepEqual(unanswered(comments), ["u2"]);
});

test("declines: critical and warning block unless a signer accepted in the same thread", () => {
  const comments = [finding(1), finding(2, "comment"), reply(3, 1, "**Declined** — no"), reply(4, 2, "**Declined** — taste")];
  assert.deepEqual(blockingDeclines(comments, ["me"]), ["u3"]);
  const accepted = [...comments, reply(5, 1, "**Accepted** — ok", "me")];
  assert.deepEqual(blockingDeclines(accepted, ["me"]), []);
  const stranger = [...comments, reply(5, 1, "**Accepted** — ok", "mallory")];
  assert.deepEqual(blockingDeclines(stranger, ["me"]), ["u3"]);
});

test("body declines clear only on a later signer acceptance", () => {
  const decline = { body: "**Declined** critical — x", html_url: "d" };
  const accept = { body: "**Accepted** — ok", user: { login: "me" } };
  assert.deepEqual(blockingBodyDeclines([decline], ["me"]), ["d"]);
  assert.deepEqual(blockingBodyDeclines([decline, accept], ["me"]), []);
  assert.deepEqual(blockingBodyDeclines([accept, decline], ["me"]), ["d"]);
});

const HEAD = "abcdef1234567890";
const record = (body, login = "me", at = "2026-01-02T00:00:00Z") => ({ body, user: { login }, created_at: at });
const HEAD_DATE = "2026-01-01T00:00:00Z";

test("protected paths: cleared only by a signer's record at this head, after its commit", () => {
  const paths = ["docs/a.md", "ci.yml"];
  assert.deepEqual(unsignedPaths(paths, HEAD, HEAD_DATE, [], ["me"]), paths);
  const ok = record(`**Accepted protected** ${HEAD.slice(0, 8)} — docs/a.md, ci.yml: approved`);
  assert.deepEqual(unsignedPaths(paths, HEAD, HEAD_DATE, [ok], ["me"]), []);
  const wrongHead = record("**Accepted protected** 1111111 — docs/a.md, ci.yml");
  assert.deepEqual(unsignedPaths(paths, HEAD, HEAD_DATE, [wrongHead], ["me"]), paths);
  const early = record(`**Accepted protected** ${HEAD.slice(0, 8)} — docs/a.md, ci.yml`, "me", "2025-12-31T00:00:00Z");
  assert.deepEqual(unsignedPaths(paths, HEAD, HEAD_DATE, [early], ["me"]), paths);
  const stranger = record(`**Accepted protected** ${HEAD.slice(0, 8)} — docs/a.md, ci.yml`, "mallory");
  assert.deepEqual(unsignedPaths(paths, HEAD, HEAD_DATE, [stranger], ["me"]), paths);
  const partial = record(`**Accepted protected** ${HEAD.slice(0, 8)} — docs/a.md`);
  assert.deepEqual(unsignedPaths(paths, HEAD, HEAD_DATE, [partial], ["me"]), ["ci.yml"]);
});

const BODY = [
  "> Closes #1",
  "",
  "## What",
  "x",
  "",
  "## Deviations",
  "- **Correction:** the issue was wrong about the die.",
  "- **Narrowing:** twelve files go to #959.",
  "- **Addition:** a new dev dependency.",
  "",
  "## Screenshots",
  "- **Addition:** not a deviation, wrong section",
].join("\n");

test("deviations: only Narrowing and Addition lines inside the Deviations section hold the merge", () => {
  assert.deepEqual(heldDeviations(BODY), [
    "- **Narrowing:** twelve files go to #959.",
    "- **Addition:** a new dev dependency.",
  ]);
  assert.deepEqual(heldDeviations("## What\nx"), []);
  assert.deepEqual(heldDeviations("## Deviations\n- **Correction:** only this"), []);
});

test("deviations: one signer record at this head confirms them all", () => {
  assert.equal(unconfirmedDeviations(BODY, HEAD, HEAD_DATE, [], ["me"]).length, 2);
  const ok = record(`**Confirmed** ${HEAD.slice(0, 8)} — both approved`);
  assert.deepEqual(unconfirmedDeviations(BODY, HEAD, HEAD_DATE, [ok], ["me"]), []);
  const stale = record("**Confirmed** 1111111 — both approved");
  assert.equal(unconfirmedDeviations(BODY, HEAD, HEAD_DATE, [stale], ["me"]).length, 2);
  assert.deepEqual(unconfirmedDeviations("## What\nx", HEAD, HEAD_DATE, [], ["me"]), []);
});

test("merge state: conflict, still computing and behind each read differently", () => {
  assert.equal(mergeBlocked({ mergeable: "MERGEABLE", mergeStateStatus: "CLEAN" }, "main"), null);
  assert.match(mergeBlocked({ mergeable: "CONFLICTING", mergeStateStatus: "DIRTY" }, "main"), /conflicts/);
  assert.match(mergeBlocked({ mergeable: "UNKNOWN", mergeStateStatus: "UNKNOWN" }, "main"), /computing/);
  assert.match(mergeBlocked({ mergeable: "MERGEABLE", mergeStateStatus: "BEHIND" }, "trunk"), /behind trunk/);
});

test("link note: reads the blockquote form and GitHub's own link", () => {
  assert.equal(linkNote("> Closes #7\n\nrest", [7]), null);
  assert.equal(linkNote("Closes #7", [7]), null);
  assert.match(linkNote("> Closes #7", []), /has not linked #7/);
  assert.match(linkNote("no link here", []), /does not open with/);
});

test("stale note names the distance and the range", () => {
  assert.equal(staleNote(null, "h", 0, "main"), null);
  assert.match(staleNote("abcdef123456", "fedcba654321", null, "main"), /not on this branch/);
  assert.match(staleNote("abcdef123456", "fedcba654321", 0, "main"), /the tip of this branch/);
  assert.match(staleNote("abcdef123456", "fedcba654321", 2, "dev"), /2 commits.*\^origin\/dev/);
});
