import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { severity } from "./merge-gate.mjs";

/**
 * The other half of the merge gate's severity condition. `review-pr`'s table defines the
 * vocabulary and the gate reads it back out of a posted comment, so a severity the table
 * defines and the gate cannot parse is invisible where it matters most: the gate's whole job
 * is to stop on the severities it cannot see.
 */
const REVIEW = readFileSync(new URL("../../review-pr/SKILL.md", import.meta.url), "utf8");

/** The first cell of every row in the severity table, header and rule dropped. */
function severities() {
  const rows = REVIEW.slice(REVIEW.indexOf("| Severity | Means |")).split("\n").slice(2);
  const end = rows.findIndex((row) => !row.startsWith("|"));
  return rows.slice(0, end === -1 ? rows.length : end).map((row) => {
    const name = /^\|\s*`([a-z]+)`/.exec(row)?.[1];
    if (!name) throw new Error(`a severity row this test cannot read: ${row}`);
    return name;
  });
}

test("review-pr has a severity table to read", () => {
  assert.ok(severities().length > 0);
});

test("the gate parses a finding of every severity the table defines", () => {
  for (const name of severities())
    assert.equal(severity(`**${name}** — the finding`), name, `the gate cannot read a ${name} finding`);
});

test("the gate parses the example finding review-pr shows", () => {
  const example = /## 3\. Finding format[\s\S]*?```\n([\s\S]*?)```/.exec(REVIEW)?.[1];
  assert.ok(example, "review-pr shows no example finding under its Finding format heading");
  assert.ok(severities().includes(severity(example)), "the example does not read as a severity");
});
