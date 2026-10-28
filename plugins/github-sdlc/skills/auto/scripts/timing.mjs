/**
 * How long each stage of one issue took, read from the timestamps GitHub already holds: the
 * claim, each design stage's passes and `review-passed` label, the pull request's creation, its
 * `ai-review:completed` label and its merge. Only events after the latest claim count, so a
 * stage designed in an earlier session shows as not run here. Time spent with `needs-user` set
 * is the user's, so it is reported apart.
 *
 * Usage: node timing.mjs <issue> [<pr>]; prints one line for the issue.
 */
import { realpathSync } from "node:fs";
import { capture } from "../../merge-pr/scripts/capture.mjs";

export const STAGES = [
  ["criteria", "criteria-agent"],
  ["ui", "ui-agent"],
  ["technical", "technical-agent"],
  ["test", "test-agent"],
];

const at = (e) => Date.parse(e.created_at);
const minutes = (ms) => Math.round(ms / 60000);
const labeled = (events, name) => events.filter((e) => e.event === "labeled" && e.label?.name === name);

export const WAITING = "needs-user";

/**
 * The spans `needs-user` was set, oldest first; one still set runs to `now`.
 *
 * @param {{ event: string, created_at: string, label?: { name: string } }[]} events
 * @returns {[number, number][]}
 */
export function waits(events, now) {
  const spans = [];
  let from = null;
  for (const e of [...events].sort((a, b) => at(a) - at(b))) {
    if (e.label?.name !== WAITING) continue;
    if (e.event === "labeled" && from === null) from = at(e);
    if (e.event === "unlabeled" && from !== null) {
      spans.push([from, at(e)]);
      from = null;
    }
  }
  if (from !== null) spans.push([from, now]);
  return spans;
}

const overlap = (from, to, spans) =>
  spans.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(to, b) - Math.max(from, a)), 0);

/**
 * Each row's minutes leave out the time `needs-user` was set; a `waiting` row before the total
 * holds that time, and the total is wall clock.
 *
 * @param {{ event: string, created_at: string, label?: { name: string }, body?: string }[]} issueEvents oldest first
 * @param {{ createdAt: string, mergedAt?: string | null, reviews: { body?: string }[] } | null} pr
 * @param {{ event: string, created_at: string, label?: { name: string } }[]} prEvents oldest first
 * @param {number} now
 * @returns {{ stage: string, minutes: number, passes?: number }[]}
 */
export function timing(issueEvents, pr, prEvents, now) {
  const claims = issueEvents.filter((e) => e.event === "assigned");
  if (claims.length === 0) return [];
  const claim = at(claims.at(-1));
  const after = issueEvents.filter((e) => at(e) >= claim);
  const waiting = waits([...after, ...prEvents.filter((e) => at(e) >= claim)], now);
  const rows = [];
  const row = (stage, from, to, passes) =>
    rows.push({
      stage,
      minutes: minutes(to - from - overlap(from, to, waiting)),
      ...(passes === undefined ? {} : { passes }),
    });
  let mark = claim;
  for (const [stage, prefix] of STAGES) {
    const passes = after.filter(
      (e) => e.event === "commented" && (e.body ?? "").startsWith(`<!-- design-pass:${stage} -->`),
    ).length;
    const passed = labeled(after, `${prefix}:review-passed`).at(-1);
    if (passes === 0 && !passed) continue;
    const end = passed ? at(passed) : now;
    row(stage, mark, end, passes);
    mark = end;
  }
  const opened = pr ? Date.parse(pr.createdAt) : now;
  row("build", mark, opened);
  const end = pr?.mergedAt ? Date.parse(pr.mergedAt) : now;
  if (pr) {
    const completed = labeled(prEvents, "ai-review:completed").at(-1);
    const reviewed = completed ? at(completed) : end;
    const passes = pr.reviews.filter((r) => /^<!-- audit-(pass|verify) -->/.test(r.body ?? "")).length;
    row("review", opened, reviewed, passes);
    if (pr.mergedAt) row("merge", reviewed, end);
  }
  const waited = minutes(overlap(claim, end, waiting));
  if (waited > 0) rows.push({ stage: "waiting", minutes: waited });
  if (pr) rows.push({ stage: "total", minutes: minutes(end - claim) });
  return rows;
}

/** @param {{ stage: string, minutes: number, passes?: number }[]} rows */
export function format(rows) {
  return rows
    .map((r) => {
      const passes = r.passes === undefined ? "" : ` (${r.passes} pass${r.passes === 1 ? "" : "es"})`;
      return `${r.stage} ${r.minutes} min${passes}`;
    })
    .join(" · ");
}

const timeline = (n) =>
  JSON.parse(capture("gh", ["api", "--paginate", "--slurp", `repos/{owner}/{repo}/issues/${n}/timeline`])).flat();

if (process.argv[1] !== undefined && import.meta.filename === realpathSync(process.argv[1])) {
  const [issue, pr] = process.argv.slice(2);
  if (issue === undefined) {
    console.error("usage: node timing.mjs <issue> [<pr>]");
    process.exit(2);
  }
  const prData = pr
    ? JSON.parse(capture("gh", ["pr", "view", pr, "--json", "createdAt,mergedAt,reviews"]))
    : null;
  const rows = timing(timeline(issue), prData, pr ? timeline(pr) : [], Date.now());
  console.log(rows.length === 0 ? `#${issue}: no claim found` : `#${issue}: ${format(rows)}`);
}
