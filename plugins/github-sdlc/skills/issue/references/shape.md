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

The headings are exactly these, at `h2` level, so tooling can find them: `## <name>` for a plain
section, `<summary><h2><name></h2></summary>` for a foldable one.

## Foldable sections

Acceptance criteria, UI/UX Design, Technical Design and Test Design fold under their own
heading, and start open. The heading is the `<summary>`, written as HTML because Markdown does
not render there; GitHub shows it beside the fold arrow. Keep a blank line after `<summary>` and
before `</details>`, or the Markdown inside does not render:

````markdown
<details open>
<summary><h2>Acceptance criteria</h2></summary>

- **AC1.** ...

</details>
````

An unwritten UI/UX Design section is the bare heading `## UI/UX Design`, which marks the change
as visual; `ui-design` replaces it with the foldable form. A section in the older form, a `##`
heading over a `Show or hide` summary, is rewritten to this form whenever its stage edits it, and
a reviewer raises nothing about it otherwise.

Summary, Out of scope and Open questions are never wrapped. A section reading `n/a — <reason>`
needs no wrapper. Keep the wrapper when rewriting a section.

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

Once the last question is ticked and its answer is in the Summary, Out of scope or the criteria,
post one comment listing each question and answer, then delete the whole `## Open questions`
section, heading included.

## Types

One `type:` label per issue.

| Type | Shape |
|---|---|
| `type:feat` | The full shape |
| `type:fix` | The full shape with Reproduction; Technical Design is the root cause, the fix and the blast radius; Test Design starts with the regression case |
| `type:chore` | The full shape; a criterion states that behavior does not change, and Test Design names the existing tests that prove it |
| `type:docs` | Summary, Out of scope, criteria; risk `info` |
| `type:spike` | Summary, Open questions, Out of scope; criteria are "a recommendation is written and linked"; no design sections |

A bug also carries one `severity:` label, set at triage.

## Screenshots in an issue

Only inside Reproduction (the defect) and UI/UX Design (the intended layout, labeled so). A
screenshot of progress belongs in the pull request. Use [`screenshots`](../../screenshots/SKILL.md).

## Parents

A parent is any issue with sub-issues. It states a goal, has no milestone, is never picked,
and closes when its children do. Create it only for a cluster of related issues; it is not a
permanent bucket.
