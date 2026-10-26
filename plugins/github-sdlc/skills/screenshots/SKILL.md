---
name: screenshots
description: Capture screenshots or a short recording of a UI change, upload them to GitHub, and return markdown that embeds them in a pull request or issue. Use when a change is visible in a browser or app, before opening or updating a pull request, or when asked for before/after images.
---

# Screenshots

Skip when the change has no visible effect (library, config, docs, backend only), and say so in
the pull request.

## 1. Capture

Capture the state a reviewer must see, at a width that shows it: a **before** from the base branch
and an **after** from the change; for something new, an after only. Drive the app with the
project's run or e2e tooling, the built-in browser, or Claude in Chrome. Save PNGs outside the
repository, named for what they show (`level-up-before.png`); never commit them.

Check each image before uploading: it shows the change, no secrets, tokens or personal data, and
nothing half-loaded.

## 2. Upload

```bash
url=$("${CLAUDE_PLUGIN_ROOT}/skills/screenshots/scripts/upload.sh" level-up-after.png)
```

It posts to GitHub's `user-attachments` endpoint with the `gh` token and prints the URL. Run it
once per file. It accepts PNG, JPEG, GIF, WebP, MP4 and MOV.

The URL works for anyone holding it, even on a private repository. Confirm with the user before
the first upload of a session, unless they asked for screenshots.

The endpoint is unofficial. On failure, report the response and ask the user to drag the images
into the pull request; never commit them as a workaround.

## 3. Embed

Return markdown for [`open-pr`](../open-pr/SKILL.md)'s Screenshots section: one
`<details open>` per subject, the `<summary>` naming what is inside, and bold state labels
stacked inside. The format and its rules are in
[`../open-pr/references/body-template.md`](../open-pr/references/body-template.md#screenshots).

```markdown
<details open>
<summary>Sources card</summary>

**Before**
<img src="URL_BEFORE" width="640" alt="Only the global source switch is shown">

**After**
<img src="URL_AFTER" width="640" alt="Per-character list with Follow Settings and locked rows">

</details>
```

Use **New** for something that did not exist and **Removed** for something that no longer does.
Alt text says what the image shows. For a recording, put the bare URL on its own line under its
label.
