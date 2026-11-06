/**
 * Moves an issue's card to a status on the project board.
 *
 *   move-card.mjs <project> <owner> <issue-url> <status>
 *
 * The project id, Status field id and option ids do not change between moves, so they are read
 * once and kept in a file under the temp directory for an hour. A move is then `item-add` and
 * `item-edit`, two calls instead of four. A cached id the board no longer accepts is read again
 * once before the move fails. Exits 3 when the board has no such status, 2 on any other failure.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture } from "../../merge-pr/scripts/capture.mjs";

export const TTL_MS = 60 * 60 * 1000;

/** @param {string} owner @param {string} project */
export const cachePath = (owner, project) => join(tmpdir(), `sdlc-board-${owner}-${project}.json`);

/**
 * Reads the project id, the Status field id and its options.
 *
 * @param {typeof capture} run
 * @returns {{ projectId: string, fieldId: string, options: Record<string, string> }}
 */
export function resolve(project, owner, run = capture) {
  const gh = (args) => JSON.parse(run("gh", [...args, "--owner", owner, "--format", "json"]));
  const { id: projectId } = gh(["project", "view", project]);
  const field = gh(["project", "field-list", project]).fields.find((f) => f.name === "Status");
  if (!field) throw new Error("the board has no Status field");
  return {
    projectId,
    fieldId: field.id,
    options: Object.fromEntries(field.options.map((o) => [o.name, o.id])),
  };
}

/**
 * @param {{ project: string, owner: string, url: string, status: string }} move
 * @param {{ run?: typeof capture, read?: (p: string) => string, write?: (p: string, s: string) => void, now?: () => number }} [io]
 * @returns {string} a one-line summary
 */
export function moveCard({ project, owner, url, status }, io = {}) {
  const { run = capture, read = (p) => readFileSync(p, "utf8"), write = writeFileSync, now = Date.now } = io;
  const path = cachePath(owner, project);
  const load = () => {
    try {
      const c = JSON.parse(read(path));
      return now() - c.at < TTL_MS ? c : undefined;
    } catch {
      return undefined;
    }
  };
  const fresh = () => {
    const c = { at: now(), ...resolve(project, owner, run) };
    try {
      write(path, JSON.stringify(c));
    } catch {}
    return c;
  };
  const edit = (c) => {
    const option = c.options[status];
    if (!option) return undefined;
    const item = JSON.parse(
      run("gh", ["project", "item-add", project, "--owner", owner, "--url", url, "--format", "json"]),
    ).id;
    run("gh", [
      "project", "item-edit", "--id", item, "--project-id", c.projectId,
      "--field-id", c.fieldId, "--single-select-option-id", option,
    ]);
    return true;
  };
  const cached = load();
  let done;
  if (cached) {
    try {
      done = edit(cached);
    } catch {
      done = undefined;
      return moveCard({ project, owner, url, status }, { ...io, read: () => "" });
    }
    if (done === undefined) {
      // A status missing from the cache may have been added since.
      const c = fresh();
      done = edit(c);
    }
  } else {
    done = edit(fresh());
  }
  if (!done) {
    const err = new Error(`the board has no ${status} status`);
    err.code = "NO_STATUS";
    throw err;
  }
  return `card moved to ${status}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [project, owner, url, status] = process.argv.slice(2);
  if (!status) {
    console.error("usage: move-card.mjs <project> <owner> <issue-url> <status>");
    process.exit(2);
  }
  try {
    console.log(moveCard({ project, owner, url, status }));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(e.code === "NO_STATUS" ? 3 : 2);
  }
}
