#!/usr/bin/env node
/**
 * write-manifest.mjs: writes manifest.json from what the deploy Action
 * actually did. Runs in CI only.
 *
 * The one rule that matters: a check appears in the manifest only if its
 * step ran. GitHub reports step outcomes as success / failure / skipped /
 * cancelled; the first two mean the check ran and are recorded, everything
 * else means it did not and is omitted. There is no code path that writes a
 * name without an outcome.
 *
 * Adding a check is a two-part edit, never one without the other:
 *   1. add its step to .github/workflows/review.yml with an id and
 *      continue-on-error, and pass its outcome through env below
 *   2. add { name, env } to CHECKS here
 */

import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const CHECKS = [
  { name: 'html-validate', env: 'CHECK_HTML_VALIDATE' },
  { name: 'link-check', env: 'CHECK_LINK_CHECK' },
  { name: 'prose-lint', env: 'CHECK_PROSE_LINT' },
  { name: 'cards-match-substrate', env: 'CHECK_CARDS' }
];

const sha = process.env.GITHUB_SHA;
if (!sha) {
  console.error('write-manifest: GITHUB_SHA is not set; this script runs in the deploy Action');
  process.exit(1);
}

const checks = [];
for (const c of CHECKS) {
  const outcome = process.env[c.env];
  if (outcome === 'success') checks.push({ name: c.name, result: 'pass' });
  else if (outcome === 'failure') checks.push({ name: c.name, result: 'fail' });
  /* anything else: the step did not run, so the name does not appear */
}

const manifest = {
  sha,
  short_sha: sha.slice(0, 7),
  built_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  checks
};

writeFileSync(join(ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('write-manifest: recorded ' + checks.length + ' check(s) for ' + manifest.short_sha);
