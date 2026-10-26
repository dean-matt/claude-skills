import assert from "node:assert/strict";
import { test } from "node:test";
import { readExpected, settle, waitChecks } from "./wait-checks.mjs";

const green = (name) => ({ name, bucket: "pass" });
const pending = (name) => ({ name, bucket: "pending" });
const red = (name) => ({ name, bucket: "fail" });

/** A clock the test advances, so no run sleeps. */
function clock() {
  let t = 0;
  return { now: () => t, wait: async (ms) => void (t += ms) };
}

test("settle sorts checks into failed, pending and missing", () => {
  assert.deepEqual(settle(["a", "b", "c"], [red("a"), pending("b")]), {
    failed: ["a"],
    pending: ["b"],
    missing: ["c"],
  });
});

test("settle waits on a first check when none is required and none has reported", () => {
  assert.deepEqual(settle([], []).missing, ["a first check to report"]);
  assert.deepEqual(settle([], [green("ci")]).missing, []);
});

test("exits 0 only after two consecutive green polls", async () => {
  const polls = [[green("ci")], [green("ci")]];
  const c = clock();
  const out = await waitChecks({ expected: ["ci"], read: async () => polls.shift(), ...c });
  assert.equal(out.code, 0);
  assert.equal(polls.length, 0);
});

test("a pending poll in between resets the green count", async () => {
  const polls = [[green("ci")], [pending("ci")], [green("ci")], [green("ci")]];
  const c = clock();
  const out = await waitChecks({ expected: ["ci"], read: async () => polls.shift(), ...c });
  assert.equal(out.code, 0);
  assert.equal(polls.length, 0);
});

test("exits 1 on a failure with nothing pending, but keeps waiting while something is", async () => {
  const c = clock();
  const out = await waitChecks({ expected: ["a", "b"], read: async () => [red("a")], ...c });
  assert.deepEqual([out.code, out.failed], [1, ["a"]]);
  const polls = [[red("a"), pending("b")], [red("a"), green("b")]];
  const c2 = clock();
  const out2 = await waitChecks({ expected: ["a", "b"], read: async () => polls.shift(), ...c2 });
  assert.equal(out2.code, 1);
  assert.equal(polls.length, 0);
});

test("exits 2 naming what it was waiting on when time runs out", async () => {
  const c = clock();
  const out = await waitChecks({
    expected: ["ci"],
    read: async () => [pending("ci")],
    timeoutMs: 40_000,
    intervalMs: 15_000,
    ...c,
  });
  assert.deepEqual([out.code, out.waiting], [2, ["ci"]]);
});

test("with no required name and nothing ever reported it times out waiting for a first check", async () => {
  const c = clock();
  const out = await waitChecks({ expected: [], read: async () => [], timeoutMs: 20_000, intervalMs: 15_000, ...c });
  assert.deepEqual([out.code, out.waiting], [2, ["a first check to report"]]);
});

test("readExpected retries once before the error stands", async () => {
  let calls = 0;
  const read = () => {
    if (++calls === 1) throw new Error("flaky");
    return ["ci"];
  };
  assert.deepEqual(await readExpected(read, async () => {}), ["ci"]);
  await assert.rejects(readExpected(() => { throw new Error("down"); }, async () => {}), /down/);
});
