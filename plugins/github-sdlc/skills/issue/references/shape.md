# The shape of an issue

Facts live in one place. Relationships live in GitHub's native fields (dependencies and
sub-issues) and are never repeated in the body. Pull request links belong to the pull request.

## Sections, in order

| Section | Holds | When |
|---|---|---|
| Summary | The problem first, then the goal | Always |
| Reproduction | Steps, **Actual**, **Expected**; environment and frequency when they matter | Bug only |
| Open questions | `- [ ]` items. Any unticked one stops the pipeline and the build | When something is unresolved |
| Out of scope | A fence. `Nothing` is allowed; omitting the section is not | Always |
| Acceptance criteria | `AC1`, `AC2`, … each an observable result | Always |
| UI/UX Design | Flow, every state, copy, keyboard and screen-reader behavior | Only when a user can see the change |
| Technical Design | How it is built | Any code change |
| Test Design | A list; each line names its AC | Any non-spike |

The headings are exactly these, `##` level, so tooling can find them.

## Foldable sections

Acceptance criteria, UI/UX Design, Technical Design and Test Design are wrapped so a long one can
be folded. They start open. The `##` heading stays outside, since tooling finds it; the content
sits inside, with a blank line after `<summary>` and before `</details>`, or the Markdown inside
does not render:

````markdown
## Acceptance criteria

<details open>
<summary>Show or hide</summary>

- **AC1.** ...

</details>
````

Summary, Out of scope and Open questions are never wrapped: a reader should not have to unfold
what stops the pipeline. Rewrite a section's content and keep its wrapper. A section that is
`n/a — <reason>` needs none. An older issue without wrappers is left alone until a stage rewrites
the section.

## Acceptance criteria

- State an observable result: "the dialog shows X", never "implement X".
- Checkable by someone who did not write it.
- Number them `AC1`, `AC2`, … so other sections cite them without restating them.
- Carry no design detail. A keying scheme, file name or algorithm belongs in Technical Design.
- For a bug, `AC1` is the corrected behavior in the words of **Expected**.

## Open questions

Each is a checkbox. Tick it and add the answer on the same line when it is resolved. A wait
condition with nothing to link, such as "wait for the schema freeze", is an Open question too.
Relationships are not: use a dependency.

The section holds what is unresolved, so it does not outlive its questions. Once the last one is
ticked and the stage that owns the answer has written it into the Summary, Out of scope or the
criteria, post one comment listing each question with its answer, then delete the whole
`## Open questions` section, heading included. A section of ticked items is stale text: the
answers are already in the sections that carry them, and the comment keeps the record.

## Types

One `type:` label per issue.

| Type | Shape |
|---|---|
| `type:feat` | The full shape |
| `type:fix` | The full shape with Reproduction; Technical Design is the root cause, the fix and the blast radius; Test Design starts with the regression case |
| `type:chore` | The full shape; a criterion states that behavior does not change, and Test Design names the existing tests that prove it |
| `type:docs` | Summary, Out of scope, criteria; the design sections read `n/a — <reason>` |
| `type:spike` | Summary, Open questions, Out of scope; criteria are "a recommendation is written and linked"; no design sections |

A bug also carries one `severity:` label, set at triage.

## Screenshots in an issue

Only inside Reproduction (the defect) and UI/UX Design (the intended layout, labeled so). A
screenshot of progress belongs in the pull request. Use [`screenshots`](../../screenshots/SKILL.md).

## Parents

A parent is any issue with sub-issues. It states a goal, has no milestone, is never picked,
and closes when its children do. Create it only for a cluster of related issues; it is not a
permanent bucket.
