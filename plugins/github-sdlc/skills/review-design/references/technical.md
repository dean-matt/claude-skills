# Checklist: technical design

Stage: technical. Reads the `## Technical Design` section against the criteria and the code.

- The files, symbols, tools, collections and conventions it cites exist. Check them in the code; an invented one is
  a `critical`.
- The approach meets **every** criterion. Name any it does not.
- **Reach:** search for every component, route, view and caller the change touches or the
  feature appears in. A place a criterion covers that the design leaves out is a `critical`.
- **Platform claims:** check each claim about how a framework, library or runtime behaves (event
  propagation, hook order, portals, context, async timing) against the code or the library's
  source or docs. A false claim the design rests on is a `critical`; any other is a `high`.
- **Load cost:** a new import into an eagerly loaded module names what it pulls in. A heavy
  dependency pulled onto a path that did not load it is a `high`.
- **Reuse:** search for a hook, helper or component that already does what a step builds. A
  rebuilt one is a `medium`.
- **Repository checks:** read the lint rules and the file-shape or architecture tests that fence
  the files the design adds or moves. A placement one would fail is a `high`.
- **Bug:** the root cause is where and why it fails, not where it shows, and the reasoning
  shows it was confirmed. The fix removes that cause, not the symptom. The blast radius lists
  every caller found by search.
- **Feature or chore:** data and module changes, migrations and whether they can be rerun or
  undone, risks, and alternatives rejected with a reason each.
- It stays within Out of scope.
- It repeats no criterion and no UI/UX detail; it refers to them by number or section.
- It is the smallest design that meets the criteria. An abstraction nothing yet needs is a
  `medium`.
- `n/a — <reason>` is acceptable only for a change that touches no code.
