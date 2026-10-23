# Pull request body

Fill every section that has content; delete a section that has none. No placeholder text
survives into the posted body.

```markdown
Closes #<issue>

## Summary
<One to three bullets: what changes for the user or the system, and why. No file lists.>

## Changes
- `<area or path>` — <what changed, in one line>

## Screenshots
<Output of the screenshots skill. Omit when the change is not visible.>

## Verification
- `<check command>` — <result, with counts>
- <what else ran, against what, and what came out>

## Reviewer notes
- <A decision a reader might question, a risk, or an issue filed for follow-up.>
```

## Rules

- `Closes #<issue>` is the first line when an issue exists. With none, start at Summary.
- **Summary** answers "what and why". It does not restate the title.
- **Changes** names what moved at the level a reviewer navigates the diff, not every file.
  Omit it for a change small enough that Summary covers it.
- **Verification** states what ran and what came out. "Tests pass" is not a result;
  "`pnpm check` green, 412 tests" is. Say what was *not* run and why.
- **Reviewer notes** holds only what the diff cannot show.
- Lists and tables over paragraphs. No greeting, no sign-off, no recap, no praise adjectives.
- The repository's own PR template, if it has one, wins; follow its headings and keep these
  rules for the content.
