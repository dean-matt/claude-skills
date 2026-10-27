# Pull request body

Facts live in one place: the issue holds the problem, criteria and design; CI holds the check
results. The body holds only what neither can know, and links instead of restating.

````markdown
> Closes #<issue>

## What
<What this pull request delivers, in a sentence or two.>

## Why
<Only the reason that belongs to this pull request.>

## Screenshots
<details open>
<summary><Subject: what these images show></summary>

**Before**
<img src="<url>" width="640" alt="<what the image shows>">

**After**
<img src="<url>" width="640" alt="<what the image shows>">

</details>

## Deviations
- **<Kind>:** <what differed from the issue, and why, in a clause.>
````

## Rules

- **`> Closes #<issue>`** is the first line, in a blockquote. GitHub reads the keyword there
  and links the issue natively. Several issues each take their own keyword:
  `> Closes #1, closes #2`. Never close a parent issue; it closes when its sub-issues do.
  With no issue, omit the line and let Why carry the reason.
- **What** says what this pull request delivers; for a slice of an issue, which slice. It never
  restates the issue's goal, lists files, or describes the diff.
- **Why** holds only the reason that belongs to this pull request, such as why this approach beat
  the alternative. If the issue says why, link it and stop.
- **Screenshots** appear only when a user can see the change. See below. A visible change
  without them is a finding for `review-pr`; the body never explains the absence.
- **Deviations** appear only when the build differed from the issue. Never write "None".
- **No Verification section.** A missed acceptance criterion is a finding for
  [`review-pr`](../../review-pr/SKILL.md), and CI reports the checks.
- **No Reviewer notes section.** A reviewer's note is a review comment on the line. A follow-up is
  an issue, linked inline where it matters.
- Never restate an acceptance criterion or any part of the design.
- Plain prose and short lists. No greeting, sign-off, recap or praise.
- The repository's own `.github/pull_request_template.md`, if it has one, wins for headings;
  the rules above still govern the content.

## Screenshots

One `<details open>` per subject. The `<summary>` names what is inside. Leave a blank line after
`<summary>` and before `</details>`, or the Markdown inside does not render.

| Subject | Shows | Labels, stacked, in this order |
|---|---|---|
| A change | the same view before and after | **Before**, then **After** |
| An addition | something that did not exist | **New** |
| A removal | something that no longer exists | **Removed**, showing the old image |

Width 640; a phone-width capture keeps its natural width. Alt text says what the image shows,
never the subject name that the summary already gives.

## Deviations

Each line starts with its kind:

| Kind | Means | Waits on the user? |
|---|---|---|
| **Correction** | The issue's premise was wrong, and the change follows the real behavior | No |
| **Narrowing** | Part of what the issue asked is deferred. Link the issue that takes the rest | Yes |
| **Addition** | Something the issue did not authorize, such as a new dependency or wider scope | Yes |
| **Technical Design**, **UI/UX Design**, **Test Design** | The build differed from that design section | No |

A change to behavior an acceptance criterion states is never a design deviation: it is a
**Correction** only where the issue's premise was wrong, otherwise an **Addition**, which waits on
the user. A line for a section that did not change is never written.
