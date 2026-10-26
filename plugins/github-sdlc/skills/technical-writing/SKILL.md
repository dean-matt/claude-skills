---
name: technical-writing
description: Write or edit prose a developer will read — pull request bodies, commit messages, issue text, specs, READMEs, docs, code comments and error messages — so it is short, specific and structured. Use before writing any such text, and as the prose pass over a change before opening a pull request.
---

# Technical writing

Apply the general rules first, then the technical ones.

## 1. General prose

Invoke `writing-clearly-and-concisely` (from the `elements-of-style` plugin) over the draft.
It carries Strunk's rules: active voice, positive form, concrete language, omit needless words.

If that skill is not installed, say so and offer the install; do not paraphrase its rules from
memory:

```bash
claude plugin marketplace add obra/the-elements-of-style
claude plugin install elements-of-style@elements-of-style-dev
```

Then continue with section 2 anyway, which stands on its own.

## 2. Technical prose

- **Lead with the point.** First line: what changed or what the reader must do. Background
  follows only if the reader needs it to act.
- **One fact, once.** Delete anything the diff, title, or a link already says. Where another
  document owns the fact, link to it and stop; never restate it.
- **Name things exactly.** Use the identifier, path, command or number, in code font. "The
  list" becomes `.github/protected-paths.txt`; "a lot slower" becomes "3.2 s to 11 s".
- **Structure over paragraphs** where the reader scans: a list for parallel items, a table
  for comparisons, a code block for anything typed. Prose for reasoning.
- **State results, not effort.** "`pnpm check` passes, 412 tests" — not "I ran the tests and
  verified everything works".
- **A reason earns its line** only where dropping it would let a reader undo the decision or
  repeat a mistake. Otherwise cut it.
- **Cut filler:** "this PR aims to", "as per", "it should be noted", "robust", "seamless",
  "leverage", "comprehensive", hedges that repeat, and any closing summary of what was just
  said.
- **Comments say why**, never what. No history, ticket numbers or commented-out code.
- **Commit messages and PR titles:** imperative, specific, under 72 characters; follow the
  repository's own convention where it has one.

## Finish

Re-read once as the reader with no context. Cut one more sentence.
