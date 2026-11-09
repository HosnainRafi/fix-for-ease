# Fix For Ease — site rebuild

A standalone rebuild of **https://fixforease.com**, reverse-engineered from the live site (captured 8 November 2026): same layout, type, colour, motion and copy, but with the CSS and JavaScript externalised, every asset stored locally, and the contact form wired to a working endpoint.

No framework, no build step required to view it — plain HTML, CSS and vanilla JS.

---

## Quick start

```bash
# from this folder
npm run dev          # http://localhost:4173
```

Or open `index.html` directly in a browser (`file://` works; the form needs the dev server).

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run verify` | Checks all 227 local `href`/`src` references resolve |
| `npm run audit` | Headless-Chrome media audit of every route (images, video, 4xx, console) |
| `npm run shot` | Full-page screenshot of the home page to `_ref/shots/home.png` |
| `npm run build` | Regenerates the HTML/CSS/JS from the reference capture in `_ref/` |

Dependencies: Node 18+ for the tooling. `puppeteer-core` drives your installed Chrome/Edge — no browser download.

---

## Pages

| File | Route on the original | Sections |
| --- | --- | --- |
| `index.html` | `/` | Hero film, milestones, the problem, films carousel, before/after compare, vertical reels, client marquee, services, testimonials, founder, booking form |
| `ourworks.html` | `/ourworks` | Photos / Videos switch, category filters, masonry photo grid + lightbox, video grid + modal, show-more |
| `ourteam.html` | `/ourteam` | Founder, management & senior QC, editors grid |
| `how-it-works.html` | `/how-it-works` | Four-step panel switcher (Monday.com, Frame.io, live tracking, bulk tracking) |
| `faq.html` | `/faq` | 16-item accordion, CTA |
| `404.html` | — | Styled not-found page |

Routes are flat files so the site works on any static host, including `file://`.

---

## Structure

```
.
├── index.html                 # 5 pages + 404
├── ourworks.html
├── ourteam.html
├── how-it-works.html
├── faq.html
├── 404.html
├── assets/
│   ├── css/                   # home.css, ourworks.css, … + flatpickr-theme.css, a11y.css, 404.css
│   ├── js/                    # home.js, ourworks.js, … + nav-theme.js, booking.js
│   ├── img/
│   │   ├── hero-poster.jpg    # frame extracted from the hero loop
│   │   ├── logo.png, og.png, favicon.png, apple-touch-icon.png
│   │   ├── ms-*.png, edit-suite-3d.png, prob-camera-sony.png
│   │   ├── thumbs/yt/         # 13 localized film posters (1280×720)
│   │   └── work/              # 45 photos + 11 blur-up thumbnails
│   ├── video/hero-loop.mp4    # 15 MB hero film
│   └── vendor/flatpickr/      # vendored date picker (CSS + JS)
├── scripts/                   # serve.js, verify.js, audit.js, screenshot.js, make-poster.js
├── tools/                     # extract-reference.py, normalize-assets.py, build-site.py
├── docs/REVERSE-ENGINEERING.md
└── _ref/                      # raw reference capture (HTML, extracted blocks, screenshots)
```

---

## How the rebuild was produced

1. **Capture** — `curl` each route, then `tools/extract-reference.py` splits every page into markup / CSS / JS and inventories local assets.
2. **Normalise** — `tools/normalize-assets.py` maps `/static/images`, `/uploads`, `/thumb` into `assets/img`, `assets/img/work`, `assets/img/work/thumbs`.
3. **Rebuild** — `tools/build-site.py` writes the final documents: externalises CSS/JS, rewrites asset URLs, turns server routes into flat files, localises YouTube posters, removes dead players and emits `404.html`, `robots.txt`, `sitemap.xml`.
4. **Verify** — `verify.js` for references, `audit.js` for media, `screenshot.js` for visual comparison against the live site.

Full findings — design tokens, section map, interaction inventory, defects found in the original — are in [`docs/REVERSE-ENGINEERING.md`](docs/REVERSE-ENGINEERING.md).

---

## What differs from the live site

Visual output is intended to be identical. The differences are infrastructure and repairs:

- CSS/JS moved out of the HTML into cacheable files; Flatpickr served locally instead of the jsDelivr CDN.
- All images and posters stored locally. YouTube thumbnails were 480×360 (`hqdefault`); the rebuild uses 1280×720 masters.
- Hero poster is a frame from the actual video instead of a remote Unsplash photo.
- **Removed 3 reels and 4 Our Works cards** whose Bunny Stream library (`iframe.mediadelivery.net/embed/772876/…`) returns 404 and whose thumbnails return 403 — broken on the live site as well. Everything remaining plays.
- Contact form posts to `POST /submit`, handled by `scripts/serve.js` (appends to `data/enquiries.ndjson`). On a static host, point it at Formspree/Netlify or keep using the WhatsApp button.
- Added: skip link, focus-visible rings, `404.html`, `robots.txt`, `sitemap.xml`, Open Graph tags.
- Removed dead code: an unused `#hero-yt-player` initialiser and a duplicate Flatpickr include.

---

## Deploy

Any static host works — Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3.

```bash
# GitHub
git init
git add .
git commit -m "Fix For Ease site rebuild"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

`404.html` is picked up automatically by Netlify/GitHub Pages. Update the `example.com` host in `sitemap.xml` and `robots.txt` before going live, and set `og:image` to an absolute URL if you need rich previews.

---

## Attribution

Design, copy, photography and film content © Fix For Ease. This rebuild is a technical reproduction for the site owner's use; replace the imagery and copy before publishing it as an unrelated brand.
