#!/usr/bin/env node
/**
 * render-cards.mjs: generates the Selected work cards in index.html from
 * projects.json. The served page stays static HTML; this script runs at edit
 * time, never at deploy time.
 *
 *   node tools/render-cards.mjs          rewrite the block in index.html
 *   node tools/render-cards.mjs --check  regenerate and diff; exit 1 on drift
 *
 * Determinism contract: the same projects.json bytes produce the same
 * fragment bytes. Entries render in array order, keys are read explicitly,
 * there are no timestamps, and output is LF-only. Line endings are git's
 * domain (.gitattributes pins LF), so --check normalizes CRLF before
 * comparing; every other byte counts.
 *
 * The ANNOTATIONS table below injects the page's evidence annotation into a
 * card's description. It lives here, not in projects.json, because the JSON
 * holds approved copy verbatim and markup is a rendering concern.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = join(ROOT, 'projects.json');
const INDEX = join(ROOT, 'index.html');

const BEGIN = '<!-- BEGIN selected-work (generated from projects.json by tools/render-cards.mjs; edit the JSON and re-run, not this block) -->';
const END = '<!-- END selected-work -->';

const STATUSES = ['shipped', 'in-progress'];

/* Evidence annotations rendered into card descriptions, keyed by project id.
 * "find" is wrapped (first occurrence) in the annotation control; the card
 * text is approved copy and must stay verbatim. */
const ANNOTATIONS = {
  'langextract-docs': {
    find: 'verified',
    text: 'Independently reviewed for accuracy after the build. Zero accuracy errors found. Judge for yourself:',
    linkLabel: 'wordcaster.github.io/langextract',
    linkUrl: 'https://wordcaster.github.io/langextract/'
  }
};

function fail(msg) {
  console.error('render-cards: ' + msg);
  process.exit(1);
}

function escapeHtml(s) {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function validate(projects) {
  if (!Array.isArray(projects) || projects.length === 0) {
    fail('projects.json must be a non-empty array');
  }
  for (const p of projects) {
    for (const field of ['id', 'name', 'status', 'description']) {
      if (typeof p[field] !== 'string' || p[field] === '') {
        fail(`entry ${JSON.stringify(p.id || p.name || '?')} is missing "${field}"`);
      }
    }
    if (!STATUSES.includes(p.status)) {
      fail(`entry "${p.id}": status must be one of ${STATUSES.join(' | ')}, got "${p.status}"`);
    }
    if (!Array.isArray(p.proves) || p.proves.length === 0 || !p.proves.every((s) => typeof s === 'string' && s !== '')) {
      fail(`entry "${p.id}": "proves" must be a non-empty array of strings`);
    }
    if (!Array.isArray(p.links) || !p.links.every((l) => l && typeof l.label === 'string' && typeof l.url === 'string')) {
      fail(`entry "${p.id}": "links" must be an array of {label, url}`);
    }
    if (p.repo !== undefined && !/^[\w.-]+\/[\w.-]+$/.test(p.repo)) {
      fail(`entry "${p.id}": "repo" must look like "owner/name"`);
    }
    /* The attribution note is load-bearing. If it is declared, it must appear
     * verbatim in the rendered description; anything else is silent drift. */
    if (p.attribution_note !== undefined && !p.description.includes(p.attribution_note)) {
      fail(`entry "${p.id}": attribution_note is not present verbatim in the description`);
    }
  }
  const ids = projects.map((p) => p.id);
  if (new Set(ids).size !== ids.length) fail('duplicate project ids');
}

function renderDescription(p) {
  let html = escapeHtml(p.description);
  const note = ANNOTATIONS[p.id];
  if (note) {
    const target = escapeHtml(note.find);
    if (!html.includes(target)) {
      fail(`entry "${p.id}": annotation target "${note.find}" not found in description`);
    }
    const control =
      '<span class="evidence-note">' +
      `<button type="button" class="evidence-trigger" aria-expanded="false">${target}</button>` +
      '<span class="evidence-card" role="note">' +
      '<span class="evidence-label">evidence</span>' +
      `<span class="evidence-body">${escapeHtml(note.text)} ` +
      `<a href="${escapeHtml(note.linkUrl)}">${escapeHtml(note.linkLabel)}</a></span>` +
      '</span></span>';
    html = html.replace(target, control);
  }
  return html;
}

function renderCard(p) {
  const lines = [];
  lines.push(`      <article class="work-entry" id="project-${escapeHtml(p.id)}">`);
  lines.push('        <div class="work-entry-head">');
  lines.push(`          <h3>${escapeHtml(p.name)}</h3>`);
  lines.push(`          <span class="status-chip" data-status="${escapeHtml(p.status)}">${escapeHtml(p.status)}</span>`);
  lines.push('        </div>');
  lines.push(`        <p>${renderDescription(p)}</p>`);
  lines.push('        <ul class="work-links">');
  for (const l of p.links) {
    lines.push(`          <li><a href="${escapeHtml(l.url)}">${escapeHtml(l.label)}</a></li>`);
  }
  lines.push('        </ul>');
  lines.push(`        <p class="work-proves"><span class="proves-label">proves:</span> ${p.proves.map(escapeHtml).join(' &middot; ')}</p>`);
  if (p.repo !== undefined) {
    lines.push(`        <p class="work-activity" data-repo="${escapeHtml(p.repo)}" hidden></p>`);
  }
  lines.push('      </article>');
  return lines.join('\n');
}

function renderFragment(projects) {
  return [BEGIN.replace(/^/, '      '), ...projects.map(renderCard), END.replace(/^/, '      ')].join('\n');
}

const projects = JSON.parse(readFileSync(PROJECTS, 'utf8'));
validate(projects);
const fragment = renderFragment(projects);

const indexRaw = readFileSync(INDEX, 'utf8').replaceAll('\r\n', '\n');
const beginAt = indexRaw.indexOf(BEGIN);
const endAt = indexRaw.indexOf(END);
if (beginAt === -1 || endAt === -1 || endAt < beginAt) {
  fail('could not find the BEGIN/END selected-work markers in index.html');
}
const lineStart = indexRaw.lastIndexOf('\n', beginAt) + 1;
const current = indexRaw.slice(lineStart, endAt + END.length);
const next = indexRaw.slice(0, lineStart) + fragment + indexRaw.slice(endAt + END.length);

if (process.argv.includes('--check')) {
  if (current === fragment) {
    console.log('render-cards: index.html matches projects.json');
  } else {
    console.error('render-cards: DRIFT: the Selected work block in index.html does not match projects.json.');
    console.error('render-cards: run "node tools/render-cards.mjs" and commit both files.');
    process.exit(1);
  }
} else {
  writeFileSync(INDEX, next);
  console.log('render-cards: wrote the Selected work block to index.html');
}
