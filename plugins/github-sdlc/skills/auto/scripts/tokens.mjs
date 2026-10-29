/**
 * How many tokens one issue cost, read from the Claude Code transcripts of the repository the
 * run worked in: the main session and every subagent it dispatched, from the latest claim to the
 * merge. A subagent's phase comes from its type and description; the main session is `auto`.
 *
 * Usage: node tokens.mjs <issue> [<pr>] [--dir <transcripts>]; prints one line for the issue.
 * The directory defaults to the one Claude Code keeps for the current working directory.
 */
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { capture } from "../../merge-pr/scripts/capture.mjs";

export const PHASES = ["criteria", "build", "review", "merge", "auto"];

/**
 * The phase a subagent worked on, from its metadata. Anything unrecognised counts as `auto`'s.
 *
 * @param {{ agentType?: string, description?: string }} meta
 */
export function phaseOf(meta) {
  const text = `${meta.agentType ?? ""} ${meta.description ?? ""}`.toLowerCase();
  if (/pr-auditor|review|verify/.test(text)) return "review";
  if (/merge|gate/.test(text)) return "merge";
  if (/criteria|reshape|\bissue skill\b|questions/.test(text)) return "criteria";
  if (/build|screenshot/.test(text)) return "build";
  return "auto";
}

/**
 * Usage per message from one transcript's lines, inside [from, to]. A message streams as several
 * records sharing an id; the last carries the final count.
 *
 * @param {string[]} lines
 * @returns {{ input: number, cacheWrite: number, cacheRead: number, output: number }[]}
 */
export function usages(lines, from, to) {
  const byId = new Map();
  for (const line of lines) {
    let record;
    try {
      record = JSON.parse(line);
    } catch {
      continue;
    }
    if (record.type !== "assistant" || !record.message?.usage) continue;
    const t = Date.parse(record.timestamp);
    if (!(t >= from && t <= to)) continue;
    const u = record.message.usage;
    byId.set(record.message.id ?? `${t}`, {
      input: u.input_tokens ?? 0,
      cacheWrite: u.cache_creation_input_tokens ?? 0,
      cacheRead: u.cache_read_input_tokens ?? 0,
      output: u.output_tokens ?? 0,
    });
  }
  return [...byId.values()];
}

const add = (a, b) => ({
  input: a.input + b.input,
  cacheWrite: a.cacheWrite + b.cacheWrite,
  cacheRead: a.cacheRead + b.cacheRead,
  output: a.output + b.output,
});
const ZERO = { input: 0, cacheWrite: 0, cacheRead: 0, output: 0 };
const total = (u) => u.input + u.cacheWrite + u.cacheRead + u.output;

/**
 * @param {{ phase: string, lines: string[] }[]} transcripts
 * @returns {Map<string, typeof ZERO>}
 */
export function tally(transcripts, from, to) {
  const sums = new Map();
  for (const { phase, lines } of transcripts)
    for (const u of usages(lines, from, to)) sums.set(phase, add(sums.get(phase) ?? ZERO, u));
  return sums;
}

const short = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `${Math.round(n / 1e3)}k` : `${n}`);

/** @param {Map<string, typeof ZERO>} sums */
export function format(sums) {
  const all = [...sums.values()].reduce(add, ZERO);
  const parts = PHASES.filter((p) => sums.has(p)).map((p) => `${p} ${short(total(sums.get(p)))}`);
  return `${[...parts, `total ${short(total(all))}`].join(" · ")} (output ${short(all.output)}, cache reads ${short(all.cacheRead)})`;
}

/** The transcripts in `dir` touched since `from`: each main session as `auto`, each subagent by phase. */
function transcripts(dir, from) {
  const found = [];
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".jsonl")) continue;
    const path = join(dir, name);
    if (statSync(path).mtimeMs < from) continue;
    found.push({ phase: "auto", lines: readFileSync(path, "utf8").split("\n") });
    const subs = join(dir, name.replace(/\.jsonl$/, ""), "subagents");
    if (!existsSync(subs)) continue;
    for (const sub of readdirSync(subs).filter((f) => f.endsWith(".jsonl"))) {
      const metaPath = join(subs, sub.replace(/\.jsonl$/, ".meta.json"));
      const meta = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : {};
      found.push({ phase: phaseOf(meta), lines: readFileSync(join(subs, sub), "utf8").split("\n") });
    }
  }
  return found;
}

if (process.argv[1] !== undefined && import.meta.filename === realpathSync(process.argv[1])) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--dir");
  const dir = at === -1 ? join(homedir(), ".claude", "projects", process.cwd().replace(/[/.]/g, "-")) : args[at + 1];
  const [issue, pr] = at === -1 ? args : args.filter((a, i) => i !== at && i !== at + 1);
  if (issue === undefined) {
    console.error("usage: node tokens.mjs <issue> [<pr>] [--dir <transcripts>]");
    process.exit(2);
  }
  const events = JSON.parse(
    capture("gh", ["api", "--paginate", "--slurp", `repos/{owner}/{repo}/issues/${issue}/timeline`]),
  ).flat();
  const claim = events.filter((e) => e.event === "assigned").at(-1);
  if (!claim) {
    console.log(`#${issue}: no claim found`);
    process.exit(0);
  }
  const from = Date.parse(claim.created_at);
  const merged = pr ? JSON.parse(capture("gh", ["pr", "view", pr, "--json", "mergedAt"])).mergedAt : null;
  const to = merged ? Date.parse(merged) + 5 * 60 * 1000 : Date.now();
  console.log(`#${issue} tokens: ${format(tally(transcripts(dir, from), from, to))}`);
}
