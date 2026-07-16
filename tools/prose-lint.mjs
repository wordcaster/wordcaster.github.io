#!/usr/bin/env node
/**
 * prose-lint.mjs: mechanical style scan over the page's visible copy.
 *
 *   node tools/prose-lint.mjs [file.html]   (default: index.html)
 *
 * Rules, in the spirit of the review dimensions this site is about:
 *   1. no-future        "will" / "would" constructions
 *   2. no-em-dash       em dashes (including &mdash; and numeric forms)
 *   3. no-double-space  two or more spaces inside a line of copy
 *
 * Only visible copy is scanned: comments, <script>, <style>, and tag markup
 * are stripped; entities are decoded first so nothing hides behind &#8212;.
 *
 * tools/prose-lint-allow.json lists exact snippets exempt from rule 1, each
 * with a reason. A match is exempt only when it sits inside an occurrence of
 * a listed snippet, so the exemption cannot leak past the approved sentence.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = process.argv[2] || join(ROOT, 'index.html');
const ALLOW_FILE = join(ROOT, 'tools', 'prose-lint-allow.json');

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  nbsp: ' ', middot: '·', hellip: '…',
  mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘',
  rdquo: '”', ldquo: '“'
};

function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (m, name) =>
      Object.hasOwn(NAMED_ENTITIES, name.toLowerCase()) ? NAMED_ENTITIES[name.toLowerCase()] : m);
}

/* Strip comments, scripts, styles, and markup. Two views of every line:
 * "padded" swaps stripped characters for spaces so column positions hold
 * (the allowlist needs them); "flat" removes tags outright so the spacing
 * check sees only the copy's own spaces, not the gaps markup leaves. */
function visibleLines(html) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' '));
  const noScripts = noComments
    .replace(/<script[\s\S]*?<\/script>/gi, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/<style[\s\S]*?<\/style>/gi, (m) => m.replace(/[^\n]/g, ' '));
  const padded = noScripts.replace(/<[^>]*>/g, (m) => m.replace(/[^\n]/g, ' '));
  const flat = noScripts.replace(/<[^>]*>/g, (m) => m.replace(/[^\n]/g, ''));
  return {
    padded: padded.split('\n').map(decodeEntities),
    flat: flat.split('\n').map(decodeEntities)
  };
}

let allow = [];
try {
  allow = JSON.parse(readFileSync(ALLOW_FILE, 'utf8'));
} catch (e) {
  /* no allowlist file means no exemptions */
}

function allowedRanges(line) {
  const ranges = [];
  for (const entry of allow) {
    let from = 0;
    for (;;) {
      const at = line.indexOf(entry.snippet, from);
      if (at === -1) break;
      ranges.push([at, at + entry.snippet.length]);
      from = at + 1;
    }
  }
  return ranges;
}

const violations = [];
const views = visibleLines(readFileSync(TARGET, 'utf8').replaceAll('\r\n', '\n'));

views.padded.forEach((raw, i) => {
  const lineNo = i + 1;
  const line = raw.replace(/\s+$/, '');
  const flat = views.flat[i].trim();

  for (const m of line.matchAll(/\b(will|would)\b/gi)) {
    const inside = allowedRanges(line).some(([a, b]) => m.index >= a && m.index + m[0].length <= b);
    if (!inside) {
      violations.push({ lineNo, rule: 'no-future', snippet: flat || line.trim() });
    }
  }

  if (/—/.test(line)) {
    violations.push({ lineNo, rule: 'no-em-dash', snippet: flat || line.trim() });
  }

  /* Two or more spaces between words, judged on the copy alone: the flat
   * view has the markup removed, so only spaces the reader gets count. */
  if (/\S {2,}\S/.test(flat)) {
    violations.push({ lineNo, rule: 'no-double-space', snippet: flat });
  }
});

if (violations.length > 0) {
  for (const v of violations) {
    console.error(`prose-lint: ${TARGET}:${v.lineNo} [${v.rule}] ${v.snippet}`);
  }
  console.error(`prose-lint: ${violations.length} violation(s)`);
  process.exit(1);
}
console.log('prose-lint: visible copy is clean (no will/would futures, no em dashes, no double spaces)');
