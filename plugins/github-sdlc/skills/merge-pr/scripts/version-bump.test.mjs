import assert from "node:assert/strict";
import { test } from "node:test";
import { globToRegex, matchesAny } from "./config.mjs";
import { bumpedVersion } from "./version-bump.mjs";

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
