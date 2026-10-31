#!/usr/bin/env python3
"""Replace EN lines (Chinese/French) with English mapped from FR sibling lines."""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

HAN = re.compile(r"[\u4e00-\u9fff]")
FR_MARK = re.compile(r"[àâäéèêëïîôùûüçœæ]")
HEADING = re.compile(r"^(#{1,6}\s+)(.+?)(\s*\{#([^}]+)\})?\s*$", re.MULTILINE)
CACHE_PATH = Path(__file__).resolve().parent / "fr-en-line-cache.json"
# Cache is built by scripts/build-fr-en-line-cache.py from parallel EN/FR lines.


def needs_work(line: str) -> bool:
    if HAN.search(line):
        return True
    if FR_MARK.search(line) and re.search(
        r"\b(l'|d'|qu'| les | des | pour | dans | une | cette | sont | avec | est )\b",
        line,
        re.I,
    ):
        return True
    return False


def is_english_line(line: str) -> bool:
    return not needs_work(line)


def build_line_glossary(docs_root: Path) -> dict[str, str]:
    glossary: dict[str, str] = {}
    en_root = docs_root / "en"
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
            if fl == el or not fl.strip():
                continue
            if is_english_line(el):
                glossary.setdefault(fl, el)
    return glossary


def heading_anchors(md: str) -> list[str | None]:
    return [m.group(4) for m in HEADING.finditer(md)]


def apply_en_anchors(text: str, anchors: list[str | None]) -> str:
    idx = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal idx
        hashes, title, _, old_id = m.group(1), m.group(2), m.group(3), m.group(4)
        anchor_id = anchors[idx] if idx < len(anchors) else old_id
        idx += 1
        title = title.strip()
        if anchor_id:
            return f"{hashes}{title} {{#{anchor_id}}}"
        return f"{hashes}{title}"

    return HEADING.sub(repl, text)


def prose_han(md: str) -> int:
    t = re.sub(r"```[\s\S]*?```", "", md)
    t = re.sub(r"\{#[^}]+\}", "", t)
    return len(HAN.findall(t))


def load_cache() -> dict[str, str]:
    if CACHE_PATH.is_file():
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    return {}


def save_cache(cache: dict[str, str]) -> None:
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def materialize_file(
    fr_path: Path, en_path: Path, glossary: dict[str, str], cache: dict[str, str]
) -> tuple[str, int, int]:
    fr_lines = fr_path.read_text(encoding="utf-8").splitlines()
    en_old = en_path.read_text(encoding="utf-8")
    en_lines = en_old.splitlines()
    anchors = heading_anchors(en_old)
    if len(fr_lines) != len(en_lines):
        raise ValueError("line count mismatch")

    out: list[str] = []
    miss = 0
    for fl, el in zip(fr_lines, en_lines):
        if not needs_work(el):
            out.append(el)
            continue
        if fl in glossary:
            out.append(glossary[fl])
        elif fl in cache:
            out.append(cache[fl])
        else:
            miss += 1
            out.append(el)

    text = "\n".join(out)
    if en_old.endswith("\n"):
        text += "\n"
    text = apply_en_anchors(text, anchors)
    return text, miss, prose_han(text)


def main() -> None:
    docs_root = Path(__file__).resolve().parent.parent
    en_root = docs_root / "en"
    glossary = build_line_glossary(docs_root)
    cache = load_cache()
    print(f"Glossary {len(glossary)}, cache {len(cache)}", flush=True)

    total_miss = 0
    for en_path in sorted(en_root.rglob("*.md")):
        rel = en_path.relative_to(en_root)
        fr_path = docs_root / rel
        if not fr_path.is_file():
            continue
        before = prose_han(en_path.read_text(encoding="utf-8"))
        if before == 0 and not needs_work(en_path.read_text(encoding="utf-8")):
            continue
        try:
            text, miss, after = materialize_file(fr_path, en_path, glossary, cache)
        except ValueError as e:
            print(f"SKIP {rel}: {e}", flush=True)
            continue
        en_path.write_text(text, encoding="utf-8")
        total_miss += miss
        if before != after or miss:
            print(f"{rel}: han {before}->{after}, cache_miss={miss}", flush=True)

    save_cache(cache)
    if total_miss:
        print(f"Still missing {total_miss} lines (extend {CACHE_PATH.name})", flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
