#!/usr/bin/env node
/**
 * render.js: regenerates the two GENERATED sections of index.html from
 * projects.json (02 · selected work) and writing.json (03 · writing).
 *
 *   node tools/render.js                regenerate index.html in place
 *   node tools/render.js --check        drift gate: exit 1 if index.html
 *                                       does not match the substrates
 *   node tools/render.js --selftest     in-memory fixture: prove the
 *                                       series-collapse rule renders
 *   node tools/render.js --fixture F    write a fixture page to F with a
 *                                       synthetic second series (browser
 *                                       proof of the collapse; never
 *                                       committed)
 *
 * Output is deterministic: same JSON in, same bytes out, no timestamps.
 * CommonJS on purpose; runs on any Node without a package.json.
 *
 * Series-collapse rule (dormant while there is one series): series carry
 * status and order (higher = newer). The newest series renders expanded;
 * an older series renders collapsed to a native <details> line only when
 * its status is "complete". An older series still in progress stays
 * expanded, because hiding active work behind a fold would be a lie of
 * emphasis.
 */

'use strict';

const { readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const ROOT = join(__dirname, '..');
const INDEX = join(ROOT, 'index.html');

/* The attribution sentence is approved copy and survives regeneration
 * verbatim, or the render fails. */
const ATTRIBUTION = "Built on top of my team's agent tooling.";

const WORK_MARKER =
  '<!-- GENERATED: work rows are rendered from projects.json by tools/render.(js|py). Edit the JSON, not this HTML. -->';
const WRITING_MARKER =
  '<!-- GENERATED: threads and standalones are rendered from writing.json by tools/render.(js|py). Edit the JSON, not this HTML. -->';

/* Each generated region runs from the end of its marker line to the close
 * of the section's .wrap div. Generated content never contains a
 * four-space "</div>" followed by "</section>", so this terminator is
 * unambiguous. */
const TERMINATOR = '\n    </div>\n  </section>';

function fail(msg) {
  console.error('render: ' + msg);
  process.exit(1);
}

function readJson(name) {
  try {
    return JSON.parse(readFileSync(join(ROOT, name), 'utf8'));
  } catch (e) {
    fail('cannot read ' + name + ': ' + e.message);
  }
}

function renderWorkRow(p) {
  const lines = [];
  lines.push('      <div class="work-row">');
  lines.push('        <div class="pair">');
  lines.push('          <div>');
  lines.push('            <div class="work-head">');
  lines.push('              <h3>' + p.title + '</h3>');
  lines.push('              <span class="status">' + p.status + '</span>');
  lines.push('            </div>');
  lines.push('            <p class="proves">' + p.proves + '</p>');
  lines.push('            <p class="desc">' + p.desc + '</p>');
  if (p.attr) lines.push('            <p class="attr">' + p.attr + '</p>');
  lines.push('          </div>');
  lines.push('          <div class="comment">');
  lines.push(
    '            <p class="chead"><span class="' + p.review.icon + '">' +
    (p.review.icon === 'ok' ? '✓' : '✕') + '</span> ' + p.review.label + '</p>'
  );
  lines.push('            <pre>' + p.review.pre + '</pre>');
  lines.push('            <p class="cnote">' + p.review.cnote + '</p>');
  if (p.review.act) {
    lines.push(
      '            <p class="act"><a href="' + p.review.act.href + '">' +
      p.review.act.text + '</a></p>'
    );
  }
  lines.push('          </div>');
  lines.push('        </div>');
  lines.push('      </div>');
  return lines.join('\n');
}

function renderWork(projects) {
  if (!Array.isArray(projects.projects) || projects.projects.length === 0) {
    fail('projects.json has no projects');
  }
  if (!projects.projects.some((p) => (p.attr || '').includes(ATTRIBUTION))) {
    fail('the attribution sentence is missing from projects.json: "' + ATTRIBUTION + '"');
  }
  return '\n\n' + projects.projects.map(renderWorkRow).join('\n\n');
}

function threadLines(series, indent) {
  return series.parts.map((part, i) =>
    indent + '<li><span class="meta">part ' + (i + 1) + ' · ' + part.date +
    '</span><a href="' + part.url + '">' + part.title + '</a></li>'
  );
}

function renderSeries(series, isNewest, topMargin) {
  const style = topMargin ? ' style="margin-top:30px"' : '';
  const label = series.name + ' · ' + series.parts.length + ' parts';
  const lines = [];
  if (isNewest || series.status !== 'complete') {
    lines.push('      <p class="grouplabel"' + style + '>' + label + '</p>');
    lines.push('      <ul class="thread">');
    lines.push(...threadLines(series, '        '));
    lines.push('      </ul>');
  } else {
    const range = series.parts[0].date + ' – ' + series.parts[series.parts.length - 1].date;
    lines.push('      <details' + (topMargin ? ' style="margin-top:30px"' : '') + '>');
    lines.push('        <summary class="grouplabel">' + label + ' · ' + range + '</summary>');
    lines.push('        <ul class="thread">');
    lines.push(...threadLines(series, '          '));
    lines.push('        </ul>');
    lines.push('      </details>');
  }
  return lines.join('\n');
}

function renderWriting(writing) {
  if (!Array.isArray(writing.series) || writing.series.length === 0) {
    fail('writing.json has no series');
  }
  for (const s of writing.series) {
    if (s.status !== 'complete' && s.status !== 'in-progress') {
      fail('series "' + s.name + '" has status "' + s.status + '"; use "complete" or "in-progress"');
    }
    if (typeof s.order !== 'number') fail('series "' + s.name + '" has no numeric order');
  }
  const orders = writing.series.map((s) => s.order);
  if (new Set(orders).size !== orders.length) fail('series orders must be unique');

  const sorted = [...writing.series].sort((a, b) => b.order - a.order);
  const lines = [];
  lines.push('      <p class="serieslabel">' + writing.serieslabel + '</p>');
  sorted.forEach((s, i) => {
    lines.push(renderSeries(s, i === 0, i > 0));
  });
  lines.push('      <p class="grouplabel" style="margin-top:30px">standalones</p>');
  lines.push('      <ul class="standalones">');
  for (const s of writing.standalones || []) {
    lines.push(
      '        <li><span class="meta">' + s.date + '</span><a href="' + s.url +
      '">' + s.title + '</a></li>'
    );
  }
  lines.push('      </ul>');
  return '\n' + lines.join('\n');
}

function splice(html, marker, body, what) {
  const at = html.indexOf(marker);
  if (at === -1) fail('marker not found for ' + what + '; is index.html intact?');
  const from = at + marker.length;
  const to = html.indexOf(TERMINATOR, from);
  if (to === -1) fail('section terminator not found after the ' + what + ' marker');
  return html.slice(0, from) + body + html.slice(to);
}

function generate(html, projects, writing) {
  let out = splice(html, WORK_MARKER, renderWork(projects), 'work');
  out = splice(out, WRITING_MARKER, renderWriting(writing), 'writing');
  return out;
}

/* --selftest / --fixture: a synthetic second, newer series. The real
 * gating series becomes the older complete one and must collapse. */
function syntheticWriting(writing) {
  return {
    serieslabel: writing.serieslabel,
    series: [
      ...writing.series,
      {
        name: 'the synthetic series',
        status: 'in-progress',
        order: Math.max(...writing.series.map((s) => s.order)) + 1,
        parts: [
          { date: '2026-07-01', title: 'Synthetic part one', url: 'https://example.com/1' },
          { date: '2026-07-08', title: 'Synthetic part two', url: 'https://example.com/2' }
        ]
      }
    ],
    standalones: writing.standalones
  };
}

function selftest(writing) {
  const body = renderWriting(syntheticWriting(writing));
  const must = [
    /* newest series expanded, first, no fold */
    '<p class="grouplabel">the synthetic series · 2 parts</p>',
    /* older complete series collapsed to a details line with a date range */
    '<details style="margin-top:30px">',
    '<summary class="grouplabel">the gating series · 4 parts · 2026-05-14 – 2026-06-21</summary>',
    /* the full thread still lives inside the fold */
    'Capturing review lessons: how I stopped my feedback loop from depending on my memory',
    /* standalones untouched */
    '<p class="grouplabel" style="margin-top:30px">standalones</p>'
  ];
  for (const needle of must) {
    if (!body.includes(needle)) {
      console.error(body);
      fail('selftest: missing expected fragment: ' + needle);
    }
  }
  if (body.indexOf('<details') !== body.lastIndexOf('<details')) {
    fail('selftest: expected exactly one collapsed series');
  }
  const withOneSeries = renderWriting(writing);
  if (withOneSeries.includes('<details')) {
    fail('selftest: single-series data must not render a fold');
  }
  console.log('render: selftest pass (older complete series collapses; single series renders flat)');
}

const html = readFileSync(INDEX, 'utf8').replaceAll('\r\n', '\n');
const projects = readJson('projects.json');
const writing = readJson('writing.json');

const mode = process.argv[2] || '';

if (mode === '--selftest') {
  selftest(writing);
} else if (mode === '--fixture') {
  const out = process.argv[3];
  if (!out) fail('--fixture needs an output path (never inside the repo)');
  writeFileSync(out, generate(html, projects, syntheticWriting(writing)));
  console.log('render: fixture page written to ' + out);
} else if (mode === '--check') {
  const expected = generate(html, projects, writing);
  if (expected !== html) {
    fail('index.html does not match the substrates; run: node tools/render.js');
  }
  console.log('render: index.html matches projects.json and writing.json');
} else if (mode === '') {
  const expected = generate(html, projects, writing);
  if (expected === html) {
    console.log('render: index.html already matches the substrates');
  } else {
    writeFileSync(INDEX, expected);
    console.log('render: index.html regenerated from projects.json and writing.json');
  }
} else {
  fail('unknown mode "' + mode + '"; use --check, --selftest, --fixture <path>, or no argument');
}
