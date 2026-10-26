import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { isAuditor, rejects } from "./read-only-bash.mjs";

const SCRIPT = new URL("./read-only-bash.mjs", import.meta.url).pathname;

const READS = [
  'head=$(gh pr view "$n" --json headRefOid --jq .headRefOid)',
  'git fetch --quiet origin main "$head"',
  "git worktree prune",
  'git worktree add --detach --quiet "$dir" "$head"',
  "git -C \"$dir\" diff origin/main...HEAD -- . ':(exclude)lock.json'",
  'gh pr view "$n" --json title,body',
  "gh issue view 12 --json title,body",
  'gh pr checks "$n"',
  "gh api 'repos/{owner}/{repo}/pulls/7/comments' --jq '.[].id'",
  "gh api repos/o/r/issues/7/dependencies/blocked_by --jq length",
  "gh run view 123 --log-failed",
  "git log --oneline -5",
];

const WRITES = [
  "git commit -m 'fix: apply finding'",
  "git push",
  "cd /tmp && git -C /repo push origin HEAD",
  "git -c core.editor=true rebase -i main",
  "git checkout feat/1-slug",
  "git worktree remove .claude/worktrees/353",
  "gh pr review 7 --comment -b x",
  "gh pr comment 7 -b x",
  "gh issue comment 7 -b x",
  "gh issue edit 7 --add-label ui-agent:review-passed",
  "gh pr merge 7 --squash",
  'git -C "/a b" push',
  "gh label create x",
  "gh api 'repos/{owner}/{repo}/pulls/7/reviews' --input pass.json",
  "gh api repos/o/r/issues/7/labels -f labels[]=x",
  "gh api -X DELETE repos/o/r/issues/comments/1",
  "gh api --method PATCH repos/o/r/pulls/7",
];

test("every read a review pass runs gets through", () => {
  for (const c of READS) assert.equal(rejects(c), null, c);
});

test("every write is refused", () => {
  for (const c of WRITES) assert.notEqual(rejects(c), null, c);
});

test("isAuditor accepts the bare and plugin-scoped names and nothing else", () => {
  for (const t of ["pr-auditor", "design-auditor", "github-sdlc:pr-auditor", "github-sdlc:design-auditor"])
    assert.ok(isAuditor(t), t);
  for (const t of ["Explore", "general-purpose", "my-pr-auditor", "pr-auditor-2", undefined, ""])
    assert.ok(!isAuditor(t), String(t));
});

function hook(payload) {
  return spawnSync("node", [SCRIPT], {
    input: typeof payload === "string" ? payload : JSON.stringify(payload),
    encoding: "utf8",
  });
}

test("a review agent's write exits 2 with the reason, which is what blocks the call", () => {
  const result = hook({ agent_type: "github-sdlc:pr-auditor", tool_input: { command: "git push" } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^Refused: this command changes a branch/);
});

test("a review agent's read exits 0", () => {
  assert.equal(hook({ agent_type: "design-auditor", tool_input: { command: "git status" } }).status, 0);
});

test("any other caller passes, even with a write", () => {
  assert.equal(hook({ tool_input: { command: "git push" } }).status, 0);
  assert.equal(hook({ agent_type: "Explore", tool_input: { command: "git push" } }).status, 0);
});

test("a payload it cannot read passes, so an ordinary session is never broken", () => {
  assert.equal(hook("not json").status, 0);
  assert.equal(hook("").status, 0);
});
