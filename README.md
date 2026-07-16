# wordcaster.github.io

One-page portfolio for John Edgar Rojas, senior technical writer in Amsterdam. Live at https://wordcaster.github.io.

## Stack

Plain semantic HTML, modern CSS, and vanilla JavaScript. No framework, no build step, no dependencies, no analytics, no cookies.

Why no framework: the page is a single column of prose with one small interactive widget. A framework would add a build step, a dependency tree, and kilobytes of runtime to solve problems this page does not have. View source and you see the whole site.

## Files

- `index.html`: structure and all copy, including the Selected work block generated from `projects.json`
- `styles.css`: theming (light and dark), typography, layout, the boot sequence, the gate demo styles
- `main.js`: boot sequence, theme toggle, Dev.to feed, evidence annotations, manifest block, gate demo
- `projects.json`: the substrate for the Selected work cards
- `tools/`: the repo's own checks and generators (plain Node, no dependencies)
- `.github/workflows/review.yml`: the deploy Action; see "What the Action checks"
- `manifest.json`: written by the Action on every push to main; never edited by hand
- `assets/`: favicon and Open Graph image

## How the feed works

The Writing section fetches `https://dev.to/api/articles?username=wordcaster` client-side, renders the articles newest first, and caches the response in `sessionStorage` for the rest of the browser session. New articles on Dev.to appear automatically; the repo never needs a commit for them.

The two newest articles are also hard-coded in `index.html` as a static fallback. The script only replaces that list after a successful fetch, so any failure (network, CORS, empty response) silently leaves the fallback in place.

## What the deploy Action checks

Every push to main runs `.github/workflows/review.yml`: four real checks, then a manifest of what ran.

1. **html-validate**: `npx html-validate@<pinned> index.html`
2. **link-check**: `node tools/check-links.mjs`; internal files, fragment anchors, and external URLs, with two documented exceptions (LinkedIn blocks non-browser clients and is reported as skipped; `manifest.json` may be absent before the first deploy)
3. **prose-lint**: `node tools/prose-lint.mjs`; no will/would future constructions (exemptions live in `tools/prose-lint-allow.json`, each with a reason), no em dashes, no double spaces, measured on visible copy only
4. **cards-match-substrate**: `node tools/render-cards.mjs --check`; regenerates the Selected work block from `projects.json` and fails on any drift from what `index.html` actually contains

The Action then writes `manifest.json` (deployed sha, build time, the checks that ran and their results) and commits it. The manifest only ever names checks that ran: `tools/write-manifest.mjs` maps step outcomes to entries and omits anything that did not execute. The page renders the file as found.

**To add a check**, make both edits or neither: add the step to `review.yml` (with an `id`, `continue-on-error: true`, and its outcome passed through `env` to the manifest step), and add its `{ name, env }` pair to `CHECKS` in `tools/write-manifest.mjs`. A check that runs without being recorded is invisible; a name without a step is a lie the manifest is built to make impossible.

The manifest commit cannot start a second run: the trigger ignores `manifest.json` by path, and the commit message carries `[skip ci]` as an independent second brake.

## Updating Selected work

The cards are generated; `projects.json` is the source of truth.

1. Edit `projects.json` (fields: `id`, `name`, `status` of `shipped` or `in-progress`, `description`, `proves`, `links`, optional `repo` for the last-activity line, optional `attribution_note` which must appear verbatim in the description).
2. Run `node tools/render-cards.mjs` to regenerate the block in `index.html`.
3. Commit both files together. The Action's cards-match-substrate check fails any commit that edits one without the other, which is the point.

This substrate is what a future scheduled job drives via PRs; today the loop is manual.

## License

Code is MIT; the written content (all prose and article text) is all rights reserved.
