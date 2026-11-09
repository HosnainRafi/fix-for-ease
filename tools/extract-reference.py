#!/usr/bin/env python3
"""
Reverse-engineering harness for the fixforease.com reference capture.

Reads the raw HTML snapshots in _ref/, splits each page into markup / CSS / JS,
inventories every local asset, downloads the assets into assets/, and rewrites
local asset paths so the captured markup can be assembled into a standalone
static project.

Usage:
    python tools/extract-reference.py --download

The script is intentionally dependency-free (stdlib only) and idempotent.
"""

from __future__ import annotations

import argparse
import html
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "_ref"
EXTRACTED = REF / "extracted"
ASSETS = ROOT / "assets"
IMAGES = ASSETS / "images"
VIDEO = ASSETS / "video"

PAGES = {
    "index": "home.html",
    "ourworks": "ourworks.html",
    "ourteam": "ourteam.html",
    "how-it-works": "how-it-works.html",
    "faq": "faq.html",
}

UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"

STYLE_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.S | re.I)
SCRIPT_RE = re.compile(r"<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>", re.S | re.I)
BODY_RE = re.compile(r"<body[^>]*>(.*?)</body>", re.S | re.I)
HEAD_RE = re.compile(r"<head>(.*?)</head>", re.S | re.I)
TITLE_RE = re.compile(r"<title>(.*?)</title>", re.S | re.I)
DESC_RE = re.compile(r'<meta[^>]+name="description"[^>]+content="([^"]*)"', re.I)

# Local reference assets, ordered longest-prefix-first.
PATH_PREFIXES = (
    ("/static/images/", "assets/images/"),
    ("/uploads/", "assets/images/uploads/"),
    ("/thumb/", "assets/images/thumbs/"),
)

ASSET_ATTR_RE = re.compile(r'(src|data-src|poster|href)="(/[^"]+\.(?:jpe?g|png|webp|gif|svg|mp4|webm|avif))"', re.I)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def split_page(raw: str) -> tuple[str, str, str, str, str]:
    """Return (head, body, css, js, title)."""
    head = HEAD_RE.search(raw)
    body = BODY_RE.search(raw)
    title = TITLE_RE.search(raw)
    desc = DESC_RE.search(raw)
    css_parts: list[str] = []
    js_parts: list[str] = []
    body_html = body.group(1) if body else raw

    # Styles and scripts may sit in <head> (page-level CSS) or in <body>.
    for m in STYLE_RE.finditer(raw):
        css_parts.append(m.group(1))
    body_sans_style = STYLE_RE.sub("", body_html)

    for m in SCRIPT_RE.finditer(raw):
        attrs, code = m.group(1), m.group(2)
        # JSON data islands (e.g. testimonials) stay with the markup.
        if "application/json" in attrs.lower():
            continue
        if "application/ld+json" in attrs.lower():
            continue
        if "application/json" in attrs.lower():
            continue
        js_parts.append(code)
        body_sans_style = body_sans_style.replace(m.group(0), "", 1)

    body_sans_style = SCRIPT_RE.sub(
        lambda m: m.group(0) if "application/json" in m.group(1).lower() else "",
        body_sans_style,
    )

    head_html = head.group(1) if head else ""
    return head_html, body_sans_style, "\n".join(css_parts), "\n".join(js_parts), (
        html.unescape(title.group(1)) if title else ""
    )


def collect_local_assets(text: str) -> set[str]:
    found = set()
    for m in ASSET_ATTR_RE.finditer(text):
        url = m.group(2)
        if url.startswith(PATH_PREFIXES[0][0]) or url.startswith(PATH_PREFIXES[1][0]) or url.startswith(PATH_PREFIXES[2][0]):
            found.add(url)
    # CSS background images, e.g. url('/uploads/foo.jpg')
    for m in re.finditer(r"url\((['\"]?)(/[^)'\"]+\.(?:jpe?g|png|webp|svg|mp4))", text, re.I):
        url = m.group(2)
        if any(url.startswith(p) for p, _ in PATH_PREFIXES):
            found.add(url)
    return found


def download(url_path: str) -> Path | None:
    rel = url_path.lstrip("/")
    dest = ASSETS / rel.replace("/", os.sep)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    url = "https://fixforease.com" + url_path
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://fixforease.com/"})
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            dest.write_bytes(resp.read())
        print(f"  downloaded {url_path} -> {dest.relative_to(ROOT)} ({dest.stat().st_size:,} bytes)")
        return dest
    except Exception as exc:  # noqa: BLE001
        print(f"  !! failed {url_path}: {exc}", file=sys.stderr)
        return None


def rewrite_paths(text: str) -> str:
    for src, dst in PATH_PREFIXES:
        text = text.replace(src, dst)
    return text


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--download", action="store_true", help="fetch referenced local assets from the live site")
    args = ap.parse_args()

    EXTRACTED.mkdir(parents=True, exist_ok=True)
    all_assets: set[str] = set()

    for slug, filename in PAGES.items():
        raw_path = REF / filename
        if not raw_path.exists():
            print(f"missing capture: {raw_path}", file=sys.stderr)
            continue
        raw = read_text(raw_path)
        head, body, css, js, title = split_page(raw)
        out = EXTRACTED / slug
        out.mkdir(parents=True, exist_ok=True)
        (out / "head.html").write_text(head, encoding="utf-8")
        (out / "body.html").write_text(body, encoding="utf-8")
        (out / "style.css").write_text(css, encoding="utf-8")
        (out / "script.js").write_text(js, encoding="utf-8")

        assets = collect_local_assets(raw) | collect_local_assets(head) | collect_local_assets(css)
        all_assets |= assets
        print(
            f"{slug:12s} title={title!r:46s} body={len(body):6,d} css={len(css):6,d} js={len(js):6,d} assets={len(assets)}"
        )

    print(f"\nlocal assets referenced: {len(all_assets)}")
    if args.download:
        print("\ndownloading assets...")
        for url_path in sorted(all_assets):
            download(url_path)
    else:
        for url_path in sorted(all_assets):
            print("  " + url_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
