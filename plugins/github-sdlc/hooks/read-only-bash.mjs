/**
 * PreToolUse hook for the review agent: rejects a Bash command that writes to the
 * repository, the remote or GitHub, so a review pass cannot finish the run it reviews.
 *
 * Plugin agents ignore `hooks` in their own frontmatter, so this runs for every Bash call in a
 * session (one short Node process each) and acts only where the payload's `agent_type` names
 * `pr-auditor`. Any other caller, and any payload it cannot read, passes: a hook that
 * blocked what it could not identify would break ordinary sessions. That makes this a fence
 * for an agent drifting into the next step, not one for an agent working around it.
 *
 * Reads the payload from stdin and exits 2 with the reason on stderr, which the harness hands
 * back to the agent in place of running the command. It matches words, not a parsed shell, so
 * a verb it does not list, or one hidden behind `eval` or a variable, gets through; parsing
 * the shell is the way out if that changes. Exports `rejects` and `isAuditor` for the tests.
 */
import { readFileSync, realpathSync } from "node:fs";

const GIT = String.raw`\bgit(?:\s+-[Cc]\s*(?:"[^"]*"|'[^']*'|\S+)|\s+--\S+(?:\s+[^-\s]\S*)?)*\s+`;

const RULES = [
  [
    new RegExp(
      `${GIT}(?:add|am|apply|branch|checkout|cherry-pick|clean|commit|merge|mv|pull|push|rebase|reset|restore|revert|rm|stash|switch|tag)\\b`,
    ),
    "changes a branch, the index or the remote",
  ],
  [
    new RegExp(`${GIT}worktree\\s+remove\\b[^;&|]*\\.claude/worktrees/`),
    "removes an issue's worktree",
  ],
  [
    /\bgh\s+(?:pr|issue)\s+(?:checkout|close|comment|create|delete|develop|edit|lock|merge|pin|ready|reopen|revert|review|transfer|unpin|update-branch)\b/,
    "writes to a pull request or an issue",
  ],
  [/\bgh\s+(?:label|project|release|workflow|run|repo)\s+(?!list\b|view\b)\S/, "writes to GitHub"],
  [
    /\bgh\s+api\b[^;&|]*(?:\s-X\s*(?!GET\b)\w|--method[\s=](?!GET\b)\w|\s-[fF]\s|--(?:raw-)?field\b|--input\b)/,
    "sends a write through the API",
  ],
];

/** The reason `command` is refused, or null where it only reads. */
export function rejects(command) {
  for (const [pattern, reason] of RULES) {
    if (pattern.test(command)) return reason;
  }
  return null;
}

/** Whether `agentType` names a review agent, bare or plugin-scoped (`github-sdlc:pr-auditor`). */
export function isAuditor(agentType) {
  return /(^|:)pr-auditor$/.test(agentType ?? "");
}

// ESM resolves symlinks and argv[1] does not, so comparing them raw fails open.
if (process.argv[1] !== undefined && import.meta.filename === realpathSync(process.argv[1])) {
  let reason = null;
  try {
    const payload = JSON.parse(readFileSync(0, "utf8"));
    if (isAuditor(payload.agent_type)) reason = rejects(payload.tool_input?.command ?? "");
  } catch {
    reason = null;
  }
  if (reason !== null) {
    console.error(
      `Refused: this command ${reason}. A review pass reads and reports; ` +
        "the session that dispatched it posts, labels, commits and pushes.",
    );
    process.exit(2);
  }
}
