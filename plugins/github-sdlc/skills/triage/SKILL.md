---
name: triage
description: Triage an incoming GitHub issue or feedback — classify its type, check for duplicates, set severity and area, fill gaps with questions, propose a milestone, and put it on the board. Use when new issues, bug reports or feedback arrive, or when asked to triage, sort or review the backlog.
argument-hint: "[issue-number] [--autonomous]"
---

# Triage

Shape and types: [`../issue/references/shape.md`](../issue/references/shape.md).

## Per issue

1. **Read it** in full, and decide the type. Set the `type:` label if missing.
2. **Check for duplicates** conservatively: search open issues and those closed in the last few
   months on the title and symptom words, and read the top matches. A close match is only a
   candidate. **Ask the user before closing.** On a yes, close it as a duplicate with a comment
   naming the original, and copy anything useful (screenshot, reproduction detail) to the original
   as a comment.
3. **Fill gaps** without rewriting the reporter's words, taking what you write through
   [`technical-writing`](../technical-writing/SKILL.md): ask for a missing reproduction, and add
   an unticked Open question where a root cause or decision is unknown.
4. **Bug:** propose a `severity:` label on the [scale](../setup/references/severity.md), using the
   repository's rule for critical ([`setup`](../setup/SKILL.md) records it), and confirm it with
   the user. `severity:info` means it is not a defect. Severity never
   reorders the queue.
5. **Area:** apply an existing `area:*` label that fits. Never invent one.
6. **Milestone and rank:** propose a milestone; the user chooses. An issue with no milestone is
   backlog until the user ranks it.
7. **Restructure** only if the user wants the issue in the standard shape: run
   [`issue`](../issue/SKILL.md) in reshape mode, which keeps the reporter's words.
8. **Board:** set Triage on arrival and Todo once ready
   ([`board.md`](../setup/references/board.md)).

## Clusters

When several issues share a goal, give them one milestone and *blocked by* links where an order
matters. Never create a parent or sub-issues: a parent sits open beside its children and skews
the milestone's progress.

## Across the backlog

Report: issues waiting in Triage, any open `severity:critical` bug (even if not picked), and
clusters worth a shared milestone.

## Options

Pass `--autonomous`.

- **Interactive** (default): propose each change and apply on a yes.
- **Autonomous**: apply labels and board moves; still ask before closing a duplicate and
  before choosing a milestone.
