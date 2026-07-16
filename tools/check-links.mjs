#!/usr/bin/env node
/**
 * check-links.mjs: verifies every link on the page.
 *
 *   node tools/check-links.mjs [file.html]   (default: index.html)
 *
 * Internal targets must exist on disk, fragment targets must match an id in
 * the document, and external URLs must answer 200-399 (three attempts).
 *
 * Documented exceptions, because the manifest never claims more than ran:
 *   - manifest.json may be absent: the deploy Action writes it after this
 *     check first runs, so on a fresh branch it does not exist yet.
 *   - linkedin.com answers bots with status 999; it is reported as skipped
 *     and needs a human eyeball, not marked as verified.
 *   - HTTP 429 (rate limited) counts as reachable: the host answered.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = process.argv[2] || join(ROOT, 'index.html');

const ALLOW_MISSING_FILES = ['manifest.json'];
const BOT_BLOCKED_HOSTS = ['www.linkedin.com', 'linkedin.com'];

const html = readFileSync(TARGET, 'utf8');

const urls = new Set();
for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) urls.add(m[1]);
for (const m of html.matchAll(/content="(https?:\/\/[^"]+)"/g)) urls.add(m[1]);

const ids = new Set();
for (const m of html.matchAll(/\bid="([^"]+)"/g)) ids.add(m[1]);

let failures = 0;
let checked = 0;
const notes = [];

function ok(kind, url, extra) {
  checked += 1;
  console.log(`  ok    ${kind.padEnd(9)} ${url}${extra ? '  (' + extra + ')' : ''}`);
}

function bad(kind, url, why) {
  checked += 1;
  failures += 1;
  console.error(`  FAIL  ${kind.padEnd(9)} ${url}  (${why})`);
}

async function checkExternal(url) {
  const host = new URL(url).hostname;
  if (BOT_BLOCKED_HOSTS.includes(host)) {
    checked += 1;
    notes.push(`skipped ${url}: ${host} blocks non-browser clients (status 999); verify by hand`);
    console.log(`  skip  external  ${url}  (bot-blocked host, human check required)`);
    return;
  }
  let lastErr = 'no attempt';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      const res = await fetch(url, {
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'User-Agent': 'wordcaster-link-check/1.0 (+https://wordcaster.github.io)' }
      });
      clearTimeout(timer);
      if (res.status >= 200 && res.status < 400) {
        ok('external', url, `HTTP ${res.status}`);
        return;
      }
      if (res.status === 429) {
        ok('external', url, 'HTTP 429, host answered but rate-limits; counted as reachable');
        return;
      }
      lastErr = `HTTP ${res.status}`;
    } catch (e) {
      lastErr = e.name === 'AbortError' ? 'timeout after 15s' : String(e.cause || e.message || e);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
  bad('external', url, lastErr);
}

const externals = [];
for (const url of [...urls].sort()) {
  if (url.startsWith('#')) {
    if (ids.has(url.slice(1))) ok('fragment', url);
    else bad('fragment', url, 'no element with that id');
  } else if (url.startsWith('mailto:')) {
    if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url)) ok('mailto', url);
    else bad('mailto', url, 'malformed address');
  } else if (/^https?:\/\//.test(url)) {
    externals.push(url);
  } else {
    const path = url.split('#')[0].split('?')[0];
    if (existsSync(join(ROOT, path))) {
      ok('internal', url);
    } else if (ALLOW_MISSING_FILES.includes(path)) {
      checked += 1;
      notes.push(`allowed missing ${path}: written by the deploy Action, absent until the first main deploy`);
      console.log(`  skip  internal  ${url}  (Action-written file, absent before first deploy)`);
    } else {
      bad('internal', url, 'file not found');
    }
  }
}

for (const url of externals) {
  await checkExternal(url);
}

for (const n of notes) console.log('check-links: note: ' + n);
if (failures > 0) {
  console.error(`check-links: ${failures} of ${checked} link(s) failed`);
  process.exit(1);
}
console.log(`check-links: ${checked} link(s) resolve`);
