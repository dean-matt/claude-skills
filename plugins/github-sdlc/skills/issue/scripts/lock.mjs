/**
 * Keeps two sessions on one login from working the same issue. An issue's assignee is the same
 * login in both, so the assignee cannot tell them apart; a lock directory per issue can.
 *
 *   node lock.mjs acquire <n>   print `held`, or `busy <pid>` (exit 1) where another live session holds it
 *   node lock.mjs status <n>    print `free`, `ours` or `busy <pid>`
 *   node lock.mjs others        print each issue number another live session holds
 *   node lock.mjs release <n>   drop this session's lock; another session's stays
 *
 * A session is the Claude Code process (`CLAUDE_PID`, which Claude Code exports, else the nearest
 * ancestor whose command is `claude`), so a subagent and its parent share a lock. With neither it
 * exits 2 rather than lock on a shell that dies with the call. Liveness reads `ps`, so it needs a
 * POSIX system.
 * A lock whose process has died, or whose pid a later process reused, is stale: `acquire` takes
 * it over and `status` and `others` ignore it. Locks live in the repository's common git
 * directory, so every worktree of one clone sees them. They do not span machines.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/** @param {string|number} pid process start time, or "" where the process is gone */
function started(pid) {
  try {
    return execFileSync("ps", ["-o", "lstart=", "-p", String(pid)], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

/** The nearest ancestor of this process whose command is `name`, or 0. */
export function ancestor(name = "claude") {
  let pid = process.ppid;
  for (let depth = 0; pid > 1 && depth < 20; depth++) {
    try {
      const [ppid, ...comm] = execFileSync("ps", ["-o", "ppid=,comm=", "-p", String(pid)], { encoding: "utf8" }).trim().split(/\s+/);
      if (comm.join(" ").split("/").pop() === name) return pid;
      pid = Number(ppid);
    } catch {
      return 0;
    }
  }
  return 0;
}

export function self(env = process.env) {
  const pid = Number(env.CLAUDE_PID) || ancestor();
  if (!pid) {
    console.error("lock.mjs: no Claude Code session found (CLAUDE_PID unset, no claude ancestor)");
    process.exit(2);
  }
  return { pid, start: started(pid) };
}

function locksDir() {
  const common = execFileSync("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { encoding: "utf8" }).trim();
  const dir = join(common, "sdlc-locks");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Who holds the lock at `path`: `free` where there is none or its holder is gone.
 * @returns {{ state: "free" | "ours" | "busy", pid?: number }}
 */
export function inspect(path, me = self()) {
  let owner;
  try {
    owner = JSON.parse(readFileSync(join(path, "owner"), "utf8"));
  } catch {
    return { state: "free" };
  }
  if (owner.pid === me.pid && owner.start === me.start) return { state: "ours", pid: owner.pid };
  if (started(owner.pid) !== owner.start || owner.start === "") return { state: "free" };
  return { state: "busy", pid: owner.pid };
}

/**
 * Moves a stale lock aside and deletes it. The move is checked: where the lock it took was live,
 * another session had just replaced the stale one, so it is put back and nothing is cleared.
 */
export function clear(path, me = self()) {
  const aside = `${path}.stale-${process.pid}`;
  try {
    renameSync(path, aside);
  } catch {
    return true;
  }
  if (inspect(aside, me).state === "free") {
    rmSync(aside, { recursive: true, force: true });
    return true;
  }
  try {
    renameSync(aside, path);
  } catch {
    // A third session took `path` meanwhile. Leave the live lock in `aside` rather than delete it.
  }
  return false;
}

/**
 * Takes the lock, or reports its live holder. The owner file is written before the directory
 * appears at `path`, and a rename onto a non-empty directory fails, so no one sees a half-made lock.
 */
export function acquire(dir, n, me = self()) {
  const path = join(dir, String(n));
  for (let attempt = 0; attempt < 2; attempt++) {
    const found = inspect(path, me);
    if (found.state === "ours") return found;
    if (found.state === "busy") return found;
    if (!clear(path, me)) continue;
    const tmp = mkdtempSync(join(dir, `${n}.new-`));
    writeFileSync(join(tmp, "owner"), JSON.stringify(me));
    try {
      renameSync(tmp, path);
      return { state: "ours", pid: me.pid };
    } catch {
      rmSync(tmp, { recursive: true, force: true });
    }
  }
  return inspect(path, me);
}

export function release(dir, n, me = self()) {
  const path = join(dir, String(n));
  if (inspect(path, me).state === "ours") rmSync(path, { recursive: true, force: true });
}

export function others(dir, me = self()) {
  return readdirSync(dir)
    .filter((name) => /^\d+$/.test(name) && inspect(join(dir, name), me).state === "busy")
    .map(Number)
    .sort((a, b) => a - b);
}

function main([command, n]) {
  const dir = locksDir();
  if (command === "others") return others(dir).forEach((issue) => console.log(issue));
  if (!/^\d+$/.test(n ?? "")) {
    console.error("usage: lock.mjs acquire|status|release <issue-number> | lock.mjs others");
    process.exit(2);
  }
  if (command === "release") return release(dir, n);
  if (command === "status") {
    const { state, pid } = inspect(join(dir, n));
    return console.log(state === "busy" ? `busy ${pid}` : state === "ours" ? "ours" : "free");
  }
  if (command === "acquire") {
    const found = acquire(dir, n);
    if (found.state === "busy") {
      console.log(`busy ${found.pid}`);
      process.exit(1);
    }
    return console.log("held");
  }
  console.error(`unknown command: ${command}`);
  process.exit(2);
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) main(process.argv.slice(2));
