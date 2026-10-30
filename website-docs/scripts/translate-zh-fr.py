#!/usr/bin/env python3
"""Translate Chinese prose in markdown to French; preserve code, anchors, mermaid."""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

from deep_translator import MyMemoryTranslator

translator = MyMemoryTranslator(source="zh-CN", target="fr-FR")
HAN = re.compile(r"[\u4e00-\u9fff]")


def has_han(s: str) -> bool:
    return bool(HAN.search(s))


def translate_with_retry(text: str, retries: int = 8) -> str:
    if not has_han(text):
        return text
    delay = 0.35
    for attempt in range(retries):
        try:
            out = translator.translate(text)
            time.sleep(0.22)
            return out
        except Exception as e:
            msg = str(e).lower()
            if "too many requests" in msg or "429" in msg:
                time.sleep(delay)
                delay = min(delay * 1.8, 30)
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
    pattern = re.compile(r"(`[^`\n]+`|\{#[^}]+\})")
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


MYMEMORY_MAX = 480


def translate_segment(segment: str, max_len: int = MYMEMORY_MAX) -> str:
    if not has_han(segment):
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
            translate_segment(p, max_len) if has_han(p) else p for p in parts
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


def translate_markdown(content: str) -> str:
    result: list[str] = []
    for fenced, chunk in split_fenced(content):
        if fenced:
            result.append(chunk)
            continue
        for prot, seg in protect_inline(chunk):
            result.append(seg if prot else translate_segment(seg))
    return "".join(result)


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:]]
    for path in paths:
        print(f"Translating {path} ...", flush=True)
        original = path.read_text(encoding="utf-8")
        translated = translate_markdown(original)
        path.write_text(translated, encoding="utf-8")
        remaining = len(HAN.findall(translated))
        print(f"  wrote {path.name}, han chars left: {remaining}", flush=True)
        if remaining:
            sys.exit(1)


if __name__ == "__main__":
    main()
