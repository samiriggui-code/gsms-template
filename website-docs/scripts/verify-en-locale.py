#!/usr/bin/env python3
"""Verify website-docs/en: file count and zero Han in visible prose (anchors/code excluded)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

HAN = re.compile(r"[\u4e00-\u9fff]")


def prose_without_code_and_anchors(md: str) -> str:
    md = re.sub(r"```[\s\S]*?```", "", md)
    md = re.sub(r"\{#[^}]+\}", "", md)
    return md


def main() -> int:
    en_root = Path(__file__).resolve().parent.parent / "en"
    files = sorted(en_root.rglob("*.md"))
    offenders: list[tuple[str, int]] = []
    for path in files:
        text = path.read_text(encoding="utf-8")
        prose = prose_without_code_and_anchors(text)
        count = len(HAN.findall(prose))
        if count:
            offenders.append((str(path.relative_to(en_root)), count))

    print(f"Markdown files under en/: {len(files)}")
    if offenders:
        print(f"Files with Han in prose: {len(offenders)}")
        for rel, n in offenders:
            print(f"  {rel}: {n}")
        return 1
    print("Han in prose: 0 (anchors and code fences excluded)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
