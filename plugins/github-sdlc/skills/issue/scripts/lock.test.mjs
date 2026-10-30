import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const SCRIPT = new URL("./lock.mjs", import.meta.url).pathname;
const repo = mkdtempSync(join(tmpdir(), "lock-test-"));
execFileSync("git", ["init", "--quiet", repo]);

// Two live "sessions" are two sleeping processes; a dead one is a process that has exited.
const sessions = [spawn("sleep", ["60"]), spawn("sleep", ["60"])];
const [a, b] = sessions.map((s) => s.pid);
const dead = spawn("true");
await new Promise((resolve) => dead.on("exit", resolve));

after(() => sessions.forEach((s) => s.kill()));

function lock(pid, ...args) {
  const r = spawnSync("node", [SCRIPT, ...args], { cwd: repo, encoding: "utf8", env: { ...process.env, CLAUDE_PID: String(pid) } });
  return { code: r.status, out: r.stdout.trim() };
}

test("a free issue is acquired, and acquiring it again is still ours", () => {
  assert.deepEqual(lock(a, "acquire", "12"), { code: 0, out: "held" });
  assert.deepEqual(lock(a, "acquire", "12"), { code: 0, out: "held" });
  assert.equal(lock(a, "status", "12").out, "ours");
});

test("a second live session is refused and told the holder", () => {
  assert.deepEqual(lock(b, "acquire", "12"), { code: 1, out: `busy ${a}` });
  assert.equal(lock(b, "status", "12").out, `busy ${a}`);
});

test("others lists what another live session holds and not its own", () => {
  lock(b, "acquire", "7");
  assert.equal(lock(a, "others").out, "7");
  assert.equal(lock(b, "others").out, "12");
});

test("release drops our lock and leaves another session's", () => {
  lock(b, "release", "12");
  assert.equal(lock(a, "status", "12").out, "ours");
  lock(a, "release", "12");
  assert.equal(lock(b, "status", "12").out, "free");
  assert.deepEqual(lock(b, "acquire", "12"), { code: 0, out: "held" });
});

test("a lock whose process died is stale: ignored, and taken over", () => {
  lock(dead.pid, "acquire", "30");
  assert.equal(lock(a, "status", "30").out, "free");
  assert.equal(lock(a, "others").out.split("\n").includes("30"), false);
  assert.deepEqual(lock(a, "acquire", "30"), { code: 0, out: "held" });
  assert.equal(lock(b, "status", "30").out, `busy ${a}`);
});

test("a lock works from a worktree of the same clone", () => {
  execFileSync("git", ["-C", repo, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "--allow-empty", "-m", "x", "--quiet"]);
  const tree = join(repo, "wt");
  execFileSync("git", ["-C", repo, "worktree", "add", "--quiet", tree]);
  const r = spawnSync("node", [SCRIPT, "status", "12"], { cwd: tree, encoding: "utf8", env: { ...process.env, CLAUDE_PID: String(a) } });
  assert.equal(r.stdout.trim(), `busy ${b}`);
});

test("clearing a lock another session just installed puts it back", async () => {
  const { clear } = await import("./lock.mjs");
  lock(b, "acquire", "40");
  const path = join(execFileSync("git", ["-C", repo, "rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim(), "sdlc-locks", "40");
  assert.equal(clear(path, { pid: a, start: "" }), false);
  assert.equal(lock(b, "status", "40").out, "ours");
});

test("the ancestor lookup finds a named process above it and returns 0 for none", async () => {
  const { ancestor } = await import("./lock.mjs");
  const parent = execFileSync("ps", ["-o", "comm=", "-p", String(process.ppid)], { encoding: "utf8" }).trim().split("/").pop();
  assert.equal(ancestor(parent), process.ppid);
  assert.equal(ancestor("no-such-process"), 0);
});

test("a missing or bad issue number is a usage error", () => {
  assert.equal(lock(a, "acquire").code, 2);
  assert.equal(lock(a, "acquire", "x").code, 2);
  assert.equal(lock(a, "nope", "1").code, 2);
});
