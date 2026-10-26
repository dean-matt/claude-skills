import assert from "node:assert/strict";
import { test } from "node:test";
import { postPass } from "./post-pass.mjs";

const pass = "<!-- design-pass:ui -->\n1. **warning** — x\n";

function fake({ failTidy = false } = {}) {
  const calls = [];
  const run = (file, args) => {
    calls.push(args.join(" "));
    if (args[0] === "issue") return "https://github.com/o/r/issues/7#issuecomment-9\n";
    if (failTidy) throw new Error("boom");
    if (args.includes("--slurp")) return JSON.stringify([[{ node_id: "old", body: pass }, { node_id: "new", body: pass }]]);
    return "{}";
  };
  return { calls, run };
}

test("posts the pass, then hides the earlier ones", () => {
  const { calls, run } = fake();
  const out = postPass(["7", "ui", "pass.md"], run, () => pass);
  assert.match(out, /issuecomment-9\nissue #7 ui: minimized 1 earlier comment\(s\)/);
  assert.ok(calls[0].startsWith("issue comment 7 --body-file pass.md"));
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
