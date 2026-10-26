import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const SCRIPT = new URL("./next.sh", import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), "next-test-"));

// A ready.sh that answers from a table: 1 blocked, 2 needs design, 3 ready, 4 ready, 5+ blocked.
// It records the flag it was given, since only --design may take an issue that needs design.
const stub = join(dir, "ready.sh");
writeFileSync(
  stub,
  `#!/usr/bin/env bash
flag=""; [ "$1" = --design ] && { flag=$1; shift; }
case $1 in
  2) if [ -n "$flag" ]; then echo "needs design: criteria has not passed review"; exit 3; fi
     echo "not ready: criteria has not passed review"; exit 1 ;;
  3|4) echo ready ;;
  *) echo "not ready: blocked by #9"; echo "not ready: 1 open question(s) unticked"; exit 1 ;;
esac
`,
);
chmodSync(stub, 0o755);

function next(args, stdin = "") {
  const r = spawnSync("bash", [SCRIPT, ...args], {
    encoding: "utf8",
    input: stdin,
    env: { ...process.env, READY: stub, REPO: "o/r" },
  });
  return { code: r.status, lines: r.stdout.trim().split("\n") };
}

test("takes the first ready issue in rank order and says why the ones above it were skipped", () => {
  const r = next(["1", "2", "4", "3"]);
  assert.equal(r.code, 0);
  assert.deepEqual(r.lines, [
    "1: not ready: blocked by #9; not ready: 1 open question(s) unticked",
    "2: not ready: criteria has not passed review",
    "4: ready",
    "3: ready",
    "take 4",
  ]);
});

test("rank order is the argument order, not the number order", () => {
  assert.equal(next(["4", "3"]).lines.at(-1), "take 4");
});

test("--design takes an issue that needs design when it ranks above a ready one", () => {
  const r = next(["--design", "1", "2", "3"]);
  assert.equal(r.lines.at(-1), "take 2");
  assert.match(r.lines[1], /^2: needs design: criteria/);
});

test("prints none when no candidate is takeable, and reads candidates from stdin", () => {
  assert.deepEqual(next([], "1\n5\n").lines.at(-1), "none");
});

test("stops after the first batch holding a takeable issue", () => {
  const blocked = Array.from({ length: 10 }, (_, i) => String(10 + i));
  const r = next([...blocked, "1", "3", ...blocked.slice(0, 8), "99"]);
  assert.equal(r.lines.at(-1), "take 3");
  assert.ok(!r.lines.some((l) => l.startsWith("99:")));
});
