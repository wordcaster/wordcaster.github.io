# PROJECT-LOG

Continuity record for agents and humans working on wordcaster.github.io.
Read this first; update it last.

## Current state (2026-07-16)

Branch `evidence-aesthetic` holds the full evidence-aesthetic batch, pushed to
origin, NOT merged. Main is untouched; merging main is John's call alone and
deploys the live site. All seven moves of the batch are built and
machine-verified; John's review gates the merge.

What the batch contains:

1. **Boot sequence**: inline head script applies a `boot-hold` class (first
   visit per session, motion allowed, JS on); main.js types `$ review
   index.html`, ticks five dimensions, shows `5/5 dimensions PASS`, then
   staged reveal. Measured 1360-1362ms on consecutive first visits (budget
   1500ms), via `performance.measure('boot-sequence')`. Any pointerdown or
   keydown skips instantly. Fail-open: the resting CSS state is the fully
   visible page; the hold is released by completion, skip, a 2s failsafe
   timeout, or a window error listener. Mirrors `failClosed:false` in the
   real hook, deliberately.
2. **Evidence annotations**: three, exactly: "seventeen years", "built the
   verification layer on top" (both in #work prose), and "verified" on the
   LangExtract card (injected by the render script's ANNOTATIONS table).
   CSS-only reveal on hover/focus-within; JS adds tap-to-toggle,
   aria-expanded, Escape, click-out. Cards work with JS disabled.
3. **Manifest**: `#manifest` section renders manifest.json client-side.
   Fallback chain: manifest.json → GitHub API latest commit (labeled as
   exactly that, sessionStorage-cached) → a plain "nothing verifiable"
   sentence. No path can display a check name that did not run: the page
   renders the file as found, and the file is written only from step
   outcomes.
4. **projects.json substrate**: two entries, both `shipped`, copy verbatim
   from the previous hand-written cards. `tools/render-cards.mjs`
   regenerates the card block between BEGIN/END markers in index.html;
   byte-identical across runs (verified by SHA256 of two consecutive runs).
   `--check` mode is the CI drift gate; deliberately editing projects.json
   without re-rendering makes it exit 1 (verified, then restored).
   attribution_note is enforced: the script fails if the note is not
   verbatim inside the description.
5. **Demo → artifact viewer**: running scans writes a parseable gate.json
   (pr_head_oid, dimensions{hits,status}, status) into the panel line by
   line; push-commit strikes it stale, turns the pr_head_oid line deny-red,
   and appends a `✗ stale` marker with the pinned sha vs HEAD. Full rewrite
   of the demo's artifact rendering, not the minimal scope-valve version;
   the existing code structure took the extension cleanly.
6. **Typography/color**: headings + hero caption use a system serif stack
   (`ui-serif, "Iowan Old Style", "Palatino Linotype", Palatino, Georgia,
   serif`) at zero bytes. Mono is now semantic-only (eyebrow and article
   dates lost mono; evidence contexts kept it). New tokens: `--pass`,
   `--deny`, `--wip` in both themes; `--wip` reserved for the in-progress
   chip, which nothing uses yet (both entries are shipped, which is the
   truth).
7. **README**: documents the Action's four checks, the add-a-check
   two-part rule, the manifest-names-only-what-ran rule, and the
   projects.json loop.

## Decisions and reasoning

- **Font choice (move 6 preference order)**: took option (b), the system
  serif stack, not a self-hosted woff2. Reasons: zero bytes and zero binary
  blobs in a view-source site, no build-time third-party fetch, and this
  agent's operating rules require explicit permission per file download,
  which the single consolidated checkpoint had already passed. If John wants
  Fraunces, it is a follow-up: subset woff2 under 60KB, self-hosted,
  license file alongside.
- **Loop prevention (move 3)**: two independent brakes. (1) The workflow
  triggers on push to main with `paths-ignore: [manifest.json]`; the
  manifest commit touches only manifest.json, so the path filter excludes
  the entire push event. (2) The commit message carries `[skip ci]`, which
  GitHub Actions honors for push events independently of path filters.
  Either brake alone stops the loop; both would have to fail
  simultaneously.
- **Manifest commit flow on a busy main**: runs are serialized by a
  `concurrency` group, and the commit step only pushes if origin/main still
  equals the sha the checks ran against; otherwise it steps aside, because
  the newer push's run records its own manifest. Every manifest commit's
  parent is therefore exactly the sha the manifest describes, and two
  quick pushes can never produce a rebase conflict or a stale manifest on
  a newer tree. (The first design rebased-and-pushed; review caught that it
  could conflict and could land manifest(X) on top of commit Y.)
- **Checks that never ran stay unnamed**: html-validate's npm install is a
  separate step; if the registry or network fails, the check step is
  skipped, the manifest omits it, and the gate step still turns the run
  red because a review with a missing check is not a passing review.
  Known bound, accepted and documented: html-validate's own transitive
  dependencies are not lockfile-pinned (this repo deliberately has no
  package.json); the tool version itself is exact-pinned.
- **Manifest on failure**: a failing check still writes and commits an
  honest manifest (result: "fail") and the run goes red afterwards. The
  page shows what happened; Pages deploys on push regardless of this
  workflow, so hiding the manifest would just be a worse lie.
- **First manifest**: manifest.json first exists after the first push to
  main, which happens after John merges. Until then the page uses the
  GitHub API fallback and labels it as such. The check-links tool allowlists
  manifest.json as missing-by-design for the same reason.
- **Garnish data source**: repo-level `pushed_at` (last push to any
  branch), not default-branch commit date, because the langextract fork's
  work lives on the `docs-site` branch and the default branch would show a
  stale upstream date. Verified against the live API: pushed_at 2026-06-22
  renders "last activity: 3 weeks ago".
- **Prose lint vs approved copy**: the approved sentence "It will also,
  like every agent, happily report…" is habitual "will", not future tense.
  The lint has a scoped allowlist (`tools/prose-lint-allow.json`) with that
  one entry and its reason; the exemption applies only inside the exact
  snippet. A fixture test confirmed other will/would still fail.
- **Line endings**: `.gitattributes` pins LF for all text so the
  byte-identical drift check behaves the same on a Windows working tree and
  the Linux runner. The render script also normalizes CRLF when reading,
  treating line endings as git's domain, content as its own.
- **PROJECT-LOG.md is committed**, not local-only: a public build log on a
  site whose whole thesis is inspectable evidence is a feature, and future
  agents get continuity from any clone. Flagged to John at review.

## Verification notes (what was actually run)

See the acceptance checklist in the delivery message of 2026-07-16; every
"pass" there was executed, not assumed. Environment caveats recorded
honestly: the browser pane ran hidden (no painted pixels), so visual checks
were computed-style and geometry assertions plus John's own eyes at review;
reduced-motion was tested via a matchMedia stub copy of the page, not an OS
toggle; actionlint was unavailable, so the workflow got a js-yaml parse
plus review instead.

A multi-agent adversarial review ran over the batch; a session usage limit
killed most of the verifier agents mid-run, so the 7 raw findings were
triaged by hand instead of by the skeptic fleet, and the two reviewer
dimensions that never started (JS correctness, repo tools) were re-reviewed
inline. Outcome: 6 findings fixed (:has fallback, JS-owned keyboard reveal
with truthful aria-expanded + Escape focus return, focusable manifest pre,
boot-chip border fallback, tip-check manifest push flow, install/check step
split), 1 accepted and documented (html-validate transitive dependencies).

## Artifact map

- `index.html` — all content, including generated Selected work block
  (BEGIN/END markers) and inline boot-hold head script
- `styles.css` — tokens (`--pass/--deny/--wip/--serif`), boot styles,
  evidence cards, status chips, manifest pre
- `main.js` — boot, theme, feed, annotations, manifest render, garnish,
  gate demo (artifact viewer)
- `projects.json` — card substrate (source of truth)
- `tools/render-cards.mjs` — generator + drift check (`--check`)
- `tools/prose-lint.mjs` + `tools/prose-lint-allow.json` — copy lint
- `tools/check-links.mjs` — link check (LinkedIn skip + manifest allowance
  documented in-file)
- `tools/write-manifest.mjs` — manifest writer (CHECKS table = the
  add-a-check registry)
- `.github/workflows/review.yml` — the deploy Action, SHA-pinned
- `.gitattributes` — LF policy
- `README.md` — maintenance model

## Open questions for John

1. Merge to main? (The only remaining gate.)
2. Visual taste: boot pacing, serif choice, chip tints, evidence-card
   shadow. All adjustable without structural change.
3. Keep PROJECT-LOG.md public in the repo, or move it out?

## Session log

- 2026-07-16 | Claude (Fable 5) | Built the full evidence-aesthetic batch
  (7 moves) on branch evidence-aesthetic; pushed to origin | Decisions:
  system serif over woff2, pushed_at for garnish, allowlisted habitual
  "will", LF pinning, manifest-on-failure, PROJECT-LOG committed | Handoff:
  John reviews branch preview and says "merge" or requests changes | Open:
  merge gate, visual taste, PROJECT-LOG location.
