#!/usr/bin/env python3
"""
Assemble the standalone static site from the reverse-engineered reference.

The reference capture (fixforease.com, Nov 2026) ships each route as a single
self-contained HTML document with page-level <style> and inline <script>.
This script externalises those assets, rewrites every local URL to the new
asset tree, repairs internal routing for static hosting, and writes the final
documents plus small server files (404, robots, sitemap).

Run:  python tools/build-site.py
"""

from __future__ import annotations

import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "_ref"
EXTRACTED = REF / "extracted"
CSS = ROOT / "assets" / "css"
JS = ROOT / "assets" / "js"

STYLE_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.S | re.I)
SCRIPT_RE = re.compile(r"<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>", re.S | re.I)

FONTS_HOME = (
    "https://fonts.googleapis.com/css2?"
    "family=Inter+Tight:wght@700;800"
    "&family=Inter:wght@400;500;600"
    "&family=IBM+Plex+Mono:wght@500"
    "&family=Caveat:wght@600;700"
    "&display=swap"
)
FONTS_PAGES = (
    "https://fonts.googleapis.com/css2?"
    "family=Inter+Tight:wght@300;400;600;800"
    "&family=Inter:wght@400;500;600"
    "&family=IBM+Plex+Mono:wght@400;500"
    "&display=swap"
)

PAGES = [
    {
        "slug": "index",
        "out": "index.html",
        "title": "Fix For Ease — You Shoot. We Finish.",
        "desc": (
            "Fix For Ease is your invisible post-production team. Editing, delivery and revisions "
            "handled so photographers and videographers can stay focused on shooting."
        ),
        "fonts": FONTS_HOME,
        "css": ["assets/css/home.css", "assets/css/flatpickr-theme.css", "assets/css/a11y.css"],
        "js": ["assets/js/home.js", "assets/js/nav-theme.js", "assets/js/booking.js"],
        "vendor": ["assets/vendor/flatpickr/flatpickr.min.css"],
        "vendor_js": ["assets/vendor/flatpickr/flatpickr.min.js"],
        "theme_color": "#292725",
        "body_class": "",
    },
    {
        "slug": "ourworks",
        "out": "ourworks.html",
        "title": "Our Works — Fix For Ease",
        "desc": (
            "Portfolio of Fix For Ease — South Asian, Western, Multicultural & Destination Wedding "
            "Photography and Videography editing."
        ),
        "fonts": FONTS_PAGES,
        "css": ["assets/css/ourworks.css", "assets/css/a11y.css"],
        "js": ["assets/js/ourworks.js"],
        "vendor": [],
        "vendor_js": [],
        "theme_color": "#141211",
        "body_class": "",
    },
    {
        "slug": "ourteam",
        "out": "ourteam.html",
        "title": "Our Team — Fix For Ease",
        "desc": (
            "Meet the Fix For Ease team — editors, retouchers and QC leads who finish wedding films "
            "and photo galleries for studios worldwide."
        ),
        "fonts": FONTS_PAGES,
        "css": ["assets/css/ourteam.css", "assets/css/a11y.css"],
        "js": ["assets/js/ourteam.js"],
        "vendor": [],
        "vendor_js": [],
        "theme_color": "#141211",
        "body_class": "",
    },
    {
        "slug": "how-it-works",
        "out": "how-it-works.html",
        "title": "How It Works — Fix For Ease",
        "desc": (
            "Every file has a status, every revision a timestamp. See how Fix For Ease runs "
            "post-production on Monday.com, Frame.io and live tracking boards."
        ),
        "fonts": FONTS_PAGES,
        "css": ["assets/css/how-it-works.css", "assets/css/a11y.css"],
        "js": ["assets/js/how-it-works.js"],
        "vendor": [],
        "vendor_js": [],
        "theme_color": "#141211",
        "body_class": "",
    },
    {
        "slug": "faq",
        "out": "faq.html",
        "title": "FAQ — Fix For Ease",
        "desc": (
            "Answers on turnaround, revisions, pricing, file delivery and security at Fix For Ease — "
            "the post-production team behind your studio."
        ),
        "fonts": FONTS_PAGES,
        "css": ["assets/css/faq.css", "assets/css/a11y.css"],
        "js": ["assets/js/faq.js"],
        "vendor": [],
        "vendor_js": [],
        "theme_color": "#141211",
        "body_class": "",
    },
]

REWRITES = [
    ("/uploads/642ef107e645436b887803d371b8a202.mp4", "assets/video/hero-loop.mp4"),
    ("/static/images/", "assets/img/"),
    ("/uploads/", "assets/img/work/"),
    ("/thumb/", "assets/img/work/thumbs/"),
    (
        "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1800&q=88",
        "assets/img/hero-poster.jpg",
    ),
]

# The reference points its film and reel posters at img.youtube.com. They are
# downloaded once into assets/img/thumbs/yt so the site never depends on a
# third-party host for images (and so blocked networks still render).
YT_THUMB_RE = re.compile(r"https://img\.youtube\.com/vi/([A-Za-z0-9_-]{6,})/hqdefault\.jpg")
YT_EMBED_RE = re.compile(r"https://www\.youtube-nocookie\.com/embed/([A-Za-z0-9_-]{6,})")

ARTICLE_RE = re.compile(r"<article\b[^>]*>.*?</article>\s*", re.S)


def strip_dead_embeds(markup: str) -> tuple[str, int]:
    """Drop cards whose player backend no longer exists (Bunny Stream 404)."""
    dropped = 0

    def keep(match: re.Match) -> str:
        nonlocal dropped
        block = match.group(0)
        if "iframe.mediadelivery.net" in block:
            dropped += 1
            return ""
        return block

    return ARTICLE_RE.sub(keep, markup), dropped


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def blocks(raw: str) -> tuple[list[str], list[tuple[str, str]]]:
    styles = [m.group(1) for m in STYLE_RE.finditer(raw)]
    scripts = [(m.group(1).lower(), m.group(2)) for m in SCRIPT_RE.finditer(raw)]
    return styles, scripts


def rewrite_markup(markup: str) -> str:
    for src, dst in REWRITES:
        markup = markup.replace(src, dst)
    # localise YouTube posters
    markup = YT_THUMB_RE.sub(r"assets/img/thumbs/yt/\1.jpg", markup)
    # strip cache-busting queries that now point at local files
    markup = re.sub(r"(assets/img/[\w@.\-]+\.(?:png|jpe?g|webp|svg))\?v=\d+", r"\1", markup)
    # the reference loads Flatpickr from a CDN plus a vendored copy; keep only the vendored one
    markup = re.sub(r"\n<!-- Flatpickr datetime picker -->\n<link[^>]+flatpickr[^>]*>", "", markup)
    markup = re.sub(r'\n?\s*<script src="[^"]*cdn\.jsdelivr\.net/npm/flatpickr"[^>]*></script>', "", markup)
    # internal routes -> flat static pages
    markup = markup.replace('href="/#contact"', 'href="index.html#contact"')
    markup = markup.replace('href="/"', 'href="index.html"')
    markup = re.sub(r'href="/(ourworks|ourteam|how-it-works|faq)"', r'href="\1.html"', markup)
    # anchor target for the skip link on sub-pages
    markup = re.sub(
        r'<section class="((?:ow|ot|hw|fq)-hero)"', r'<section class="\1" id="top"', markup, count=1
    )
    # collapse the blank lines left by removed head/script blocks
    markup = re.sub(r"\n{3,}", "\n\n", markup)
    return markup


def head_block(page: dict) -> str:
    css_links = "\n".join(f'  <link rel="stylesheet" href="{p}">' for p in page["vendor"] + page["css"])
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{html.escape(page["title"])}</title>
  <meta name="description" content="{html.escape(page["desc"])}">
  <meta name="theme-color" content="{page["theme_color"]}">
  <link rel="icon" type="image/png" sizes="64x64" href="assets/img/favicon.png">
  <link rel="apple-touch-icon" href="assets/img/apple-touch-icon.png">

  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Fix For Ease">
  <meta property="og:title" content="{html.escape(page["title"])}">
  <meta property="og:description" content="{html.escape(page["desc"])}">
  <meta property="og:image" content="assets/img/og.png">
  <meta name="twitter:card" content="summary_large_image">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="{page["fonts"]}" rel="stylesheet">
{css_links}
</head>
<body{page["body_class"]}>
  <a class="skip-link" href="#top">Skip to content</a>
"""


def foot_block(page: dict) -> str:
    tags = [f'  <script src="{p}" defer></script>' for p in page["vendor_js"] + page["js"]]
    return "\n".join(tags) + "\n</body>\n</html>\n"


def main() -> int:
    CSS.mkdir(parents=True, exist_ok=True)
    JS.mkdir(parents=True, exist_ok=True)

    for page in PAGES:
        slug = page["slug"]
        raw_path = REF / ("home.html" if slug == "index" else f"{slug}.html")
        raw = read(raw_path)
        body = read(EXTRACTED / slug / "body.html")
        styles, scripts = blocks(raw)

        body = rewrite_markup(body)
        body, dropped = strip_dead_embeds(body)
        if dropped:
            print(f"  removed {dropped} card(s) with a dead Bunny Stream player")

        if slug == "index":
            # block 0 = page CSS, block 1 = flatpickr skin
            (CSS / "home.css").write_text(styles[0].strip() + "\n", encoding="utf-8")
            if len(styles) > 1:
                (CSS / "flatpickr-theme.css").write_text(styles[1].strip() + "\n", encoding="utf-8")
            # scripts: 0 = JSON island (stays in markup), 1 = app, 2 = dead hero player, 3 = nav theme, 4 = booking
            app = scripts[1][1] if len(scripts) > 1 else scripts[0][1]
            (JS / "home.js").write_text(app.strip() + "\n", encoding="utf-8")
            if len(scripts) > 3:
                (JS / "nav-theme.js").write_text(scripts[3][1].strip() + "\n", encoding="utf-8")
            if len(scripts) > 4:
                (JS / "booking.js").write_text(scripts[4][1].strip() + "\n", encoding="utf-8")
        else:
            (CSS / f"{slug}.css").write_text(styles[0].strip() + "\n", encoding="utf-8")
            chunks = [code for attrs, code in scripts if "application/json" not in attrs]
            (JS / f"{slug}.js").write_text("\n".join(c.strip() for c in chunks).strip() + "\n", encoding="utf-8")

        doc = head_block(page) + body.rstrip() + "\n\n" + foot_block(page)
        (ROOT / page["out"]).write_text(doc, encoding="utf-8")
        print(f"built {page['out']:<22} {len(doc):>8,} bytes")

    write_support_files()
    return 0


def write_support_files() -> None:
    (ROOT / "assets" / "css" / "a11y.css").write_text(A11Y_CSS, encoding="utf-8")

    not_found = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page not found — Fix For Ease</title>
  <meta name="robots" content="noindex">
  <link rel="icon" type="image/png" sizes="64x64" href="assets/img/favicon.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;600;800&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/css/404.css">
  <link rel="stylesheet" href="assets/css/a11y.css">
</head>
<body>
  <a class="skip-link" href="#top">Skip to content</a>
  <main class="nf" id="top">
    <div class="nf-eyebrow"><span></span> Error 404</div>
    <h1>WRONG<br><em>FRAME.</em></h1>
    <p>This page has been cut from the timeline. Head back to the edit suite and start again.</p>
    <div class="nf-actions">
      <a class="nf-btn" href="index.html">Back home <span>&#8599;</span></a>
      <a class="nf-link" href="ourworks.html">See our work</a>
    </div>
    <div class="nf-mark">FIX FOR EASE — YOU SHOOT. WE FINISH.</div>
  </main>
</body>
</html>
"""
    (ROOT / "404.html").write_text(not_found, encoding="utf-8")

    (ROOT / "assets" / "css" / "404.css").write_text(NOT_FOUND_CSS, encoding="utf-8")

    (ROOT / "robots.txt").write_text(
        "User-agent: *\nAllow: /\n\n# Update the host before going live.\nSitemap: https://example.com/sitemap.xml\n",
        encoding="utf-8",
    )

    urls = [
        ("", "1.0"),
        ("ourworks.html", "0.9"),
        ("ourteam.html", "0.7"),
        ("how-it-works.html", "0.8"),
        ("faq.html", "0.6"),
    ]
    rows = "\n".join(
        f'  <url><loc>https://example.com/{u}</loc><changefreq>monthly</changefreq>'
        f"<priority>{p}</priority></url>"
        for u, p in urls
    )
    (ROOT / "sitemap.xml").write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        f"{rows}\n</urlset>\n",
        encoding="utf-8",
    )
    print("built 404.html, robots.txt, sitemap.xml, assets/css/a11y.css")


A11Y_CSS = """/* Additive accessibility layer — does not alter the reference design at rest. */
.skip-link {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 999;
  padding: 12px 18px;
  border-radius: 999px;
  background: #0b0a09;
  color: #fff;
  font: 12px 'IBM Plex Mono', monospace;
  letter-spacing: .08em;
  text-transform: uppercase;
  transform: translateY(-160%);
  transition: transform .2s ease;
}
.skip-link:focus-visible { transform: none; }

:focus-visible { outline: 2px solid currentColor; outline-offset: 3px; }

[hidden] { display: none !important; }
"""

NOT_FOUND_CSS = """/* 404 — uses the sub-page visual language (deep charcoal + sky blue). */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --ink: #0e0d0c;
  --charcoal: #141211;
  --signal: #2e7da6;
  --brand-sky: #79aecd;
  --mono: 'IBM Plex Mono', monospace;
}
html, body { min-height: 100%; }
body {
  background:
    radial-gradient(ellipse at 70% 0%, rgba(121, 174, 205, .14), transparent 55%),
    radial-gradient(ellipse at 10% 90%, rgba(46, 125, 166, .18), transparent 50%),
    var(--charcoal);
  color: #fff;
  font-family: 'Inter Tight', sans-serif;
}
.nf {
  min-height: 100svh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 120px 5vw 60px;
  position: relative;
}
.nf-eyebrow {
  display: flex;
  align-items: center;
  gap: 12px;
  font: 11px var(--mono);
  letter-spacing: .2em;
  text-transform: uppercase;
  color: var(--brand-sky);
  margin-bottom: 24px;
}
.nf-eyebrow span { width: 32px; height: 1px; background: var(--brand-sky); }
.nf h1 {
  font-size: clamp(64px, 12vw, 190px);
  font-weight: 800;
  line-height: .86;
  letter-spacing: -.06em;
}
.nf h1 em {
  font-style: normal;
  color: transparent;
  -webkit-text-stroke: 1px rgba(255, 255, 255, .4);
}
.nf p {
  max-width: 460px;
  margin: 28px 0 36px;
  color: rgba(255, 255, 255, .58);
  font: 400 16px/1.6 'Inter', sans-serif;
}
.nf-actions { display: flex; align-items: center; gap: 24px; flex-wrap: wrap; }
.nf-btn {
  display: inline-flex;
  align-items: center;
  gap: 22px;
  padding: 15px 24px;
  border-radius: 999px;
  background: var(--signal);
  color: #fff;
  font: 12px var(--mono);
  letter-spacing: .1em;
  text-transform: uppercase;
  transition: transform .3s, background .3s;
}
.nf-btn:hover { transform: translateY(-2px); background: #3b91bd; }
.nf-link {
  font: 12px var(--mono);
  letter-spacing: .1em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, .65);
  border-bottom: 1px solid rgba(255, 255, 255, .25);
  padding-bottom: 4px;
}
.nf-link:hover { color: #fff; border-color: #fff; }
.nf-mark {
  position: absolute;
  left: 5vw;
  right: 5vw;
  bottom: 26px;
  font: 10px var(--mono);
  letter-spacing: .18em;
  color: rgba(255, 255, 255, .25);
}
"""


if __name__ == "__main__":
    raise SystemExit(main())
