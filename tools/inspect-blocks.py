import re, pathlib
STYLE_RE = re.compile(r"<style[^>]*>(.*?)</style>", re.S | re.I)
SCRIPT_RE = re.compile(r"<script(?![^>]*\bsrc=)([^>]*)>(.*?)</script>", re.S | re.I)
for f in ["home.html", "ourworks.html", "ourteam.html", "how-it-works.html", "faq.html"]:
    raw = (pathlib.Path("_ref") / f).read_text(encoding="utf-8")
    styles = [m.group(1) for m in STYLE_RE.finditer(raw)]
    scripts = [m for m in SCRIPT_RE.finditer(raw)]
    print(f"\n{f}: {len(styles)} styles, {len(scripts)} scripts")
    print("  style sizes:", [len(s) for s in styles])
    for i, m in enumerate(scripts):
        attrs = m.group(1).strip()
        code = m.group(2)
        print(f"  script[{i}] attrs={attrs!r} len={len(code)} head={code.strip()[:60]!r}")
