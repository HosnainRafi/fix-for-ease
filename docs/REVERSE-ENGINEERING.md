# Reverse-engineering report — fixforease.com

Capture date: **8 November 2026**. Source: `https://fixforease.com` and its four sub-routes.
Raw evidence is in `_ref/` (`home.html`, `ourworks.html`, `ourteam.html`, `how-it-works.html`, `faq.html`, plus `extracted/` and `shots/`).

---

## 1. Stack fingerprint

| Layer | Finding |
| --- | --- |
| Edge | Cloudflare (`Server: cloudflare`, `CF-*` behaviour) |
| App server | Flask + Jinja. Asset namespaces `/static/images/…`, `/uploads/<32-hex>.jpg`, `/thumb/<32-hex>.jpg` and a `POST /submit` endpoint are Flask conventions |
| Rendering | One self-contained HTML document per route. Page CSS lives in a single `<style>` in `<head>`, behaviour in inline `<script>` blocks at the end of `<body>` |
| Build tooling | None visible: no bundler, no hashed asset names, no framework runtime, no CSS preprocessor |
| Third parties | Google Fonts, YouTube IFrame API (`youtube-nocookie` embeds), Vimeo Player API, Bunny Stream (`iframe.mediadelivery.net`), Flatpickr from jsDelivr |
| Analytics | None detected in the served HTML |

Consequence: the site is four hand-written page templates with duplicated CSS, not a component system. That duplication is reproduced faithfully — each page keeps its own stylesheet.

---

## 2. Route map

| Route | Title | Template style |
| --- | --- | --- |
| `/` | Fix For Ease — You Shoot. We Finish. | Light "paper" page with dark bands, serif quotes, editorial grid |
| `/ourworks` | Our Works — Fix For Ease | Dark gallery (`ow-` prefix), sticky Photos/Videos switch |
| `/ourteam` | Our Team — Fix For Ease | Dark team index (`ot-` prefix) |
| `/how-it-works` | How It Works — Fix For Ease | Dark process explorer (`hw-` prefix), 4 panels |
| `/faq` | FAQ — Fix For Ease | Dark accordion (`fq-` prefix) |

---

## 3. Two design systems

The home page and the inner pages were built at different times and do **not** share tokens. Both are preserved as found.

### Home (`--signal: #262363`, indigo)

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#f3efe8` | Page background, light sections |
| `--ink` | `#0b0a09` | Text, 1px rules |
| `--charcoal` | `#292725` | Hero base |
| `--signal` | `#262363` | Accent, CTAs, compare divider |
| `--brand-blue` | `#0f75bc` | Glow in the offer panel |
| `--brand-sky` | `#79aecd` | Outlined headline, small labels |
| `--stone` | `#746f67` | Secondary copy |
| `--line` | `#d9d5cf` | Hairlines |

Type: `Arial` for body and the huge hero headline, **Inter Tight** 800 for section headings, **Inter** for card copy, `monospace` (IBM Plex Mono) for eyebrows/buttons/labels, **Caveat** for the handwritten asides ("Creators Deserve Support", "More Time for What You Create").

Scale: hero `clamp(72px, 11.5vw, 184px)` / `line-height .78` / `letter-spacing -.075em`; section H2 `clamp(40px, 5.5vw, 84px)`; film titles 34px Georgia; testimonial quote `clamp(38px, 5vw, 76px)` Georgia.

Surfaces: glass nav `blur(64px) saturate(200%)` with a 1.5px inset highlight; 20px cards (`#ECE7F5`); 18px carousel cards; gradient bands `#171820 → #202331 → #181923`; film-grain overlay at 2.5% opacity.

### Inner pages (`--signal: #2e7da6`, steel blue)

| Token | Value |
| --- | --- |
| `--ink` | `#0e0d0c` |
| `--paper` | `#f3efe8` |
| `--charcoal` | `#141211` |
| `--stone` | `#8a8178` |
| `--signal` | `#2e7da6` |
| `--brand-sky` | `#79aecd` |

Type: Inter Tight 800 for page titles (`clamp(52px, 8vw, 120px)`), Inter for body, IBM Plex Mono for labels. Outlined second line via `-webkit-text-stroke: 1px rgba(255,255,255,.35)`.

Note: `ourworks.css` still contains hover rules referencing `#e8470a` (orange), a leftover from an earlier palette.

---

## 4. Home page anatomy

| # | Section | Layout | Notes |
| --- | --- | --- | --- |
| — | Header | Fixed glass pill, 72px, `min(94%, 1440px)` | Switches to light glass (`.nav-light`) once the hero leaves the viewport |
| — | Hero | 100svh video, dual gradient scrim, 1-line statement + outlined line | Hero copy "sleeps" 1.9s after the last pointer move |
| 01 | Milestones | 3 cards `#EDEFFC`, 20px radius, transparent PNGs anchored right | Copy: one-stop solution / seven years / eleven years |
| 02 | The problem | Dark gradient, 1.6fr + .9fr split, 4 bordered cards | Custom 24px line icons, ghost numerals |
| 03 | Films | Horizontal snap carousel, 68vw cards, cloned ends | Click-to-load YouTube, no iframe until play |
| 04 | Photos | Same carousel with a before/after clip-path handle | 10 pairs, 50% split, keyboard arrows |
| 05 | Reels | Vertical 9:16 cards, `scroll-snap-type: x mandatory` | Drag + arrows |
| 06 | Clients | Infinite marquee, 6 logos × 8 copies | Pauses on hover |
| 07 | Offer | Dark "editing desk" panel + 3 outline cards | 84px circular icons rotate 180° on hover |
| 08 | Testimonials | One large serif quote, 01/03 counter | JSON island in the markup |
| 09 | *(missing)* | — | Section index jumps 08 → 10; a "system" block was removed but its CSS remains |
| 10 | Founder | 50/50 photo + pull quote | Links to `/ourteam` |
| 13 | Contact | `--signal` full-bleed, 2 columns | Flatpickr datetime, WhatsApp deep link to `8801743234673` |

Section numbering is deliberately preserved even though labels are `display:none` and the sequence skips 09, 11 and 12.

---

## 5. Interaction inventory

| Behaviour | Implementation | Rebuilt as |
| --- | --- | --- |
| Hero wake/sleep | `pointermove` → `.hero-awake`, 1.9s timer → `.hero-resting` (opacity 0) | Unchanged |
| Nav theme | `hero.getBoundingClientRect().bottom < 80` → `.nav-light` | `assets/js/nav-theme.js` |
| Film carousel | Clones first/last cards, `scrollTo` centring, 6s autoplay, pointer drag, pause on hover/play | Unchanged |
| Video playback | Injects a YouTube iframe on play, destroys siblings | Unchanged |
| Before/after | `clip-path: inset()` driven by pointer capture on the handle, ±2% per arrow key | Unchanged |
| Reels | Free drag with snap-to-card on pointerup | Unchanged |
| Testimonials | 3 quotes from a `application/json` island, wrap-around | Unchanged |
| Reveal | IntersectionObserver adds `.is-visible`, stagger `(i % 4) * 80ms` | Unchanged |
| Parallax | Pointer position smoothed at 0.11, ±10–22px on `.parallax-asset` | Unchanged |
| Booking | Flatpickr, 30-minute increments, `minDate: today`, `D, d M Y — h:i K` | Vendored Flatpickr |
| WhatsApp | Builds a multi-line enquiry and opens `wa.me/8801743234673` | Unchanged |
| Form submit | `fetch('/submit', …)` JSON | Implemented in `scripts/serve.js` → `data/enquiries.ndjson` |

Breakpoints: **900px** (nav collapses to hamburger, grids to 1–2 columns) and **620px** (hero to `18vw`, carousels to 84vw, offer panel hidden, milestones to 3 compact cards). `prefers-reduced-motion` disables animation and parallax.

---

## 6. Payload

| Asset | Size | Note |
| --- | --- | --- |
| `hero-loop.mp4` | 15.1 MB | 1920×1080, silent loop |
| `logo.png` | 790 KB | 3422×4805 — a print asset used at 103×52 |
| `edit-suite-3d.png` | 1.5 MB | 1374×1145 |
| `og.png` | 1.87 MB | 1672×941 |
| 45 work photos | 23 MB | 150–670 KB each |
| 11 blur-up thumbs | 0.1 MB | ~10 KB placeholders |
| Total `assets/` | 31.6 MB | — |

Easy wins if this goes to production: re-encode the logo to WebP at display size, compress `og.png`, and lazy-load the 15 MB hero video with a `preload="none"` + poster-first strategy.

---

## 7. Defects found in the original

1. **Dead video backend.** `https://iframe.mediadelivery.net/embed/772876/<id>` returns **404** for all four Bunny videos, and `vz-0e2b83a7-459.b-cdn.net/<id>/thumbnail.jpg` returns **403** `text/html`. This breaks 3 home reels and 4 Our Works cards on the live site. → Cards removed here; the rest of the catalogue is YouTube and plays.
2. **Remote posters.** Every film/reel poster points at `img.youtube.com` — blocked in some networks, and 480×360 upscaled to 1040×580 cards.
3. **Duplicate Flatpickr.** The page loads Flatpickr CSS+JS from jsDelivr *and* a second inline include; the vendored path is used here.
4. **Dead script.** `#hero-yt-player` is initialised but no such element exists in any template.
5. **Missing tab containers.** `#film-tabs` / `#photo-tabs` are referenced by the carousel code but not rendered; every use is null-guarded.
6. **Empty background layer.** Inner-page heroes declare `url('')` inside a `background` shorthand — a request to the document itself.
7. **Placeholder copy shipped.** `/ourteam` founder bio still reads "This is where the founder's story goes…" and "A second paragraph about their vision…".
8. **Form without a handler contract.** The page posts JSON to `/submit`; nothing in the static output documents the expected response beyond `{ok: true}`.
9. **CSS duplication.** ~39 KB home CSS + ~14–16 KB per inner page, with three near-identical glass-nav implementations.
10. **Heavy brand asset.** The 790 KB print-resolution logo is served to every visitor.

---

## 8. Normalisations applied in this rebuild

| Change | Reason |
| --- | --- |
| CSS/JS externalised per page | Cacheable, diffable; no behaviour change |
| Asset tree normalised (`assets/img`, `work`, `thumbs`, `video`) | Predictable paths |
| YouTube posters localized at 1280×720 | No third-party dependency for images; sharper cards |
| Hero poster from the video itself | Removes an Unsplash dependency; first paint matches playback |
| Dead Bunny cards removed | They cannot play; leaving them would be a broken state |
| Flatpickr vendored | One dependency, no CDN |
| `404.html`, `robots.txt`, `sitemap.xml`, OG/Twitter meta | Deployment completeness |
| Skip link + `:focus-visible` | Keyboard access, no visual change at rest |
| `POST /submit` in the dev server | Makes the form functional locally |
| Flat server routes (`ourworks.html`) | Works on GitHub Pages, S3 and `file://` |

Preserved on purpose: section numbering gaps, the indigo-vs-blue split, the hero sleep behaviour, the 1px outlined headline, the duplicated per-page stylesheets, the placeholder founder bio (it is part of the captured copy — edit `ourteam.html` when real copy arrives).
