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

const PREFIX = Object.fromEntries(STAGES.map(([stage, prefix]) => [prefix, stage]));

/**
 * The stage an issue event is work on: a design pass comment or a stage label.
 *
 * @param {{ event: string, label?: { name: string }, body?: string }} e
 */
function stageOf(e) {
  if (e.event === "commented") return /^<!-- design-pass:(\w+) -->/.exec(e.body ?? "")?.[1] ?? null;
  if (e.event === "labeled" || e.event === "unlabeled") return PREFIX[e.label?.name?.split(":")[0]] ?? null;
  return null;
}

/**
 * Splits the time from the latest claim into intervals between events, and credits each to
 * the stage of the event that ends it: a design pass or stage label to its stage, the pull
 * request's opening to build, a review pass or review label to review, the merge to merge. A
 * stage reopened while the pull request is open is credited again, so no row runs backwards
 * and the rows sum to the total. Time with `needs-user` set leaves every row for a `waiting`
 * row; the total is wall clock.
 *
 * @param {{ event: string, created_at: string, label?: { name: string }, body?: string }[]} issueEvents oldest first
 * @param {{ createdAt: string, mergedAt?: string | null, reviews: { body?: string, submittedAt?: string }[] } | null} pr
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
  const isPass = (r) => /^<!-- audit-(pass|verify) -->/.test(r.body ?? "");

  const marks = after.map((e) => [at(e), stageOf(e)]).filter(([, stage]) => stage !== null);
  if (pr) {
    marks.push([Date.parse(pr.createdAt), "build"]);
    for (const r of pr.reviews.filter((r) => isPass(r) && r.submittedAt)) marks.push([Date.parse(r.submittedAt), "review"]);
    for (const e of prEvents.filter((e) => e.label?.name?.startsWith("ai-review:"))) marks.push([at(e), "review"]);
    if (pr.mergedAt) marks.push([Date.parse(pr.mergedAt), "merge"]);
  }
  marks.sort((x, y) => x[0] - y[0]);
  const end = pr?.mergedAt ? Date.parse(pr.mergedAt) : now;
  if (!pr?.mergedAt) {
    const last = marks.at(-1)?.[1];
    const designing = last && last !== "build" && !after.some((e) => at(e) === marks.at(-1)[0] && e.label?.name?.endsWith(":review-passed"));
    marks.push([now, pr ? "review" : designing ? last : "build"]);
  }

  const spent = new Map();
  let from = claim;
  for (const [t, stage] of marks) {
    if (t <= from) continue;
    spent.set(stage, (spent.get(stage) ?? 0) + (t - from) - overlap(from, t, waiting));
    from = t;
  }

  const rows = [];
  for (const [stage] of STAGES) {
    const passes = after.filter((e) => e.event === "commented" && stageOf(e) === stage).length;
    if (passes === 0 && !spent.has(stage)) continue;
    rows.push({ stage, minutes: minutes(spent.get(stage) ?? 0), passes });
  }
  rows.push({ stage: "build", minutes: minutes(spent.get("build") ?? 0) });
  if (pr) rows.push({ stage: "review", minutes: minutes(spent.get("review") ?? 0), passes: pr.reviews.filter(isPass).length });
  if (pr?.mergedAt) rows.push({ stage: "merge", minutes: minutes(spent.get("merge") ?? 0) });
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
