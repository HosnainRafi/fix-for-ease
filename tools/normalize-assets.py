#!/usr/bin/env python3
"""Normalize the raw reference download into the project's asset tree."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parent.parent
A = ROOT / "assets"

(A / "img").mkdir(parents=True, exist_ok=True)
(A / "img" / "work").mkdir(parents=True, exist_ok=True)
(A / "img" / "work" / "thumbs").mkdir(parents=True, exist_ok=True)
(A / "video").mkdir(parents=True, exist_ok=True)

# /static/images -> assets/img
src = A / "static"
if src.exists():
    for f in src.iterdir():
        shutil.move(str(f), A / "img" / f.name)
    src.rmdir()

# /uploads -> assets/img/work  (mp4 goes to assets/video)
src = A / "uploads"
if src.exists():
    for f in src.iterdir():
        if f.suffix.lower() in {".mp4", ".webm"}:
            shutil.move(str(f), A / "video" / ("hero-loop" + f.suffix.lower()))
        else:
            shutil.move(str(f), A / "img" / "work" / f.name)
    src.rmdir()

# /thumb -> assets/img/work/thumbs
src = A / "thumbs"
if src.exists():
    for f in src.iterdir():
        shutil.move(str(f), A / "img" / "work" / "thumbs" / f.name)
    src.rmdir()

for d in ["css", "js", "vendor/flatpickr"]:
    (A / d).mkdir(parents=True, exist_ok=True)

print("asset tree:")
for p in sorted(A.rglob("*")):
    if p.is_file():
        print(f"  {p.relative_to(ROOT)}  {p.stat().st_size:>10,}")
