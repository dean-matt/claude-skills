import assert from "node:assert/strict";
import { test } from "node:test";
import { passFaults } from "./check-pass.mjs";
import { PASS_MARKER } from "./merge-gate.mjs";

const comment = (body) => ({ path: "a.ts", line: 3, body });

test("a marked body with marked comments passes", () => {
  const pass = {
    body: `${PASS_MARKER}\nsummary`,
    comments: [comment("**comment** — a nit"), comment("**critical** — wrong")],
  };
  assert.deepEqual(passFaults(pass), []);
});

test("a pass that found nothing passes", () => {
  assert.deepEqual(passFaults({ body: PASS_MARKER }), []);
});

test("a comment the gate reads as unreadable is named", () => {
  for (const body of ["comment: a nit", "`critical` — wrong", "**Critical** — wrong", " **warning** — x"]) {
    assert.deepEqual(passFaults({ body: PASS_MARKER, comments: [comment(body)] }), [
      "a.ts:3 does not open with **critical**, **warning** or **comment**",
    ]);
  }
});

test("a body without the pass marker is named", () => {
  assert.equal(passFaults({ body: "findings" }).length, 1);
});

test("a finding written into the body is named, so it gets a thread", () => {
  const faults = passFaults({ body: `${PASS_MARKER}\n1. **warning** — parses 1e3 as 1000` });
  assert.equal(faults.length, 1);
  assert.match(faults[0], /post it inline/);
});

test("REQUEST_CHANGES needs a blocking inline comment", () => {
  const body = `${PASS_MARKER}\nsummary`;
  assert.equal(passFaults({ event: "REQUEST_CHANGES", body, comments: [comment("**comment** — nit")] }).length, 1);
  assert.deepEqual(passFaults({ event: "REQUEST_CHANGES", body, comments: [comment("**warning** — x")] }), []);
});
