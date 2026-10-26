/**
 * Reads the leftovers a build run can strand — issue worktrees, claim and feature branches,
 * and issue assignments — and prints one verdict per item. It changes nothing; the skill
 * deletes what the user confirms.
 *
 *   safe  work is merged or empty, so removing loses nothing
 *   ask   removing might lose work or a decision, so the user chooses
 *   keep  something still uses it
 *
 * Usage: node scan.mjs   (from any checkout of the repository)
 */
import { fileURLToPath } from "node:url";
import { capture } from "../../merge-pr/scripts/capture.mjs";

const CLAIM = /^[a-z]+\/(\d+)-/;

/**
 * @param {{
 *   base: string,
 *   worktrees: { path: string, branch: string | null, dirty: boolean }[],
 *   branches: { name: string, local: string | null, remote: string | null, ahead: number }[],
 *   prs: { number: number, state: string, head: string, sha: string, closes: number[] }[],
 *   assigned: number[],
 * }} facts
 * @returns {{ verdict: "safe" | "ask" | "keep", kind: string, ref: string, reason: string }[]}
 */
export function classify({ base, worktrees, branches, prs, assigned }) {
  const prFor = (name) => prs.find((p) => p.head === name);

  const branchVerdict = (b) => {
    const pr = prFor(b.name);
    if (pr?.state === "OPEN") return ["keep", `open pull request #${pr.number}`];
    if (pr?.state === "MERGED") {
      const tips = [b.local, b.remote].filter(Boolean);
      return tips.every((t) => t === pr.sha)
        ? ["safe", `merged in #${pr.number}`]
        : ["ask", `merged in #${pr.number}, but a copy has commits the merge lacks`];
    }
    if (pr) return ["ask", `pull request #${pr.number} closed without merging`];
    return b.ahead === 0
      ? ["safe", `no commits beyond ${base}, an abandoned claim`]
      : ["keep", `${b.ahead} commit(s) beyond ${base} and no pull request`];
  };

  const out = [];
  for (const w of worktrees) {
    const b = branches.find((x) => x.name === w.branch);
    if (w.dirty) out.push({ verdict: "keep", kind: "worktree", ref: w.path, reason: "uncommitted changes" });
    else if (!b) out.push({ verdict: "ask", kind: "worktree", ref: w.path, reason: "its branch is not a claim or feature branch" });
    else out.push({ verdict: branchVerdict(b)[0], kind: "worktree", ref: w.path, reason: branchVerdict(b)[1] });
  }
  for (const b of branches) {
    const [verdict, reason] = branchVerdict(b);
    out.push({ verdict, kind: "branch", ref: b.name, reason });
  }
  for (const n of assigned) {
    const held = branches.some((b) => b.name.match(CLAIM)?.[1] === String(n)) || prs.some((p) => p.state === "OPEN" && p.closes.includes(n));
    if (!held) out.push({ verdict: "ask", kind: "assignment", ref: `#${n}`, reason: "assigned to you with no branch or open pull request" });
  }
  return out;
}

/** The facts, read from git and GitHub. @param {typeof capture} run */
export function gather(run = capture) {
  const sh = (file, args, options) => run(file, args, { timeout: 60000, ...options });
  const json = (file, args) => JSON.parse(sh(file, args));
  const base = sh("gh", ["repo", "view", "--json", "defaultBranchRef", "--jq", ".defaultBranchRef.name"]).trim();
  sh("git", ["fetch", "--quiet", "--prune", "origin"]);

  const main = sh("git", ["rev-parse", "--show-toplevel"]).trim();
  const worktrees = sh("git", ["worktree", "list", "--porcelain"])
    .split("\n\n")
    .map((block) => ({
      path: /^worktree (.*)$/m.exec(block)?.[1] ?? "",
      branch: /^branch refs\/heads\/(.*)$/m.exec(block)?.[1] ?? null,
    }))
    .filter((w) => w.path && w.path !== main && w.path.includes("/.claude/worktrees/"))
    .map((w) => ({ ...w, dirty: sh("git", ["-C", w.path, "status", "--porcelain"]).trim() !== "" }));

  const tips = new Map();
  for (const line of sh("git", ["for-each-ref", "--format=%(refname) %(objectname)", "refs/heads", "refs/remotes/origin"]).split("\n")) {
    const [ref, sha] = line.split(" ");
    const local = ref?.startsWith("refs/heads/") ? ref.slice(11) : null;
    const remote = ref?.startsWith("refs/remotes/origin/") ? ref.slice(20) : null;
    const name = local ?? remote;
    if (!name || !CLAIM.test(name)) continue;
    const entry = tips.get(name) ?? { name, local: null, remote: null };
    if (local) entry.local = sha;
    else entry.remote = sha;
    tips.set(name, entry);
  }
  const branches = [...tips.values()].map((b) => ({
    ...b,
    ahead: Math.max(...[b.local, b.remote].filter(Boolean).map((sha) => Number(sh("git", ["rev-list", "--count", `origin/${base}..${sha}`]).trim()))),
  }));

  const prs = json("gh", ["pr", "list", "--state", "all", "--limit", "500", "--json", "number,state,headRefName,headRefOid,closingIssuesReferences"]).map((p) => ({
    number: p.number,
    state: p.state,
    head: p.headRefName,
    sha: p.headRefOid,
    closes: p.closingIssuesReferences.map((i) => i.number),
  }));
  const assigned = json("gh", ["issue", "list", "--assignee", "@me", "--state", "open", "--limit", "200", "--json", "number"]).map((i) => i.number);
  return { base, worktrees, branches, prs, assigned };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const rows = classify(gather());
  for (const r of rows) console.log([r.verdict, r.kind, r.ref, r.reason].join("\t"));
  if (rows.length === 0) console.log("nothing to clean up");
}
