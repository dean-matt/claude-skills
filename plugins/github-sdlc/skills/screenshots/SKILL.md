---
name: screenshots
description: Capture screenshots or a short recording of a UI change, upload them to GitHub, and return markdown that embeds them in a pull request or issue. Use when a change is visible in a browser or app, before opening or updating a pull request, or when asked for before/after images.
---

# Screenshots

Skip this skill when the change has no visible effect (library, config, docs, backend only).
Say so in the pull request instead of attaching nothing silently.

## 1. Capture

Capture the state a reviewer must see, at a width that shows it. For a visual change take a
**before** from the base branch and an **after** from the change; for something new, an
after only. Use whatever can drive the app: the project's own run or e2e tooling, the
built-in browser, or Claude in Chrome. Save PNGs outside the repository, named for what they
show (`level-up-before.png`), and never commit them.

Check each image before uploading: it shows the change, no secrets, tokens or personal data,
and nothing half-loaded.

## 2. Upload

```bash
url=$("${CLAUDE_PLUGIN_ROOT}/skills/screenshots/scripts/upload.sh" level-up-after.png)
```

The script posts to GitHub's `user-attachments` endpoint with the `gh` token and prints the
URL. Run it once per file. It accepts PNG, JPEG, GIF, WebP, MP4 and MOV.

Uploading sends the file to GitHub, and the URL works for anyone holding it even on a private
repository. Confirm with the user before the first upload of a session unless they have
already asked for screenshots.

The endpoint is unofficial. If the script fails, report the response it printed and fall back
to asking the user to drag the images into the pull request; do not commit the images as a
workaround.

## 3. Embed

Return markdown ready to paste into the body. A before/after pair:

```markdown
| Before | After |
| --- | --- |
| <img src="URL_BEFORE" width="420" alt="Level-up dialog before: no spell picker"> | <img src="URL_AFTER" width="420" alt="Level-up dialog after: spell picker shown"> |
```

A single image: `<img src="URL" width="640" alt="…">`. Write alt text that says what the
image proves. For a recording, put the bare URL on its own line.

[`open-pr`](../open-pr/SKILL.md) places this under its `## Screenshots` heading.
