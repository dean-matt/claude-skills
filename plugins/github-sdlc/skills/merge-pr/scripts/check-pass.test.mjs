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
