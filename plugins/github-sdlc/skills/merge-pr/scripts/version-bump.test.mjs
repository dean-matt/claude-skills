import assert from "node:assert/strict";
import { test } from "node:test";
import { globToRegex, hasWorkflows, matchesAny, parseList, protectedPaths } from "./repo.mjs";
import { bumpedVersion, isBot } from "./version-bump.mjs";

const base = { version: "1.4.2", base: "1.4.2" };

test("a code change raises the patch, a feat title the minor", () => {
  assert.equal(bumpedVersion({ ...base, changed: ["src/a.ts"], title: "fix(x): y" }), "1.4.3");
  assert.equal(bumpedVersion({ ...base, changed: ["src/a.ts"], title: "feat(x): y" }), "1.5.0");
});

test("docs and Markdown alone leave the version", () => {
  assert.equal(bumpedVersion({ ...base, changed: ["docs/a.png", "README.md", "x/y.md"], title: "feat: z" }), null);
});

test("a version already above the base stands, so a rerun changes nothing", () => {
  assert.equal(bumpedVersion({ version: "1.4.3", base: "1.4.2", changed: ["a.ts"], title: "fix: y" }), null);
  assert.equal(bumpedVersion({ version: "1.5.0", base: "1.4.2", changed: ["a.ts"], title: "fix: y" }), null);
});

test("a branch behind a raised base is raised over the base's version", () => {
  assert.equal(bumpedVersion({ version: "1.4.2", base: "1.4.3", changed: ["a.ts"], title: "fix: y" }), "1.4.4");
});

test("rules choose the kinds and what counts as skippable", () => {
  const rules = { feat: "major", other: "minor", skip: ["site/**"] };
  assert.equal(bumpedVersion({ ...base, changed: ["a.ts"], title: "feat: y", rules }), "2.0.0");
  assert.equal(bumpedVersion({ ...base, changed: ["a.ts"], title: "fix: y", rules }), "1.5.0");
  assert.equal(bumpedVersion({ ...base, changed: ["site/a.html"], title: "fix: y", rules }), null);
});

test("a base that is not MAJOR.MINOR.PATCH throws", () => {
  assert.throws(() => bumpedVersion({ version: "1.0.0", base: "1.0", changed: ["a"], title: "fix: y" }), /not MAJOR/);
});

test("globs: ** crosses directories, * stays in one, a trailing slash takes the tree", () => {
  assert.ok(globToRegex("docs/**").test("docs/a/b.md"));
  assert.ok(globToRegex("**/*.md").test("a/b/c.md"));
  assert.ok(!globToRegex("*.md").test("a/b.md"));
  assert.ok(globToRegex("ci/").test("ci/x/y.yml"));
  assert.ok(!globToRegex("ci/").test("src/ci/x.yml"));
  assert.ok(globToRegex("package.json").test("package.json"));
  assert.ok(!globToRegex("package.json").test("packages/web/package.json"));
  assert.ok(!matchesAny([], "anything"));
});

test("a bot-opened pull request is skipped, however GitHub names the bot", () => {
  assert.ok(isBot({ login: "dependabot[bot]" }));
  assert.ok(isBot({ login: "app/dependabot", is_bot: true }));
  assert.ok(isBot({ login: "app/renovate" }));
  assert.ok(!isBot({ login: "dean-matt" }));
  assert.ok(!isBot(undefined));
});

test("the protected list drops blanks and comments, and protects itself", () => {
  assert.deepEqual(parseList("# why\n\nCLAUDE.md\n  docs/  \n#x\n"), ["CLAUDE.md", "docs/"]);
  const run = () => "# fence\nCLAUDE.md\n";
  assert.deepEqual(protectedPaths("main", run), ["CLAUDE.md", ".github/protected-paths"]);
});

test("no list means no fence, so a repository that never opted in is never blocked", () => {
  const missing = () => {
    throw new Error("path does not exist");
  };
  assert.deepEqual(protectedPaths("main", missing), []);
});

test("the list is read from the default branch, never the pull request's", () => {
  let asked;
  protectedPaths("trunk", (file, args) => {
    asked = args;
    return "x";
  });
  assert.deepEqual(asked, ["show", "origin/trunk:.github/protected-paths"]);
});

test("a repository runs checks only if it has a workflow file at that commit", () => {
  assert.ok(hasWorkflows("abc", () => ".github/workflows/ci.yml\n"));
  assert.ok(!hasWorkflows("abc", () => "\n"));
  assert.ok(!hasWorkflows("abc", () => {
    throw new Error("bad ref");
  }));
});
