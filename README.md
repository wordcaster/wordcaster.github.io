# wordcaster.github.io

One-page portfolio for John Rojas, senior technical writer and documentation engineer in Amsterdam. Live at https://wordcaster.github.io.

## Stack

Plain semantic HTML, modern CSS, and vanilla JavaScript. No framework, no build step for the page itself, no analytics, no cookies, no third-party requests. Fonts (IBM Plex Sans and Mono, latin subset) are self-hosted under `fonts/`; the only network calls the page ever makes are same-origin plus, when `manifest.json` is absent, one GitHub API request for the latest commit sha.

View source and you see the whole site. That is rather the point.

## Files

- `index.html`: the page. Two sections of it are generated (see below); the rest is hand-maintained.
- `design/v4-source.html`: the approved design record `index.html` derives from. Reference, not deployed.
- `projects.json`: source of truth for the `02 · selected work` rows.
- `writing.json`: source of truth for the `03 · writing` section.
- `tools/render.js`: regenerates the two generated sections from the JSON files.
- `tools/prose-lint.mjs`, `tools/check-links.mjs`, `tools/write-manifest.mjs`: the deploy checks.
- `.github/workflows/review.yml`: the deploy Action.
- `.nojekyll`: keeps Pages from Jekyll-processing the repo, so the site is served exactly as committed. It also keeps the deploy off Jekyll's `github-metadata` plugin, which calls the GitHub API at build time and fails the build when that API is degraded.
- `fonts/`: woff2 files plus the IBM Plex OFL license.
- `assets/`: favicon and Open Graph image.

## Editing the generated sections

Never edit the work rows or the writing lists in `index.html` directly; the drift check exists to catch exactly that. The loop is:

1. Edit `projects.json` or `writing.json`.
2. Run `node tools/render.js`. Output is deterministic: same JSON in, same bytes out, no timestamps.
3. Commit the JSON and `index.html` together.

`node tools/render.js --check` is the CI drift gate: it regenerates in memory and fails if `index.html` does not match the substrates. The render also fails if the attribution sentence ("Built on top of my team's agent tooling.") goes missing from `projects.json`.

### The series-collapse rule (dormant)

Series in `writing.json` carry `status` (`in-progress` or `complete`) and `order` (higher is newer). The newest series renders as the expanded thread. Any older series whose status is `complete` collapses to a single native `<details>` line ("name · n parts · date range") that expands to the full thread. An older series still in progress stays expanded. With one series, the rule changes nothing; it is proven by `node tools/render.js --selftest`, and `--fixture <path>` writes a throwaway preview page with a synthetic second series (never commit that page).

## The manifest honesty rule

`manifest.json` is written only by the deploy Action, from actual step outcomes. A check appears in the manifest only if its step ran; a skipped check is omitted, never recorded as passed, and any omission still fails the run at the gate step. The page renders the manifest as found. When the file is absent (before the first deploy to main), the page says so and shows at most the latest commit sha from the GitHub API, labeled as exactly that. No code path renders a check name that was not fetched from a manifest.

Adding a check is a two-part edit: a step with an `id` and `continue-on-error` in `review.yml`, and a `{ name, env }` row in `tools/write-manifest.mjs`. One without the other either never records or never runs.

## The checks

Four run on every push to main: `html_valid` (html-validate, config in `.htmlvalidate.json`, which allows exactly the two inline-style properties the approved design uses), `links_ok` (LinkedIn is bot-blocked and reported as skipped for human eyes), `prose_lint` (no will/would futures, no em dashes, no double spaces in visible copy; `tools/prose-lint-allow.json` holds rule-scoped exemptions with reasons), and `drift` (rendered sections match the substrates).

## License

Code is MIT; the written content (all prose and article text) is all rights reserved. Fonts are IBM Plex under the SIL OFL 1.1 (`fonts/LICENSE.txt`).
