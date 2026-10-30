#!/usr/bin/env python3
"""Build EN markdown from FR siblings using aligned FR->EN blocks from already-translated pages."""
from __future__ import annotations

import re
import sys
from pathlib import Path

HAN = re.compile(r"[\u4e00-\u9fff]")
HEADING_ANCHOR = re.compile(r"^(#{1,6}\s+)(.+?)(\s*\{#([^}]+)\})?\s*$", re.MULTILINE)


def split_blocks(text: str) -> list[str]:
    blocks: list[str] = []
    buf: list[str] = []
    in_fence = False
    for line in text.splitlines(keepends=True):
        if line.strip().startswith("```"):
            in_fence = not in_fence
        if not in_fence and line.strip() == "" and buf:
            blocks.append("".join(buf).strip("\n"))
            buf = []
            continue
        buf.append(line)
    if buf:
        blocks.append("".join(buf).strip("\n"))
    return blocks


def build_glossary(docs_root: Path) -> dict[str, str]:
    glossary: dict[str, str] = {}
    en_root = docs_root / "en"
    for fr_path in docs_root.rglob("*.md"):
        if fr_path.parts[0] == "en" or "homepage" in fr_path.parts:
            continue
        en_path = en_root / fr_path.relative_to(docs_root)
        if not en_path.is_file():
            continue
        fr_blocks = split_blocks(fr_path.read_text(encoding="utf-8"))
        en_blocks = split_blocks(en_path.read_text(encoding="utf-8"))
        if len(fr_blocks) != len(en_blocks):
            continue
        for fr_b, en_b in zip(fr_blocks, en_blocks):
            if fr_b == en_b or fr_b.startswith("```") or HAN.search(fr_b):
                continue
            if HAN.search(en_b):
                continue
            glossary[fr_b] = en_b
    return glossary


def heading_anchors(md: str) -> list[str | None]:
    return [m.group(4) for m in HEADING_ANCHOR.finditer(md)]


def apply_en_anchors(translated: str, en_anchors: list[str | None]) -> str:
    idx = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal idx
        hashes, title, _old, _old_id = m.group(1), m.group(2), m.group(3), m.group(4)
        anchor_id = en_anchors[idx] if idx < len(en_anchors) else _old_id
        idx += 1
        title = title.strip()
        if anchor_id:
            return f"{hashes}{title} {{#{anchor_id}}}"
        return f"{hashes}{title}"

    return HEADING_ANCHOR.sub(repl, translated)


def prose_han_count(text: str) -> int:
    t = re.sub(r"```[\s\S]*?```", "", text)
    t = re.sub(r"\{#[^}]+\}", "", t)
    return len(HAN.findall(t))


def translate_file(fr_path: Path, en_path: Path, glossary: dict[str, str]) -> tuple[str, int, int]:
    fr_text = fr_path.read_text(encoding="utf-8")
    en_text = en_path.read_text(encoding="utf-8")
    en_anchors = heading_anchors(en_text)
    fr_blocks = split_blocks(fr_text)
    out_blocks: list[str] = []
    missing = 0
    for block in fr_blocks:
        if block in glossary:
            out_blocks.append(glossary[block])
        elif not HAN.search(block) and re.search(r"[àâäéèêëïîôùûüçœæ]", block):
            missing += 1
            out_blocks.append(block)
        else:
            out_blocks.append(block)
    result = "\n\n".join(out_blocks) + ("\n" if fr_text.endswith("\n") else "")
    result = apply_en_anchors(result, en_anchors)
    return result, missing, prose_han_count(result)


def main() -> None:
    docs_root = Path(__file__).resolve().parent.parent
    en_root = docs_root / "en"
    glossary = build_glossary(docs_root)
    print(f"Glossary entries: {len(glossary)}", flush=True)

    targets = sorted(en_root.rglob("*.md"))
    if len(sys.argv) > 1:
        names = set(sys.argv[1:])
        targets = [p for p in targets if p.name in names or str(p.relative_to(en_root)) in names]

    failed: list[str] = []
    for en_path in targets:
        rel = en_path.relative_to(en_root)
        fr_path = docs_root / rel
        if not fr_path.is_file():
            continue
        before = prose_han_count(en_path.read_text(encoding="utf-8"))
        if before == 0 and not re.search(r"[àâäéèêëïîôùûüç]", en_path.read_text(encoding="utf-8")):
            continue
        result, missing, after = translate_file(fr_path, en_path, glossary)
        en_path.write_text(result, encoding="utf-8")
        print(f"{rel}: han {before}->{after}, glossary_miss={missing}", flush=True)
        if after or missing:
            failed.append(f"{rel} han={after} miss={missing}")

    if failed:
        print("Needs manual pass:", len(failed), flush=True)
        for line in failed:
            print(" ", line, flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
