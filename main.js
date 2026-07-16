'use strict';

/* Boot sequence. The inline script in <head> decides whether this visit
   gets the sequence at all (first visit this session, motion allowed, JS
   running) by adding .boot-hold; every other path never hides anything.
   This module performs the review and releases the hold. Every exit path
   releases it: completion, any click or keypress, the head script's 2s
   failsafe, or an error event. performance.measure('boot-sequence') records
   the real duration; the budget is 1500ms. */
(function () {
  var docEl = document.documentElement;
  if (window.__bootFailsafe) clearTimeout(window.__bootFailsafe);
  if (!docEl.classList.contains('boot-hold')) return;
  try { sessionStorage.setItem('boot-played', '1'); } catch (e) {}
  performance.mark('boot-start');

  var CMD = '$ review index.html';
  var DIMS = ['clarity', 'readability', 'style', 'completeness', 'accuracy'];
  var TYPE_MS = 180;
  var DIM_START = 240;
  var DIM_GAP = 56;
  var PASS_AT = DIM_START + DIM_GAP * DIMS.length + 40;
  var REVEAL_AT = PASS_AT + 140;

  var timers = [];
  var done = false;

  var overlay = document.createElement('div');
  overlay.className = 'boot-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  var term = document.createElement('div');
  term.className = 'boot-terminal';
  var cmd = document.createElement('p');
  cmd.className = 'boot-cmd';
  cmd.textContent = '$ ';
  term.appendChild(cmd);
  overlay.appendChild(term);
  document.body.appendChild(overlay);

  function at(ms, fn) { timers.push(window.setTimeout(fn, ms)); }

  for (var s = 1; s <= 10; s += 1) {
    (function (step) {
      at((TYPE_MS / 10) * step, function () {
        cmd.textContent = CMD.slice(0, Math.ceil((CMD.length * step) / 10));
      });
    })(s);
  }

  DIMS.forEach(function (name, i) {
    at(DIM_START + DIM_GAP * i, function () {
      var line = document.createElement('p');
      line.className = 'boot-dim';
      line.textContent = name + ' ' + '.'.repeat(18 - name.length) + ' ';
      var ok = document.createElement('span');
      ok.className = 'boot-ok';
      ok.textContent = 'pass';
      line.appendChild(ok);
      term.appendChild(line);
    });
  });

  at(PASS_AT, function () {
    var line = document.createElement('p');
    line.className = 'boot-pass';
    line.textContent = '5/5 dimensions PASS';
    var chip = document.createElement('span');
    chip.className = 'boot-pass-chip';
    chip.textContent = 'PASS';
    line.appendChild(chip);
    term.appendChild(line);
  });

  at(REVEAL_AT, function () { finish(false); });

  function markEnd() {
    performance.mark('boot-end');
    try { performance.measure('boot-sequence', 'boot-start', 'boot-end'); } catch (e) {}
  }

  function finish(skipped) {
    if (done) return;
    done = true;
    timers.forEach(clearTimeout);
    window.removeEventListener('pointerdown', skip, true);
    window.removeEventListener('keydown', skip, true);
    docEl.classList.remove('boot-hold');
    overlay.classList.add('is-done');
    if (skipped) {
      overlay.remove();
      markEnd();
      return;
    }
    docEl.classList.add('boot-reveal');
    window.setTimeout(function () { overlay.remove(); }, 160);
    /* The measurement ends when the last reveal animation ends. */
    var footer = document.querySelector('.site-footer');
    var measured = false;
    function settle() {
      if (measured) return;
      measured = true;
      markEnd();
    }
    if (footer) footer.addEventListener('animationend', settle, { once: true });
    window.setTimeout(settle, 640);
  }

  function skip() { finish(true); }
  window.addEventListener('pointerdown', skip, true);
  window.addEventListener('keydown', skip, true);
})();

/* Theme toggle. First paint is handled by the inline script in <head>;
   this only wires the header button. */
(function () {
  var btn = document.getElementById('theme-toggle');
  var media = window.matchMedia('(prefers-color-scheme: dark)');
  function current() {
    return document.documentElement.dataset.theme || (media.matches ? 'dark' : 'light');
  }
  function reflect() {
    btn.setAttribute('aria-pressed', String(current() === 'dark'));
  }
  btn.addEventListener('click', function () {
    var next = current() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) {}
    reflect();
  });
  reflect();
})();

/* Dev.to feed. The fallback entries are already in the HTML; the list is
   only replaced once a good response is in hand, so any failure (network,
   CORS, empty body) silently leaves the static list in place. */
(function () {
  var FEED_URL = 'https://dev.to/api/articles?username=wordcaster';
  var list = document.getElementById('articles');

  function render(articles) {
    var items = articles.map(function (a) {
      var li = document.createElement('li');
      li.className = 'article';

      var h3 = document.createElement('h3');
      h3.className = 'article-title';
      var link = document.createElement('a');
      link.href = a.url;
      link.textContent = a.title;
      h3.appendChild(link);

      var meta = document.createElement('p');
      meta.className = 'article-meta';
      var date = new Date(a.published_at).toLocaleDateString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric'
      });
      meta.textContent = date + ' · ' + a.reading_time_minutes + ' min read';

      li.appendChild(h3);
      li.appendChild(meta);
      if (a.description) {
        var desc = document.createElement('p');
        desc.className = 'article-desc';
        desc.textContent = a.description;
        li.appendChild(desc);
      }
      return li;
    });
    list.replaceChildren.apply(list, items);
  }

  function load() {
    try {
      var cached = sessionStorage.getItem('devto-articles');
      if (cached) {
        render(JSON.parse(cached));
        return;
      }
    } catch (e) {}
    fetch(FEED_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (articles) {
        if (!Array.isArray(articles) || articles.length === 0) throw new Error('empty feed');
        articles.sort(function (a, b) {
          return new Date(b.published_at) - new Date(a.published_at);
        });
        try { sessionStorage.setItem('devto-articles', JSON.stringify(articles)); } catch (e) {}
        render(articles);
      })
      .catch(function () { /* keep the static fallback, no visible error */ });
  }

  load();
})();

/* Evidence annotations. CSS alone reveals the cards on hover and focus, so
   they work with no JavaScript; this adds tap-to-toggle persistence for
   touch, Escape to dismiss, and honest aria-expanded state. */
(function () {
  var notes = Array.prototype.slice.call(document.querySelectorAll('.evidence-note'));
  if (notes.length === 0) return;

  function setOpen(note, open) {
    note.classList.toggle('is-open', open);
    var btn = note.querySelector('.evidence-trigger');
    if (btn) btn.setAttribute('aria-expanded', String(open));
  }

  function closeAll(except) {
    notes.forEach(function (n) {
      if (n !== except) setOpen(n, false);
    });
  }

  notes.forEach(function (note) {
    var btn = note.querySelector('.evidence-trigger');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var open = !note.classList.contains('is-open');
      closeAll(note);
      setOpen(note, open);
    });
  });

  document.addEventListener('click', function (e) {
    if (!(e.target instanceof Element) || !e.target.closest('.evidence-note')) closeAll(null);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeAll(null);
  });
})();

/* Manifest block. Renders manifest.json exactly as found, so a check name
   can only appear here if the Action actually recorded it. When the file is
   missing (branch previews, the window before the first main deploy), falls
   back to the latest commit from the GitHub API and labels it as exactly
   that. When nothing is fetchable, says so plainly. */
(function () {
  var pre = document.getElementById('manifest-pre');
  if (!pre) return;
  var residue = document.querySelector('.residue-sha');

  function setSha(sha) {
    if (residue && typeof sha === 'string' && sha.length >= 7) {
      residue.textContent = sha.slice(0, 7);
    }
  }

  function show(obj) {
    pre.textContent = JSON.stringify(obj, null, 2);
  }

  function renderFallback(data) {
    show({
      note: 'no manifest.json on this deploy; this is the latest commit per the GitHub API, not a record of checks',
      latest_commit: data.sha.slice(0, 7),
      committed_at: data.date
    });
    setSha(data.sha);
  }

  function fallback() {
    try {
      var cached = sessionStorage.getItem('latest-commit');
      if (cached) {
        renderFallback(JSON.parse(cached));
        return;
      }
    } catch (e) {}
    fetch('https://api.github.com/repos/wordcaster/wordcaster.github.io/commits?per_page=1')
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (commits) {
        var data = { sha: commits[0].sha, date: commits[0].commit.committer.date };
        try { sessionStorage.setItem('latest-commit', JSON.stringify(data)); } catch (e) {}
        renderFallback(data);
      })
      .catch(function () {
        pre.textContent = 'No manifest.json on this deploy, and the GitHub API is unreachable from here. Nothing verifiable to show, so nothing is shown.';
      });
  }

  fetch('manifest.json', { cache: 'no-store' })
    .then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .then(function (m) {
      show(m);
      setSha(m.sha);
    })
    .catch(fallback);
})();

/* Last-activity garnish on work cards, for entries that declare a repo.
   Uses the repo's pushed_at (last push to any branch), which is what "last
   activity" honestly means for a fork whose work lives on a side branch.
   Optional by design: any failure leaves the line hidden and the card is
   complete without it. */
(function () {
  var els = Array.prototype.slice.call(document.querySelectorAll('.work-activity[data-repo]'));
  if (els.length === 0) return;

  function relative(iso) {
    var days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
    if (days <= 0) return 'today';
    if (days === 1) return 'yesterday';
    if (days < 14) return days + ' days ago';
    if (days < 61) return Math.round(days / 7) + ' weeks ago';
    if (days < 550) return Math.round(days / 30.4) + ' months ago';
    return Math.round(days / 365) + ' years ago';
  }

  els.forEach(function (el) {
    var repo = el.getAttribute('data-repo');
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return;
    var key = 'repo-activity:' + repo;

    function apply(iso) {
      if (!iso) return;
      el.textContent = 'last activity: ' + relative(iso);
      el.hidden = false;
    }

    try {
      var cached = sessionStorage.getItem(key);
      if (cached) {
        apply(cached);
        return;
      }
    } catch (e) {}
    fetch('https://api.github.com/repos/' + repo)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (typeof data.pushed_at !== 'string') return;
        try { sessionStorage.setItem(key, data.pushed_at); } catch (e) {}
        apply(data.pushed_at);
      })
      .catch(function () { /* the card is complete without it */ });
  });
})();

/* Gate demo. Evidence over status: the Post button consults the artifact,
   never the agent's claim. Running the scans writes gate.json into the
   panel line by line, pinned to HEAD; pushing a new commit strands it. */
(function () {
  var DIMS = [
    { name: 'Clarity', key: 'clarity', hits: 0 },
    { name: 'Readability', key: 'readability', hits: 2 },
    { name: 'Style', key: 'style', hits: 0 },
    { name: 'Completeness', key: 'completeness', hits: 0 },
    { name: 'Technical accuracy', key: 'technical_accuracy', hits: 0 }
  ];
  var SHAS = ['9f3a2c1', '4b8e7d2', 'c51d0fa', '7e2b9a4'];
  var KEY_PAD = 22;

  var chips = document.querySelectorAll('#gate-demo .chip');
  var panel = document.getElementById('artifacts');
  var headEl = document.getElementById('head-sha');
  var live = document.getElementById('gate-live');
  var postBtn = document.getElementById('post-btn');
  var scanBtn = document.getElementById('scan-btn');
  var commitBtn = document.getElementById('commit-btn');
  var resetBtn = document.getElementById('reset-btn');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  var headIdx = 0;
  var artifact = null;
  var scanning = false;
  var runSeq = 0;

  function head() { return SHAS[headIdx % SHAS.length]; }
  function tick() { return reduced.matches ? 0 : 300; }
  function announce(msg) { live.textContent = msg; }
  function stamp() { return new Date().toISOString().replace(/\.\d+Z$/, 'Z'); }

  function setChip(i, state, status) {
    chips[i].dataset.state = state;
    chips[i].querySelector('.chip-status').textContent = status;
  }

  function print(text, cls) {
    var line = document.createElement('div');
    line.className = 'artifact-line' + (cls ? ' is-' + cls : '');
    line.textContent = text;
    panel.appendChild(line);
    panel.scrollTop = panel.scrollHeight;
    return line;
  }

  function dimLine(dim, status, comma) {
    var key = '"' + dim.key + '":';
    while (key.length < KEY_PAD) key += ' ';
    return '    ' + key + '{ "hits": ' + dim.hits + ', "status": "' + status + '" }' + (comma ? ',' : '');
  }

  function post() {
    if (!artifact) {
      print('BLOCKED: no gate.json on disk. The hook reads files, not sentences.', 'err');
      announce('Blocked. No gate artifact on disk.');
    } else if (!artifact.complete) {
      print('BLOCKED: gate.json is still being written (' + artifact.settled + '/5 dimensions). The hook reads files, not sentences.', 'err');
      announce('Blocked. The gate artifact is incomplete, ' + artifact.settled + ' of 5 dimensions written.');
    } else if (artifact.sha !== head()) {
      print('BLOCKED: gate.json is pinned to ' + artifact.sha + ' ≠ HEAD ' + head() + '. Re-run the scans against the current commit.', 'err');
      announce('Blocked. The gate artifact is stale. Re-run the scans against the current commit.');
    } else {
      print('Posted. Evidence over status.', 'ok');
      announce('Review posted. Evidence over status.');
    }
  }

  function scan() {
    if (scanning) return;
    scanning = true;
    scanBtn.disabled = true;
    panel.replaceChildren();
    var sha = head();
    var run = ++runSeq;

    artifact = {
      sha: sha,
      settled: 0,
      complete: false,
      lines: [],
      oidLine: null,
      statusLine: null
    };

    function record(line) {
      artifact.lines.push(line);
      return line;
    }

    record(print('{'));
    record(print('  "artifact": "PR-1234-gate.json",'));
    artifact.oidLine = record(print('  "pr_head_oid": "' + sha + '",'));
    record(print('  "generated_at": "' + stamp() + '",'));
    record(print('  "dimensions": {'));

    function settle() {
      artifact.settled += 1;
      if (artifact.settled < DIMS.length) return;
      record(print('  },'));
      artifact.statusLine = record(print('  "status": "pass"'));
      record(print('}'));
      artifact.complete = true;
      scanning = false;
      scanBtn.disabled = false;
      announce('gate.json written for commit ' + sha + ', all five dimensions pass. Gate open.');
    }

    DIMS.forEach(function (dim, i) {
      var comma = i < DIMS.length - 1;
      setTimeout(function () {
        if (run !== runSeq) return;
        if (dim.hits === 0) {
          record(print(dimLine(dim, 'pass', comma)));
          setChip(i, 'verified', 'verified');
          settle();
        } else {
          var line = record(print(dimLine(dim, 'reviewing', comma)));
          setChip(i, 'pending', dim.hits + ' hits');
          setTimeout(function () {
            if (run !== runSeq) return;
            line.textContent = dimLine(dim, 'resolved', comma);
            setChip(i, 'verified', 'verified');
            settle();
          }, tick() * 2.5);
        }
      }, tick() * (i + 1));
    });
  }

  function pushCommit() {
    if (scanning) return;
    headIdx += 1;
    headEl.textContent = head();
    if (!artifact) {
      announce('New commit pushed. HEAD is now ' + head() + '.');
      return;
    }
    artifact.lines.forEach(function (line) { line.classList.add('is-stale'); });
    artifact.oidLine.classList.remove('is-stale');
    artifact.oidLine.classList.add('is-mismatch');
    print('✗ stale: pr_head_oid ' + artifact.sha + ' ≠ HEAD ' + head() + '. This artifact no longer counts.', 'err');
    chips.forEach(function (c, i) { setChip(i, 'stale', 'stale'); });
    announce('New commit pushed. The gate artifact is stale and the gate is locked again. Re-run the scans.');
  }

  function reset() {
    runSeq += 1;
    headIdx = 0;
    artifact = null;
    scanning = false;
    scanBtn.disabled = false;
    headEl.textContent = head();
    panel.replaceChildren();
    chips.forEach(function (c, i) { setChip(i, 'none', 'no artifact'); });
    announce('Demo reset.');
  }

  postBtn.addEventListener('click', post);
  scanBtn.addEventListener('click', scan);
  commitBtn.addEventListener('click', pushCommit);
  resetBtn.addEventListener('click', reset);
})();
