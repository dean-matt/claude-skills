import assert from "node:assert/strict";
import { test } from "node:test";
import { moveCard } from "./move-card.mjs";

const BOARD = { data: { repositoryOwner: { projectV2: { id: "P", field: { id: "F", options: [{ name: "Done", id: "D" }, { name: "Todo", id: "T" }] } } } } };

/** A fake `gh` that records its calls and answers like the real one. */
function gh({ failEditOnce = false } = {}) {
  const calls = [];
  let failed = false;
  const run = (_file, args) => {
    calls.push(args.slice(0, 2).join(" "));
    if (args[0] === "api") return JSON.stringify(BOARD);
    if (args[1] === "item-add") return JSON.stringify({ id: "I" });
    if (args[1] === "item-edit" && failEditOnce && !failed) {
      failed = true;
      throw new Error("stale id");
    }
    return "";
  };
  return { run, calls };
}
const store = () => {
  let text = "";
  return { read: () => { if (!text) throw new Error("none"); return text; }, write: (_p, s) => void (text = s) };
};
const args = { project: "1", owner: "o", url: "u", status: "Done" };

test("the first move reads the board, the next two calls only", () => {
  const f = gh();
  const s = store();
  moveCard(args, { run: f.run, ...s, now: () => 0 });
  assert.deepEqual(f.calls, ["api graphql", "project item-add", "project item-edit"]);
  const g = gh();
  moveCard({ ...args, status: "Todo" }, { run: g.run, ...s, now: () => 1000 });
  assert.deepEqual(g.calls, ["project item-add", "project item-edit"]);
});

test("a cache older than an hour is read again", () => {
  const s = store();
  moveCard(args, { run: gh().run, ...s, now: () => 0 });
  const f = gh();
  moveCard(args, { run: f.run, ...s, now: () => 61 * 60 * 1000 });
  assert.equal(f.calls[0], "api graphql");
});

test("a rejected cached id is read again once", () => {
  const s = store();
  moveCard(args, { run: gh().run, ...s, now: () => 0 });
  const f = gh({ failEditOnce: true });
  assert.equal(moveCard(args, { run: f.run, ...s, now: () => 1 }), "card moved to Done");
  assert.ok(f.calls.includes("api graphql"));
});

test("a status the board lacks throws NO_STATUS", () => {
  assert.throws(() => moveCard({ ...args, status: "Nope" }, { run: gh().run, ...store() }), { code: "NO_STATUS" });
});
