/**
 * Posts a design review pass, adds its heading, and hides the passes before it.
 *
 *   post-pass.mjs <issue> <stage> <pass.md>
 *
 * The file opens with `<!-- design-pass:<stage> -->`, which `tidy.mjs` uses to find passes. The
 * script adds `### Criteria review — pass 3` under it; the number counts the stage's earlier
 * passes, hidden ones included. Needs `gh`.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { capture } from "../../merge-pr/scripts/capture.mjs";
import { designMarker, tidy } from "../../address-feedback/scripts/tidy.mjs";

export const STAGE_NAMES = {
  criteria: "Criteria",
  ui: "UI/UX design",
  technical: "Technical design",
  test: "Test design",
};

/**
 * The pass with its heading under the marker. A file that already has a heading there is left
 * as written.
 *
 * @param {string} body
 * @param {string} stage
 * @param {number} number
 */
export function withHeading(body, stage, number) {
  const marker = designMarker(stage);
  const rest = body.slice(marker.length).replace(/^\r?\n/, "");
  if (rest.startsWith("### ")) return body;
  const name = STAGE_NAMES[stage] ?? stage;
  return `${marker}\n### ${name} review — pass ${number}\n\n${rest}`;
}

/**
 * @param {string[]} argv
 * @param {typeof capture} [run]
 * @param {(path: string) => string} [read]
 * @returns {string} the comment URL and the tidy summary
 */
export function postPass(argv, run = capture, read = (p) => readFileSync(p, "utf8")) {
  const [issue, stage, file] = argv;
  if (!issue || !stage || !file) throw new Error("usage: post-pass.mjs <issue> <stage> <pass.md>");
  const body = read(file);
  if (!body.startsWith(designMarker(stage))) throw new Error(`${file} does not open with ${designMarker(stage)}`);
  const comments = JSON.parse(run("gh", ["api", "--paginate", "--slurp", `repos/{owner}/{repo}/issues/${issue}/comments`])).flat();
  const earlier = comments.filter((c) => c.body.startsWith(designMarker(stage))).length;
  const out = join(mkdtempSync(join(tmpdir(), "pass-")), "pass.md");
  writeFileSync(out, withHeading(body, stage, earlier + 1));
  const url = run("gh", ["issue", "comment", issue, "--body-file", out]).trim();
  let summary;
  try {
    summary = tidy(["issue", issue, stage], run);
  } catch (e) {
    summary = `posted, but tidying failed: ${e.message.split("\n")[0]}`;
  }
  return `${url}\n${summary}`;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log(postPass(process.argv.slice(2)));
  } catch (e) {
    console.error(e.message.split("\n")[0]);
    process.exit(2);
  }
}
