# Checklist: UI/UX design

Stage: ui. Reads the `## UI/UX Design` section against the criteria and the existing interface.

- The flow is stated step by step from the user's side.
- Every state is covered: default, empty, loading, error, disabled or locked, and any a
  criterion implies. A missing state a builder would have to invent is a `medium`.
- **Dismiss and return paths:** for each new surface, Escape, a backdrop click, Back and Close
  are stated, with where focus lands after each, including when it opens over another surface.
  A missing one is a `medium`.
- **Save and failure paths:** what the user sees while saving, after success and on each
  failure a criterion or the API allows. A missing one is a `medium`.
- Every new string is given exactly.
- Keyboard order and keys, screen-reader labels and announcements, focus handling, and
  contrast are stated for each new control.
- It reuses what the interface already has (components, tokens, patterns) and says where it
  departs and why.
- It adds **no requirement**: every behavior it describes traces to a criterion. One that does
  not is a `critical`, with the criterion it needs proposed.
- Images are labeled "Intended layout" and have alt text that says what they show.
- It does not choose the implementation.
