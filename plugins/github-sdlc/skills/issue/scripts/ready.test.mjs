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

const AC = "- **AC1.** the sheet shows the total\n";
const L = ["type:feat"];

test("an issue with criteria and nothing open is ready", () => {
  assert.deepEqual(ready({ labels: L, body: AC }), { code: 0, out: "ready" });
});

test("an issue with no criteria is offered, not built silently", () => {
  assert.deepEqual(ready({ labels: L, body: "x" }), { code: 2, out: "no acceptance criteria" });
  const closedBlocker = ready({ labels: L, body: "x", blockers: [{ number: 1, state: "closed" }] });
  assert.equal(closedBlocker.code, 2);
});

test("blockers, parents and open questions block", () => {
  const blocked = ready({ labels: L, body: AC, blockers: [{ number: 819, state: "open" }] });
  assert.deepEqual([blocked.code, blocked.out], [1, "not ready: blocked by #819"]);
  assert.match(ready({ labels: L, body: AC, children: [{ state: "open" }] }).out, /parent with 1 open/);
  assert.match(ready({ labels: L, body: `## Open questions\n\n- [ ] Wait for M7\n${AC}` }).out, /1 open question/);
});

test("only the Open questions section counts, and ticked items are done", () => {
  const body = `## Out of scope\n- [ ] not a question\n\n## Open questions\n- [x] answered\n${AC}`;
  assert.equal(ready({ labels: L, body }).code, 0);
});

test("a closed issue is not ready", () => {
  assert.match(ready({ labels: L, body: AC, state: "closed" }).out, /issue is closed/);
});

test("--criteria hands missing criteria and open questions to issue, not as a failure", () => {
  assert.deepEqual(ready({ labels: L, body: "x" }, "--criteria"), { code: 3, out: "needs criteria: no acceptance criteria" });
  const body = `## Open questions\n- [ ] which one?\n${AC}`;
  assert.deepEqual(ready({ labels: L, body }, "--criteria"), { code: 3, out: "needs criteria: 1 open question(s) unticked" });
  assert.equal(ready({ labels: L, body }).code, 1);
});

test("--criteria still refuses an issue that is blocked", () => {
  const r = ready({ labels: L, body: "x", blockers: [{ number: 9, state: "open" }] }, "--criteria");
  assert.equal(r.code, 1);
  assert.match(r.out, /blocked by #9/);
});

test("--criteria on an issue with criteria is ready", () => {
  assert.deepEqual(ready({ labels: L, body: AC }, "--criteria"), { code: 0, out: "ready" });
});

test("open questions end at a folded heading", () => {
  const body = "## Open questions\n- [x] done\n\n<details open>\n<summary><h2>Acceptance criteria</h2></summary>\n\n- [ ] AC1 check\n\n</details>\n";
  assert.deepEqual(ready({ labels: L, body }), { code: 0, out: "ready" });
});

test("an unclosed <details> blocks, and a balanced pair does not", () => {
  const open = "<details open>\n<summary><h2>Acceptance criteria</h2></summary>\n\n- AC1\n";
  const r = ready({ labels: L, body: open });
  assert.equal(r.code, 1);
  assert.match(r.out, /1 <details> opened and 0 closed/);
  assert.deepEqual(ready({ labels: L, body: `${open}\n</details>\n` }), { code: 0, out: "ready" });
});

test("a large body does not hide the criteria, on every run", () => {
  const body = `${"x".repeat(59)}\n`.repeat(1000).concat(AC);
  for (let i = 0; i < 12; i++) assert.equal(ready({ labels: L, body }).code, 0, `run ${i}`);
});
