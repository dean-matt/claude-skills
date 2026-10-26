---
name: test-design
description: Write the Test Design section of an issue — a list of cases, each naming the acceptance criterion it covers — after the technical design passes review. Use when asked how an issue will be tested, or as the last design stage before building.
argument-hint: "<issue-number>"
---

# Test design

Stages and gates: [`../issue/references/pipeline.md`](../issue/references/pipeline.md).

## Preconditions

Claim the issue first ([`claim`](../issue/references/claim.md)).

`technical-agent:review-passed`, and every earlier needed stage passed. Otherwise stop and
name the missing stage.

## Steps

1. Read the criteria and the Technical Design.
2. Write one line per case, starting with the AC it covers, wrapped per
   [`shape.md`](../issue/references/shape.md#foldable-sections):

   ```markdown
   - AC2: two characters with the same skill name and ability → one `HB` row
   - AC3: conversion throws midway → every definition unchanged
   ```

   Add the level in brackets only when it is not obvious: `(e2e)`, `(manual)`.
3. **Cover, completely:**
   - Every AC appears in at least one line, and every line names an AC.
   - A bug's first line is the regression case, which fails before the fix and passes after.
   - Boundary cases (empty, zero, one, many, negative) and failure paths appear where they apply.
   - A visual or accessibility criterion has a case. A manual check says what is checked.
   - Use the lowest level that can show it: unit for arithmetic, integration for a database or
     API, end to end only for flows that cross the UI.
4. A chore's lines name the existing tests that prove behavior is unchanged. A docs issue
   writes `n/a — <reason>`.
5. If a criterion cannot be tested as written, add an unticked Open question; do not edit it.
6. Take the section through [`technical-writing`](../technical-writing/SKILL.md). Then replace
   only the `## Test Design` section (re-read first), set `test-agent:designed`, and clear this
   stage's `review-passed` and `changes-requested`.
7. Hand off to [`review-design`](../review-design/SKILL.md) for the test stage.

## Will not do

Write test code or name test files that do not exist yet; test the implementation back to itself.
