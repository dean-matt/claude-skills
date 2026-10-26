import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { postPass, withHeading } from "./post-pass.mjs";

const pass = "<!-- design-pass:ui -->\n1. **warning** — x\n";

function fake({ failTidy = false } = {}) {
  const calls = [];
  const run = (file, args) => {
    calls.push(args.join(" "));
    if (args[0] === "issue") return "https://github.com/o/r/issues/7#issuecomment-9\n";
    if (args.includes("--slurp")) return JSON.stringify([[{ node_id: "old", body: pass }, { node_id: "new", body: pass }]]);
    if (failTidy) throw new Error("boom");
    return "{}";
  };
  return { calls, run };
}

test("posts the pass, then hides the earlier ones", () => {
  const { calls, run } = fake();
  const out = postPass(["7", "ui", "pass.md"], run, () => pass);
  assert.match(out, /issuecomment-9\nissue #7 ui: minimized 1 earlier comment\(s\)/);
  assert.ok(calls.some((c) => c.startsWith("issue comment 7 --body-file ")));
  assert.ok(calls.some((c) => c.includes("minimizeComment") && c.includes("id=old")));
  assert.ok(!calls.some((c) => c.includes("id=new")));
});

test("refuses a file that is not a pass for that stage, before posting anything", () => {
  const { calls, run } = fake();
  assert.throws(() => postPass(["7", "test", "pass.md"], run, () => pass), /does not open with/);
  assert.deepEqual(calls, []);
});

test("a tidy failure is reported, and the pass stays posted", () => {
  const { run } = fake({ failTidy: true });
  assert.match(postPass(["7", "ui", "pass.md"], run, () => pass), /posted, but tidying failed: boom/);
});

test("needs all three arguments", () => {
  assert.throws(() => postPass(["7", "ui"]), /usage/);
});

test("the heading names the stage and counts the earlier passes, hidden ones included", () => {
  assert.equal(
    withHeading("<!-- design-pass:criteria -->\n1. **warning** — x\n", "criteria", 3),
    "<!-- design-pass:criteria -->\n### Criteria review — pass 3\n\n1. **warning** — x\n",
  );
  assert.match(withHeading("<!-- design-pass:ui -->\nx", "ui", 1), /### UI\/UX design review — pass 1/);
});

test("a pass that already has a heading is left as written", () => {
  const body = "<!-- design-pass:test -->\n### Test design review — pass 2\n\n1. x\n";
  assert.equal(withHeading(body, "test", 9), body);
});

test("a posted pass carries the heading with the next pass number", () => {
  const written = [];
  const { run } = fake();
  const r = (file, args) => {
    if (args[0] === "issue") written.push(args.at(-1));
    return run(file, args);
  };
  postPass(["7", "ui", "pass.md"], r, () => pass);
    assert.match(readFileSync(written[0], "utf8"), /### UI\/UX design review — pass 3/);
});
