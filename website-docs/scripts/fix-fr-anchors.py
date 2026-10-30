#!/usr/bin/env python3
"""Replace {#...} anchor IDs that contain Han with ASCII slugs from the French heading."""
from __future__ import annotations

import hashlib
import re
import sys
import unicodedata
from pathlib import Path

HAN = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]")
HEADING_ANCHOR = re.compile(r"^(?P<hashes>#{1,6})\s+(?P<title>.+?)\s+\{#(?P<anchor>[^}]+)\}\s*$")
LINK = re.compile(r"\(#(?P<anchor>[^)]+)\)")


def slugify(title: str) -> str:
    t = title.strip()
    t = HAN.sub("", t)
    t = t.replace("’", "'").replace("«", "").replace("»", "")
    t = unicodedata.normalize("NFKD", t)
    t = t.encode("ascii", "ignore").decode("ascii")
    t = t.lower()
    t = re.sub(r"[^a-z0-9]+", "-", t)
    t = re.sub(r"-+", "-", t).strip("-")
    if t:
        return t
    h = hashlib.sha1(title.encode("utf-8")).hexdigest()[:10]
    return f"heading-{h}"


def process_file(path: Path) -> int:
    text = path.read_text(encoding="utf-8")
    mapping: dict[str, str] = {}

    for line in text.splitlines():
        m = HEADING_ANCHOR.match(line)
        if not m:
            continue
        anchor = m.group("anchor")
        if not HAN.search(anchor):
            continue
        new = slugify(m.group("title"))
        if new != anchor:
            mapping[anchor] = new

    if not mapping:
        return 0

    def sub_link(m: re.Match[str]) -> str:
        a = m.group("anchor")
        return f"(#{mapping.get(a, a)})"

    new_text = LINK.sub(sub_link, text)
    for old, new in sorted(mapping.items(), key=lambda x: -len(x[0])):
        new_text = new_text.replace(f"{{#{old}}}", f"{{#{new}}}")

    if new_text != text:
        path.write_text(new_text, encoding="utf-8")
    return len(mapping)


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    files = sys.argv[1:] or [
        str(p)
        for p in root.rglob("*.md")
        if "en/" not in str(p.relative_to(root)).split("/")[0:1]
        and "-zh-backup" not in p.name
        and p.is_relative_to(root)
    ]
    total = 0
    for f in files:
        p = Path(f)
        if not p.is_file():
            continue
        n = process_file(p)
        if n:
            print(f"{n:3d} anchors  {p.relative_to(root)}")
            total += n
    print(f"Done. {total} anchors remapped.")


if __name__ == "__main__":
    main()
