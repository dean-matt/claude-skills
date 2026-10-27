/**
 * Refuses a review pass whose findings the merge gate could not classify, before `review-pr`
 * posts it. A body the gate reads as `unreadable` blocks the merge, and a posted review cannot
 * be edited into shape, so the check runs on the JSON about to be sent.
 *
 * Only line comments are checked: the gate classifies those and never reads the body's prose.
 *
 * Usage: node check-pass.mjs <pass.json>; exits 1 and names each fault.
 */
import { readFileSync, realpathSync } from "node:fs";
import { PASS_MARKER, VERIFY_MARKER, severity } from "./merge-gate.mjs";

const BODY_FINDING = /^\s*(?:\d+[.)]\s*|[-*]\s*)?\*\*(?:critical|warning|comment)\*\*/i;

/**
 * @param {{ event?: string, body?: string, comments?: { path?: string, line?: number, body?: string }[] }} pass
 * @returns {string[]} one sentence per fault
 */
export function passFaults(pass) {
  const faults = [];
  const body = pass.body ?? "";
  if (!body.startsWith(PASS_MARKER) && !body.startsWith(VERIFY_MARKER))
    faults.push(`the body does not open with ${PASS_MARKER} or ${VERIFY_MARKER}`);
  for (const line of body.split("\n").filter((l) => BODY_FINDING.test(l)))
    faults.push(
      `the body carries a finding (${line.trim().slice(0, 40)}…) — post it inline on the nearest changed line`,
    );
  const blocking = (pass.comments ?? []).some((c) => ["critical", "warning"].includes(severity(c.body)));
  if (pass.event === "REQUEST_CHANGES" && !blocking)
    faults.push("event is REQUEST_CHANGES but no inline comment is a critical or warning");
  for (const c of pass.comments ?? []) {
    if (severity(c.body) === "unreadable")
      faults.push(
        `${c.path ?? "a comment"}:${c.line ?? "?"} does not open with **critical**, **warning** or **comment**`,
      );
  }
  return faults;
}

if (process.argv[1] !== undefined && import.meta.filename === realpathSync(process.argv[1])) {
  const file = process.argv[2];
  if (file === undefined) {
    console.error("usage: node check-pass.mjs <pass.json>");
    process.exit(2);
  }
  const faults = passFaults(JSON.parse(readFileSync(file, "utf8")));
  for (const f of faults) console.error(f);
  process.exit(faults.length === 0 ? 0 : 1);
}
