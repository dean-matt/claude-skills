/**
 * Posts a design review pass and hides the passes before it, in one step, so the issue never
 * carries a superseded pass and the tidying cannot be skipped by a run that reads the posting
 * instruction and not the one after it.
 *
 *   post-pass.mjs <issue> <stage> <pass.md>
 *
 * The file must open with `<!-- design-pass:<stage> -->`, which is how a pass is told from a
 * person's comment and how `tidy.mjs` finds it. Needs `gh`.
 */
import { readFileSync } from "node:fs";
import { capture } from "../../merge-pr/scripts/capture.mjs";
import { designMarker, tidy } from "../../address-feedback/scripts/tidy.mjs";

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
  const url = run("gh", ["issue", "comment", issue, "--body-file", file]).trim();
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
