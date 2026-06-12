'use strict';

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

/* Gate demo. Evidence over status: the Post button consults artifacts,
   never the agent's claim. */
(function () {
  var DIMS = [
    { name: 'Clarity', file: 'clarity', hits: 0 },
    { name: 'Readability', file: 'readability', hits: 2 },
    { name: 'Style', file: 'style', hits: 0 },
    { name: 'Completeness', file: 'completeness', hits: 0 },
    { name: 'Technical accuracy', file: 'accuracy', hits: 0 }
  ];
  var SHAS = ['9f3a2c1', '4b8e7d2', 'c51d0fa', '7e2b9a4'];
  var DOT = ' · ';

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
  var artifacts = [];
  var scanning = false;
  var runSeq = 0;

  function head() { return SHAS[headIdx % SHAS.length]; }
  function tick() { return reduced.matches ? 0 : 300; }
  function announce(msg) { live.textContent = msg; }
  function stamp(i) { return '08:59:' + String(12 + i).padStart(2, '0') + 'Z'; }

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

  function artifactText(dim, sha, i, resolved) {
    var hits = dim.hits ? dim.hits + ' hits' + (resolved ? ' → resolved' : '') : '0 hits';
    return 'PR-1234-' + dim.file + '.json' + DOT + 'sha ' + sha + DOT + hits + DOT + stamp(i);
  }

  function post() {
    var fresh = artifacts.filter(function (a) { return a.sha === head(); }).length;
    if (fresh === DIMS.length) {
      print('Posted. Evidence over status.', 'ok');
      announce('Review posted. Evidence over status.');
    } else if (artifacts.length > 0 && fresh < artifacts.length) {
      print('BLOCKED: stale artifacts (sha ' + artifacts[0].sha + ' ≠ HEAD ' + head() + '). Re-run the scans against the current commit.', 'err');
      announce('Blocked. Artifacts are stale. Re-run the scans against the current commit.');
    } else {
      print('BLOCKED: missing gate artifacts (' + fresh + '/5). The hook reads files, not sentences.', 'err');
      announce('Blocked. Missing gate artifacts, ' + fresh + ' of 5 present.');
    }
  }

  function scan() {
    if (scanning) return;
    scanning = true;
    scanBtn.disabled = true;
    artifacts = [];
    panel.replaceChildren();
    var sha = head();
    var settled = 0;
    var run = ++runSeq;

    function settle() {
      settled += 1;
      if (settled < DIMS.length) return;
      scanning = false;
      scanBtn.disabled = false;
      announce('Five artifacts written for commit ' + sha + '. Gate open.');
    }

    DIMS.forEach(function (dim, i) {
      setTimeout(function () {
        if (run !== runSeq) return;
        var line = print(artifactText(dim, sha, i, false));
        artifacts.push({ sha: sha, line: line });
        if (dim.hits === 0) {
          setChip(i, 'verified', 'verified');
          settle();
        } else {
          setChip(i, 'pending', dim.hits + ' hits');
          setTimeout(function () {
            if (run !== runSeq) return;
            line.textContent = artifactText(dim, sha, i, true);
            setChip(i, 'verified', 'verified');
            settle();
          }, tick() * 2.5);
        }
      }, tick() * (i + 1));
    });
  }

  function pushCommit() {
    if (scanning) return;
    var old = head();
    headIdx += 1;
    headEl.textContent = head();
    if (artifacts.length === 0) {
      announce('New commit pushed. HEAD is now ' + head() + '.');
      return;
    }
    artifacts.forEach(function (a) { a.line.classList.add('is-stale'); });
    chips.forEach(function (c, i) { setChip(i, 'stale', 'stale'); });
    print('HEAD moved to ' + head() + '. Artifacts above are pinned to ' + old + ' and no longer count. Re-run the scans.', 'err');
    announce('New commit pushed. All artifacts are stale and the gate is locked again. Re-run the scans.');
  }

  function reset() {
    runSeq += 1;
    headIdx = 0;
    artifacts = [];
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
