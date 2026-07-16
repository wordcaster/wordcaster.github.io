# PROJECT-LOG

Continuity record for agents and humans working on wordcaster.github.io.
Read this first; update it last.

## Current state (2026-07-16, second session)

Branch `code-review-redesign` holds the v4 page design, integrated and
machine-verified, pushed to origin, NOT merged. Main is untouched; merging
main is John's call alone and deploys the live site.

**The `evidence-aesthetic` branch is superseded as a page design.** Its
engineering survived: the deploy Action, check scripts, and manifest rules
were ported to this branch and adapted. The branch itself stays on origin
untouched, as a record.

What this branch contains:

1. **The v4 design**, human-blessed, committed verbatim as
   `design/v4-source.html`. `index.html` is DERIVED from it with exactly
   three integration transforms and nothing else: (a) self-hosted fonts,
   (b) live-value placeholders plus the manifest renderer script,
   (c) `font-weight:650` normalized to 600 (IBM Plex has no 650). Copy is
   final; do not restyle or rewrite.
2. **Self-hosted fonts**: latin-subset woff2 under `fonts/`, 75KB total
   (budget 120KB). IBM Plex Sans is the v23 variable file, one request for
   weights 400-600; Mono 400/500 are static instances. OFL license
   committed alongside. Zero third-party requests; the only external call
   the page can make is the GitHub API sha fallback.
3. **Substrates**: `projects.json` (work rows) and `writing.json`
   (series + standalones) reproduce the design sections byte-for-byte via
   `tools/render.js` (CommonJS, deterministic, no timestamps).
   `--check` is the CI drift gate; `--selftest` proves the dormant
   series-collapse rule; `--fixture <path>` writes a throwaway preview.
   The render fails if the attribution sentence leaves projects.json.
4. **Series-collapse rule (dormant)**: newest series (highest `order`)
   renders expanded; older `complete` series collapse to a native
   `<details>` summary line ("name · n parts · date range"); older
   `in-progress` series stay expanded. With today's single series the
   output is identical to the design.
5. **Live values**: static HTML ships honest placeholders ("pending",
   "checks: pending first deploy"). A second small script fetches
   `manifest.json` and renders it as found: check names, pass/fail marks,
   "N of M checks passed", sha in the residue line, verdict green only
   when everything passed. On 404 it falls back to the GitHub API latest
   commit sha (sessionStorage-cached), labeled as exactly that, and the
   merge box says plainly the manifest is not yet available. No code path
   renders a check name that was not fetched.
6. **Action**: `.github/workflows/review.yml` ported from
   evidence-aesthetic; checks renamed to the design's vocabulary:
   `html_valid`, `links_ok`, `prose_lint`, `drift`. Same loop prevention
   (paths-ignore + [skip ci]), same concurrency serialization, same
   tip-check manifest commit flow, same SHA-pinned actions, same
   install/check step split (a check that cannot bootstrap is omitted from
   the manifest and still fails the gate).
7. **Checks adapted to the v4 page**: `.htmlvalidate.json` allows exactly
   the two inline-style properties the blessed markup uses (margin-top,
   max-width). `prose-lint` allowlist entries are now rule-scoped; the
   one entry exempts the em dash in the document title (blessed metadata).
   The old habitual-"will" entry died with the old copy.
8. **Housekeeping**: README rewritten for this architecture. Old
   `styles.css` and `main.js` deleted (the v4 page is self-contained);
   old index.html replaced. `assets/` (favicon, og-image) untouched but
   currently unreferenced by the v4 head, `langextract/` not part of this
   repo, nothing else touched.

## Decisions and reasoning (this session)

- **Fonts, option taken**: Google-served latin woff2, self-hosted. The
  brief authorized the fetch route explicitly, and the v23 Sans variable
  file made the budget trivial (75KB total). unicode-range kept identical
  to Google's serving so fallback behavior for ✓/✕/→ glyphs is unchanged
  (they fall to system fonts by design, same as when Google hosted).
- **No end-markers in the generated regions**: the render script splices
  between each GENERATED comment and the section's closing
  `</div></section>`, so index.html's generated sections stay byte-identical
  to the design file. The terminator is unambiguous because generated
  content never emits a four-space-indented `</div>`.
- **`.x` class for failed checks**: one CSS rule added next to
  `.mergebox .checks .c`, using the existing `--del-ink` token. Required
  by transform C (a manifest can carry `fail`); the only styling addition
  in the whole derivation.
- **Fallback labeling**: the GitHub-API sha renders with "via the GitHub
  API" in the merge box, so the page never implies a review happened
  before the first manifest exists.
- **manifest.json is not gitignored**: CI must commit it on main. It is
  simply absent on this branch.

## Verification notes (what was actually run)

Every acceptance item was executed, not assumed:

- No-JS curl: 12 content assertions pass (all sections, greeting comment,
  honest placeholders, no fake "5/5 pass" in static HTML).
- Request log across three loads: same-origin only (page, manifest,
  3 fonts). Google Fonts gone. GitHub API called only when manifest 404s.
- Fonts: variable axis verified with fontTools (wght 100-700); computed
  h1 = IBM Plex Sans 600; fallback stacks hold layout (h1 one line, no
  horizontal scroll) when --sans/--mono lose the Plex names.
- Render: two runs → identical SHA256; first render over the derived file
  reported "already matches" (substrates reproduce the design bytes).
- Drift: pass → substrate edit fails with exit 1 → restore passes.
- Manifest states: sample manifest with a fail and an omitted check
  rendered exactly (✓✓✕, "2 of 3", no green verdict, omitted name absent);
  404 state rendered the pending text + fallback sha 6dae060; cached-sha
  path exercised on reload.
- Boot: 2157ms eval→reveal measured in-page (budget ~2300ms); skip via
  keydown at 200ms revealed at 212ms; reduced-motion (matchMedia stub over
  the real script) never holds and leaves the booted flag unset; repeat
  visit never holds; JS-disabled resting state is the visible page.
- Marks: five `mark.anchor`; real hover intensified mark bg, claim border,
  and comment border to the expected dark-theme token values.
- html-validate passes with the scoped config; links: 17 resolve,
  LinkedIn skipped as bot-blocked (status 999), needs a human eyeball;
  prose lint clean; workflow YAML parses (js-yaml), 10 steps, ids and
  paths-ignore confirmed; write-manifest with mixed outcomes recorded
  a skipped check by omission, exactly as specified.
- Layout: 320/768/1280/1680, no horizontal scroll anywhere; pair grid
  collapses under 860px; light + dark tokens verified by computed values.

Environment caveats, recorded honestly: the browser pane ran unpainted
(screenshots timed out), so visual checks are computed-style and geometry
assertions; John's eyes at review are the pixel check, as last session.
Synthesized keypresses did not reach the page either, so the collapse
fixture's keyboard operability rests on: summary focusable (verified),
programmatic activation toggles both ways (verified), and native
`<details>/<summary>` key handling being user-agent behavior with no
custom handlers in the page. The fixture page itself was verified
structurally and then deleted; it was never committed.

## Artifact map

- `index.html` — the page, derived from design/v4-source.html; two
  GENERATED regions owned by tools/render.js
- `design/v4-source.html` — blessed v4 design record (canonical reference)
- `projects.json`, `writing.json` — substrates (sources of truth)
- `tools/render.js` — generator + drift gate + collapse selftest/fixture
- `tools/prose-lint.mjs` + `tools/prose-lint-allow.json` — copy lint,
  rule-scoped allowlist
- `tools/check-links.mjs` — link check (LinkedIn skip + manifest
  allowance documented in-file)
- `tools/write-manifest.mjs` — manifest writer (CHECKS table = the
  add-a-check registry)
- `.github/workflows/review.yml` — the deploy Action, SHA-pinned
- `.htmlvalidate.json` — scoped inline-style allowance
- `fonts/` — 3 woff2 + OFL license
- `.gitattributes` — LF policy
- `README.md` — maintenance model
- superseded on this branch: styles.css, main.js (deleted); the
  evidence-aesthetic branch design (branch preserved on origin)

## Open questions for John

1. Merge to main? (The only remaining gate.)
2. The v4 head has no favicon/og-image links; `assets/` still carries
   both files. Add the two link tags (a copy change to the blessed head,
   so John's call), or leave as is?
3. Final look on the real domain after merge.

## Session log

- 2026-07-16 | Claude (Fable 5) | Built the full evidence-aesthetic batch
  (7 moves) on branch evidence-aesthetic; pushed to origin | Decisions:
  system serif over woff2, pushed_at for garnish, allowlisted habitual
  "will", LF pinning, manifest-on-failure, PROJECT-LOG committed | Handoff:
  John reviews branch preview and says "merge" or requests changes | Open:
  merge gate, visual taste, PROJECT-LOG location.
- 2026-07-16 | Claude (Fable 5) | Integrated the blessed v4 design on
  branch code-review-redesign (supersedes evidence-aesthetic's design;
  ported its Action/checks); self-hosted fonts, substrates + render,
  dormant series-collapse, honest live values; full acceptance run |
  Decisions: variable-font self-hosting, marker-splice rendering without
  end markers, rule-scoped lint allowlist, scoped html-validate config,
  .x fail styling | Handoff: John reviews preview and says "merge" |
  Open: merge gate, favicon/og links, pixels on the real domain.
