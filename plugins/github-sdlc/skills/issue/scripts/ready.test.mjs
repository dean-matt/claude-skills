import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const SCRIPT = new URL("./ready.sh", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "ready-test-"));

// A `gh` that answers `gh api <path> [--jq expr]` from fixture files and filters with real jq.
writeFileSync(
  join(dir, "gh"),
  `#!/usr/bin/env bash
shift; path=$1; shift; expr=.
while [ $# -gt 0 ]; do [ "$1" = --jq ] && expr=$2; shift; done
case $path in
  */dependencies/blocked_by) f=$FX/blockers.json ;;
  */sub_issues) f=$FX/children.json ;;
  *) f=$FX/issue.json ;;
esac
jq -r "$expr" "$f"
`,
);
chmodSync(join(dir, "gh"), 0o755);

function ready({ labels = [], body = "", blockers = [], children = [], state = "open" }, ...flags) {
  writeFileSync(join(dir, "issue.json"), JSON.stringify({ state, body, labels: labels.map((name) => ({ name })) }));
  writeFileSync(join(dir, "blockers.json"), JSON.stringify(blockers));
  writeFileSync(join(dir, "children.json"), JSON.stringify(children));
  const r = spawnSync("bash", [SCRIPT, ...flags, "5", "o/r"], {
    encoding: "utf8",
    env: { ...process.env, FX: dir, PATH: `${dir}:${process.env.PATH}` },
  });
  return { code: r.status, out: r.stdout.trim() };
}

const PASSED = ["type:feat", "criteria-agent:review-passed", "technical-agent:review-passed", "test-agent:review-passed"];

test("a pipeline issue with every stage passed is ready", () => {
  assert.deepEqual(ready({ labels: PASSED, body: "x" }), { code: 0, out: "ready" });
});

test("a stage that has not passed review blocks, and a stage with findings says so", () => {
  const r = ready({ labels: ["type:feat", "criteria-agent:review-passed"], body: "x" });
  assert.equal(r.code, 1);
  assert.match(r.out, /technical has not passed review/);
  const f = ready({ labels: [...PASSED, "test-agent:changes-requested"], body: "x" });
  assert.match(f.out, /test review has findings/);
});

test("a UI/UX Design heading makes the ui stage required", () => {
  const r = ready({ labels: PASSED, body: "## UI/UX Design\nsketch\n" });
  assert.equal(r.code, 1);
  assert.match(r.out, /ui has not passed review/);
  assert.equal(ready({ labels: [...PASSED, "ui-agent:review-passed"], body: "## UI/UX Design\n" }).code, 0);
});

test("a large body does not hide the UI heading, on every run", () => {
  const body = `## UI/UX Design\nsketch\n${"x".repeat(59)}\n`.concat(`${"x".repeat(59)}\n`.repeat(1000));
  for (let i = 0; i < 12; i++) {
    const r = ready({ labels: PASSED, body });
    assert.equal(r.code, 1, `run ${i}: ${r.out}`);
    assert.match(r.out, /ui has not passed review/);
  }
});

test("an issue with two type labels does not crash the script", () => {
  const r = ready({ labels: [...PASSED, "type:chore"], body: "x" });
  assert.equal(r.code, 0);
});

test("a spike needs only the criteria stage", () => {
  assert.equal(ready({ labels: ["type:spike", "criteria-agent:review-passed"], body: "x" }).code, 0);
});

test("a legacy issue is checked for blockers, parents and open questions too", () => {
  const blocked = ready({ labels: ["type:feat"], body: "x", blockers: [{ number: 819, state: "open" }] });
  assert.deepEqual([blocked.code, blocked.out], [1, "not ready: blocked by #819"]);
  assert.match(ready({ labels: ["type:feat"], body: "x", children: [{ state: "open" }] }).out, /parent with 1 open/);
  assert.match(
    ready({ labels: ["type:feat"], body: "## Open questions\n\n- [ ] Wait for M7\n" }).out,
    /1 open question/,
  );
});

test("a clean legacy issue is offered, not built silently", () => {
  assert.deepEqual(ready({ labels: ["type:feat"], body: "x" }), { code: 2, out: "not in the pipeline" });
  const closedBlocker = ready({ labels: ["type:feat"], body: "x", blockers: [{ number: 1, state: "closed" }] });
  assert.equal(closedBlocker.code, 2);
});

test("only the Open questions section counts, and ticked items are done", () => {
  const body = "## Out of scope\n- [ ] not a question\n\n## Open questions\n- [x] answered\n";
  assert.equal(ready({ labels: PASSED, body }).code, 0);
});

test("a closed issue is not ready", () => {
  assert.match(ready({ labels: PASSED, body: "x", state: "closed" }).out, /issue is closed/);
});

test("--design reports a stage gap or a missing pipeline as needing design, not as a failure", () => {
  const partial = ready({ labels: ["type:feat", "criteria-agent:changes-requested"], body: "x" }, "--design");
  assert.equal(partial.code, 3);
  assert.match(partial.out, /^needs design: criteria review has findings to address; criteria has not passed review/);
  assert.equal(ready({ labels: ["type:feat"], body: "x" }, "--design").out, "needs design: not in the pipeline");
});

test("--design still refuses an issue that is blocked, whatever its stages", () => {
  const r = ready({ labels: ["type:feat"], body: "x", blockers: [{ number: 9, state: "open" }] }, "--design");
  assert.equal(r.code, 1);
  assert.match(r.out, /blocked by #9/);
});

test("--design on a fully designed issue is ready", () => {
  assert.deepEqual(ready({ labels: PASSED, body: "x" }, "--design"), { code: 0, out: "ready" });
});

test("--design hands an unticked open question to the pipeline; without it the question blocks", () => {
  const body = "## Open questions\n- [ ] which one?\n";
  const d = ready({ labels: PASSED, body }, "--design");
  assert.deepEqual(d, { code: 3, out: "needs design: 1 open question(s) unticked" });
  assert.equal(ready({ labels: PASSED, body }).code, 1);
});

test("a folded UI/UX Design heading makes the ui stage required", () => {
  const body = "<details open>\n<summary><h2>UI/UX Design</h2></summary>\n\nsketch\n\n</details>\n";
  assert.match(ready({ labels: PASSED, body }).out, /ui has not passed review/);
});

test("open questions end at a folded heading", () => {
  const body = "## Open questions\n- [x] done\n\n<details open>\n<summary><h2>Test Design</h2></summary>\n\n- [ ] AC1 check\n\n</details>\n";
  assert.deepEqual(ready({ labels: PASSED, body }), { code: 0, out: "ready" });
});

test("an unclosed <details> blocks, and a balanced pair does not", () => {
  const open = "<details open>\n<summary><h2>Acceptance criteria</h2></summary>\n\n- AC1\n";
  const r = ready({ labels: PASSED, body: open });
  assert.equal(r.code, 1);
  assert.match(r.out, /1 <details> opened and 0 closed/);
  assert.deepEqual(ready({ labels: PASSED, body: `${open}\n</details>\n` }), { code: 0, out: "ready" });
});
