#!/usr/bin/env python3
"""Produce professional English en/*.md from French siblings; preserve en {#anchors}, code fences."""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

from deep_translator import MyMemoryTranslator

translator = MyMemoryTranslator(source="fr-FR", target="en-US")
HAN = re.compile(r"[\u4e00-\u9fff]")
HEADING = re.compile(r"^(#{1,6}\s+)(.+?)(\s*\{#([^}]+)\})?\s*$", re.MULTILINE)
MYMEMORY_MAX = 480


def has_french_prose(s: str) -> bool:
    """Heuristic: needs translation if not mostly ASCII/code."""
    if HAN.search(s):
        return True
    letters = re.findall(r"[A-Za-zÀ-ÿ]", s)
    if not letters:
        return False
    accented = sum(1 for c in letters if ord(c) > 127)
    french_markers = re.search(
        r"\b(l'|d'|qu'|n'|c'est|les |des |une |pour |avec |dans |cette |cette)\b",
        s,
        re.I,
    )
    return accented > 2 or bool(french_markers)


def translate_with_retry(text: str, retries: int = 10) -> str:
    if not text.strip():
        return text
    delay = 0.4
    for attempt in range(retries):
        try:
            out = translator.translate(text)
            time.sleep(0.25)
            return out
        except Exception as e:
            msg = str(e).lower()
            if "too many requests" in msg or "429" in msg or "connection" in msg:
                time.sleep(delay)
                delay = min(delay * 1.8, 45)
                continue
            raise
    return text


def split_fenced(md: str) -> list[tuple[bool, str]]:
    parts: list[tuple[bool, str]] = []
    pos = 0
    for m in re.finditer(r"```[\s\S]*?```", md):
        if m.start() > pos:
            parts.append((False, md[pos : m.start()]))
        parts.append((True, m.group(0)))
        pos = m.end()
    if pos < len(md):
        parts.append((False, md[pos:]))
    return parts


def protect_inline(segment: str) -> list[tuple[bool, str]]:
    pattern = re.compile(
        r"(`[^`\n]+`|\{#[^}]+\}|<[^>\n]+>|https?://[^\s)>\]]+|[A-Za-z0-9_./-]+/[A-Za-z0-9_./:?&=%-]+)"
    )
    out: list[tuple[bool, str]] = []
    last = 0
    for m in pattern.finditer(segment):
        if m.start() > last:
            out.append((False, segment[last : m.start()]))
        out.append((True, m.group(0)))
        last = m.end()
    if last < len(segment):
        out.append((False, segment[last:]))
    return out


MD_LINK = re.compile(r"(!?)\[([^\]]*)\]\(([^)]+)\)")


def translate_segment(segment: str, max_len: int = MYMEMORY_MAX) -> str:
    if not has_french_prose(segment):
        return segment
    if len(segment) <= max_len:
        return translate_with_retry(segment)

    if "\n" not in segment:
        return "".join(
            translate_with_retry(segment[i : i + max_len])
            for i in range(0, len(segment), max_len)
        )

    parts = re.split(r"(\n\n+)", segment)
    if len(parts) > 1:
        return "".join(
            translate_segment(p, max_len) if has_french_prose(p) else p for p in parts
        )

    buf = ""
    out: list[str] = []
    for piece in re.split(r"(\n)", segment):
        if len(buf) + len(piece) > max_len and buf.strip():
            out.append(translate_segment(buf, max_len))
            buf = ""
        buf += piece
    if buf:
        out.append(translate_segment(buf, max_len))
    return "".join(out)


def translate_prose(segment: str) -> str:
    result: list[str] = []
    pos = 0
    for m in MD_LINK.finditer(segment):
        if m.start() > pos:
            for prot, seg in protect_inline(segment[pos : m.start()]):
                result.append(seg if prot else translate_segment(seg))
        prefix, text, url = m.group(1), m.group(2), m.group(3)
        link_text = translate_segment(text) if has_french_prose(text) else text
        result.append(f"{prefix}[{link_text}]({url})")
        pos = m.end()
    if pos < len(segment):
        for prot, seg in protect_inline(segment[pos:]):
            result.append(seg if prot else translate_segment(seg))
    return "".join(result)


def translate_markdown(content: str) -> str:
    result: list[str] = []
    for fenced, chunk in split_fenced(content):
        if fenced:
            result.append(chunk)
            continue
        result.append(translate_prose(chunk))
    return "".join(result)


def heading_anchors(md: str) -> list[str | None]:
    anchors: list[str | None] = []
    for m in HEADING.finditer(md):
        anchors.append(m.group(4))
    return anchors


def apply_en_anchors(translated: str, en_anchors: list[str | None]) -> str:
    idx = 0

    def repl(m: re.Match[str]) -> str:
        nonlocal idx
        hashes, title, _old_anchor, old_id = m.group(1), m.group(2), m.group(3), m.group(4)
        anchor_id = en_anchors[idx] if idx < len(en_anchors) else old_id
        idx += 1
        title = title.strip()
        if anchor_id:
            return f"{hashes}{title} {{#{anchor_id}}}"
        return f"{hashes}{title}"

    return HEADING.sub(repl, translated)


def process(en_path: Path, docs_root: Path) -> int:
    rel = en_path.relative_to(docs_root / "en")
    fr_path = docs_root / rel
    if not fr_path.is_file():
        print(f"SKIP no FR: {rel}", flush=True)
        return -1

    en_text = en_path.read_text(encoding="utf-8")
    en_anchors = heading_anchors(en_text)
    fr_text = fr_path.read_text(encoding="utf-8")

    translated = translate_markdown(fr_text)
    translated = apply_en_anchors(translated, en_anchors)

    en_path.write_text(translated, encoding="utf-8")
    remaining = len(HAN.findall(translated))
    print(f"OK {rel} — han left: {remaining}", flush=True)
    return remaining


def main() -> None:
    docs_root = Path(__file__).resolve().parent.parent
    en_root = docs_root / "en"
    if len(sys.argv) > 1:
        targets: list[Path] = []
        for p in sys.argv[1:]:
            raw = Path(p)
            if raw.is_file():
                targets.append(raw.resolve())
            elif (en_root / raw).is_file():
                targets.append((en_root / raw).resolve())
            elif (docs_root / raw).is_file():
                targets.append((docs_root / raw).resolve())
    else:
        targets = sorted(en_root.rglob("*.md"))

    failed: list[str] = []
    for path in targets:
        path = path.resolve()
        if not path.is_file() or en_root not in path.parents:
            print(f"SKIP not under en/: {path}", flush=True)
            continue
        left = process(path, docs_root)
        if left > 0:
            failed.append(f"{path.name}: {left}")

    if failed:
        print("Remaining Han:", ", ".join(failed), flush=True)
        sys.exit(1)


if __name__ == "__main__":
    main()
