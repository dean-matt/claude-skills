---
name: triage
description: Triage an incoming GitHub issue or feedback — classify its type, check for duplicates, set severity and area, fill gaps with questions, propose a milestone, and put it on the board. Use when new issues, bug reports or feedback arrive, or when asked to triage, sort or review the backlog.
argument-hint: "[issue-number] [autonomous]"
---

# Triage

Shape, types and the pipeline: [`../issue/references/shape.md`](../issue/references/shape.md).

## Per issue

1. **Read it** in full, and decide the type. Set the `type:` label if missing.
2. **Check for duplicates** conservatively: search open issues and those closed in the last few
   months on the title and symptom words, and read the top matches rather than ranking by text
   overlap. A close match is only a candidate. **Ask the user before closing.** On a yes,
   close it with the duplicate reason and a comment naming the original, and carry anything
   useful (a screenshot, a reproduction detail) over to the original as a comment.
3. **Fill gaps** without rewriting the reporter's words: ask for a missing reproduction, and
   add an unticked Open question where a root cause or a decision is unknown.
4. **Bug:** propose a `severity:` label from the repository's rule for what is critical
   (recorded by [`setup`](../setup/SKILL.md)), and confirm it with the user. Severity informs;
   it does not reorder the queue.
5. **Area:** apply an existing `area:*` label that fits. Never invent one.
6. **Milestone and rank:** propose a milestone, and leave the choice to the user. An issue
   with no milestone is backlog, and stays so until the user ranks it.
7. **Restructure** only if the user wants the issue in the standard shape: run
   [`issue`](../issue/SKILL.md) in reshape mode, which keeps the reporter's words.
8. **Board:** set Triage on arrival and Todo once ready, as
   [`../setup/references/board.md`](../setup/references/board.md) describes.

## Clusters

When several issues share a goal, offer a bounded parent: an issue stating the goal, with the
others as sub-issues, no milestone, closing when its children do. Offer it; do not create one
for a single issue or as a standing bucket.

## Across the backlog

Report: how many issues wait in Triage, any open `severity:critical` bug (even though it is
not picked), and clusters worth a parent.

## Options

Pass the word `autonomous`.

- **Interactive** (default): propose each change and apply on a yes.
- **Autonomous**: apply labels and board moves; still ask before closing a duplicate and
  before choosing a milestone.
