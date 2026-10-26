# Checklist: test design

Stage: test. Reads the `## Test Design` list against the criteria and the technical design.

- Every `AC` appears in at least one line. An uncovered criterion is a `critical`.
- Every line names an AC. A line naming none points to a missing criterion or an unneeded test.
- Each line gives an input and an expected result; "works correctly" is not a case.
- A bug's first line is the regression case, which fails before the fix and passes after.
- Boundary cases (empty, zero, one, many, negative) and failure paths are present where they
  apply, or the omission is stated.
- Each case is at the lowest level that can show it.
- A visual or accessibility criterion has a case; a manual check says what is checked.
- It tests behavior, not the implementation read back to itself.
- A chore names the existing tests that prove behavior is unchanged.
- It contains no test code and names no test file that does not exist.
