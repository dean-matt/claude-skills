import assert from "node:assert/strict";
import { test } from "node:test";
import { format, phaseOf, tally, usages } from "./tokens.mjs";

const turn = (id, at, usage) =>
  JSON.stringify({ type: "assistant", timestamp: at, message: { id, usage } });
const u = (input, cacheWrite, cacheRead, output) => ({
  input_tokens: input,
  cache_creation_input_tokens: cacheWrite,
  cache_read_input_tokens: cacheRead,
  output_tokens: output,
});

test("a subagent's phase comes from its type and description", () => {
  assert.equal(phaseOf({ agentType: "github-sdlc:pr-auditor", description: "Full review of PR 7" }), "review");
  assert.equal(phaseOf({ agentType: "general-purpose", description: "Build issue 1064" }), "build");
  assert.equal(phaseOf({ agentType: "general-purpose", description: "Screenshots for #1064" }), "build");
  assert.equal(phaseOf({ agentType: "general-purpose", description: "Merge gate for PR 7" }), "merge");
  assert.equal(phaseOf({ agentType: "general-purpose", description: "Write criteria for #9" }), "criteria");
  assert.equal(phaseOf({}), "auto");
});

test("a message streamed as several records counts once, and only inside the window", () => {
  const lines = [
    turn("a", "2026-10-29T10:00:00Z", u(1, 10, 100, 5)),
    turn("a", "2026-10-29T10:00:01Z", u(1, 10, 100, 9)),
    turn("b", "2026-10-29T12:00:00Z", u(1, 1, 1, 1)),
    "not json",
  ];
  const from = Date.parse("2026-10-29T09:00:00Z");
  const to = Date.parse("2026-10-29T11:00:00Z");
  assert.deepEqual(usages(lines, from, to), [{ input: 1, cacheWrite: 10, cacheRead: 100, output: 9 }]);
});

test("tally sums each phase and format prints phases, the total and the split", () => {
  const at = "2026-10-29T10:00:00Z";
  const sums = tally(
    [
      { phase: "build", lines: [turn("a", at, u(0, 0, 1_500_000, 20_000))] },
      { phase: "review", lines: [turn("b", at, u(0, 0, 400_000, 5_000))] },
      { phase: "build", lines: [turn("c", at, u(0, 0, 500_000, 0))] },
    ],
    0,
    Date.parse("2026-10-30T00:00:00Z"),
  );
  assert.equal(format(sums), "build 2.0M · review 405k · total 2.4M (output 25k, cache reads 2.4M)");
});
