---
name: technical-writing
description: Write or edit any text a developer will read — issues, review comments, pull request bodies, commit messages, specs, READMEs, docs, skill text, code comments and error messages — so it is terse, clear and concise, with not much narrative and no history. Use before writing any such text, and as the prose pass over a change before opening a pull request.
---

# Technical writing

Terse, clear, concise. Not much narrative. No history. In issues, comments, code and everywhere.

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

- **Terse.** Lead with the point: what changed or what the reader must do. Background follows
  only if the reader needs it to act. Cut a sentence, then cut one more.
- **Concise.** Say each fact once. Delete anything the diff, title or a link already says. Where
  another document owns the fact, link to it and stop.
- **Clear.** Name things exactly: the identifier, path, command or number, in code font. "The
  list" becomes `.github/protected-paths.txt`; "a lot slower" becomes "3.2 s to 11 s". Use a
  list for parallel items, a table for comparisons, a code block for anything typed.
- **Not much narrative.** State results, not effort: "`pnpm check` passes, 412 tests", not "I ran
  the tests and verified everything works". No story of how you got there. A reason earns its
  line only where dropping it would let a reader undo the decision or repeat a mistake.
- **No history.** Write what is true now. Not what it used to do, what changed since, what a run
  did, or what you tried first. This holds for issues, comments, review passes, pull request
  bodies, docs, skill text, error messages and code. In code, comments say why, never what, and
  carry no ticket numbers or commented-out code. A commit message says what the commit does and
  why, in the imperative, not how the author got there.
- **No filler:** "this PR aims to", "as per", "it should be noted", "robust", "seamless",
  "leverage", "comprehensive", hedges that repeat, and any closing summary of what was just said.
- **Commit messages and PR titles:** imperative, specific, under 72 characters; follow the
  repository's own convention where it has one.

## Finish

Re-read once as the reader with no context. Cut anything that is history or narrative, then cut
one more sentence.
