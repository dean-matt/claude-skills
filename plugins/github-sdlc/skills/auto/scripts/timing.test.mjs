import assert from "node:assert/strict";
import { test } from "node:test";
import { format, timing, waits } from "./timing.mjs";

const t = (hhmm) => `2026-10-28T${hhmm}:00Z`;
const ev = (hhmm, event, extra = {}) => ({ created_at: t(hhmm), event, ...extra });
const pass = (hhmm, stage) => ev(hhmm, "commented", { body: `<!-- design-pass:${stage} -->\n1. x` });
const label = (hhmm, name) => ev(hhmm, "labeled", { label: { name } });
const unlabel = (hhmm, name) => ev(hhmm, "unlabeled", { label: { name } });
const NOW = Date.parse(t("16:00"));

const issue = [
  ev("09:00", "assigned"),
  pass("09:05", "technical"),
  ev("13:00", "assigned"),
  pass("13:10", "technical"),
  pass("13:30", "technical"),
  label("13:40", "technical-agent:review-passed"),
  pass("13:45", "test"),
  label("13:50", "test-agent:review-passed"),
];
const pr = {
  createdAt: t("14:10"),
  mergedAt: t("14:40"),
  reviews: [{ body: "<!-- audit-pass -->" }, { body: "<!-- audit-verify -->" }, { body: "**Applied**" }],
};

test("times each stage from the latest claim to the merge", () => {
  assert.deepEqual(timing(issue, pr, [label("14:30", "ai-review:completed")], NOW), [
    { stage: "technical", minutes: 40, passes: 2 },
    { stage: "test", minutes: 10, passes: 1 },
    { stage: "build", minutes: 20 },
    { stage: "review", minutes: 20, passes: 2 },
    { stage: "merge", minutes: 10 },
    { stage: "total", minutes: 100 },
  ]);
});

test("a stage still in review and an unopened pull request run to now", () => {
  const open = [ev("15:00", "assigned"), pass("15:10", "criteria")];
  assert.deepEqual(timing(open, null, [], NOW), [
    { stage: "criteria", minutes: 60, passes: 1 },
    { stage: "build", minutes: 0 },
  ]);
});

test("time with needs-user set leaves the stages and shows as waiting", () => {
  const held = [...issue, label("13:15", "needs-user"), unlabel("13:25", "needs-user")];
  const prEvents = [label("14:35", "needs-user"), unlabel("14:38", "needs-user"), label("14:30", "ai-review:completed")];
  assert.deepEqual(timing(held, pr, prEvents, NOW), [
    { stage: "technical", minutes: 30, passes: 2 },
    { stage: "test", minutes: 10, passes: 1 },
    { stage: "build", minutes: 20 },
    { stage: "review", minutes: 20, passes: 2 },
    { stage: "merge", minutes: 7 },
    { stage: "waiting", minutes: 13 },
    { stage: "total", minutes: 100 },
  ]);
});

test("a needs-user label still set runs to now", () => {
  assert.deepEqual(waits([label("15:30", "needs-user")], NOW), [[Date.parse(t("15:30")), NOW]]);
});

test("an issue nobody claimed has no timing", () => {
  assert.deepEqual(timing([pass("10:00", "test")], null, [], NOW), []);
});

test("format prints the stages on one line", () => {
  assert.equal(
    format([{ stage: "test", minutes: 3, passes: 1 }, { stage: "build", minutes: 19 }]),
    "test 3 min (1 pass) · build 19 min",
  );
});
