#!/usr/bin/env python3
"""Build fr-en-line-cache.json from parallel lines in already-English en/*.md pages."""
from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

HAN = re.compile(r"[\u4e00-\u9fff]")
FR = re.compile(r"[àâäéèêëïîôùûüçœæ]")


def is_english_line(line: str) -> bool:
    if HAN.search(line):
        return False
    if FR.search(line) and re.search(
        r"\b(l'|d'|qu'| les | des | pour | dans | une | cette | sont | avec | est )\b",
        line,
        re.I,
    ):
        return False
    return True


def main() -> None:
    docs_root = Path(__file__).resolve().parent.parent
    en_root = docs_root / "en"
    counter: Counter[tuple[str, str]] = Counter()
    for fr_path in docs_root.rglob("*.md"):
        if fr_path.parts[0] == "en" or "homepage" in fr_path.parts:
            continue
        en_path = en_root / fr_path.relative_to(docs_root)
        if not en_path.is_file():
            continue
        fr_lines = fr_path.read_text(encoding="utf-8").splitlines()
        en_lines = en_path.read_text(encoding="utf-8").splitlines()
        if len(fr_lines) != len(en_lines):
            continue
        for fl, el in zip(fr_lines, en_lines):
            if fl == el or fl.startswith("```") or len(fl) < 15:
                continue
            if not is_english_line(el):
                continue
            if FR.search(fl):
                counter[(fl, el)] += 1

    line_map = {fr: en for (fr, en), _ in counter.items()}
    out = Path(__file__).resolve().parent / "fr-en-line-cache.json"
    out.write_text(json.dumps(line_map, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(line_map)} entries to {out.name}")


if __name__ == "__main__":
    main()
