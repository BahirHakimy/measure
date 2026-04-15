# Pixelgrade Chrome Web Store Checklist

This file keeps the publish-facing material next to the extension source.

## Upload format

Chrome Web Store uploads use a ZIP file of the built extension, not your source
repo and not a CRX.

Build and package it with:

```bash
corepack pnpm build
corepack pnpm package:extension
```

The upload file will be:

```text
apps/site/pixelgrade-extension.zip
```

If you only want to package the extension app:

```bash
corepack pnpm --filter ./apps/site build
corepack pnpm --filter ./apps/site package
```

## What to upload

Upload the ZIP created from `apps/site/dist`.

Do not upload:

- the repo root,
- `node_modules`,
- source files outside the built extension output,
- a `.crx` file.

## Privacy policy URL

This repo includes a static privacy policy at:

```text
apps/site/public/privacy-policy.html
```

Recommended hosting setup:

- import the repo root into Vercel,
- let Vercel use `vercel.json`,
- use the deployed URL for the privacy policy.

With the current Vercel config, the privacy policy will be available at:

```text
https://<your-vercel-domain>/privacy-policy.html
```

Use that public HTTPS URL in the Chrome Web Store privacy policy field.

## Vercel setup

This repo includes a root `vercel.json` so you can deploy from the monorepo root
without changing the project root directory.

### Recommended settings

- Project root: repository root
- Install command: auto-detected from `vercel.json`
- Build command: auto-detected from `vercel.json`
- Output directory: auto-detected from `vercel.json`

### Why deploy from the repo root

The extension popup site depends on the local workspace package in
`packages/mesurer`. Deploying from the root keeps that workspace dependency
available during the build.

## Suggested listing copy

### Name

Pixelgrade

### Short description

Inspect spacing, rulers, and guides on any page.

### Detailed description

Pixelgrade adds measurement tools directly to the current page so you can inspect
layout without changing your app code.

Features:

- select elements and read live dimensions,
- drop horizontal and vertical guides,
- measure spacing between elements,
- use a tape tool for arbitrary distances,
- use rulers for page coordinates,
- keep overlay state locally per site.

Pixelgrade stores its settings locally on your device and does not send browsing
data to a remote server.

## Suggested test instructions

1. Open any regular `https://` page.
2. Install the extension and pin it.
3. Open the popup and enable the extension.
4. Confirm the floating toolbar appears on the page.
5. Test these modes:
   - `S` for selection
   - `G` for guides
   - `T` for tape measure
   - `R` for rulers
6. Disable the extension from the popup and confirm the overlay is removed after
   reload.

## Assets you still need

- at least 1 screenshot of the real extension UI,
- a 440x280 promotional image,
- optional additional screenshots up to the store limit.

## Notes for privacy answers

Current behavior:

- runs on `http://*/*` and `https://*/*`,
- stores extension state locally via `chrome.storage.local`,
- does not send collected page data to a backend,
- does not use analytics, ads, or remote code.
