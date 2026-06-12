# wordcaster.github.io

One-page portfolio for John Edgar Rojas, senior technical writer in Amsterdam. Live at https://wordcaster.github.io.

## Stack

Plain semantic HTML, modern CSS, and vanilla JavaScript. No framework, no build step, no dependencies, no analytics, no cookies.

Why no framework: the page is a single column of prose with one small interactive widget. A framework would add a build step, a dependency tree, and kilobytes of runtime to solve problems this page does not have. View source and you see the whole site.

## Files

- `index.html`: structure and all copy
- `styles.css`: theming (light and dark), layout, the gate demo styles
- `main.js`: theme toggle, Dev.to feed, gate demo
- `assets/`: favicon and Open Graph image

## How the feed works

The Writing section fetches `https://dev.to/api/articles?username=wordcaster` client-side, renders the articles newest first, and caches the response in `sessionStorage` for the rest of the browser session. New articles on Dev.to appear automatically; the repo never needs a commit for them.

The two newest articles are also hard-coded in `index.html` as a static fallback. The script only replaces that list after a successful fetch, so any failure (network, CORS, empty response) silently leaves the fallback in place.

## Adding a Selected work entry

Copy one `<article class="work-entry">` block in `index.html` (inside the `#selected` section), paste it below the existing one, and edit its title, body paragraph, and links. That block is the entire data structure; nothing else changes.

## License

Code is MIT; the written content (all prose and article text) is all rights reserved.
