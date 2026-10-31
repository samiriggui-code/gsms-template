#!/usr/bin/env python3
"""Translate Chinese prose in markdown to French (local Argos zh→en→fr); preserve code, anchors."""
from __future__ import annotations

import re
import sys
from pathlib import Path

import argostranslate.translate

HAN = re.compile(r"[\u4e00-\u9fff]")


def has_han(s: str) -> bool:
    return bool(HAN.search(s))


def argos_fr(text: str) -> str:
    if not has_han(text):
        return text
    en = argostranslate.translate.translate(text, "zh", "en")
    return argostranslate.translate.translate(en, "en", "fr")


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


CHUNK = 2800


def translate_segment(segment: str) -> str:
    if not has_han(segment):
        return segment
    if len(segment) <= CHUNK:
        return argos_fr(segment)
    parts = re.split(r"(\n\n+)", segment)
    if len(parts) > 1:
        return "".join(translate_segment(p) if has_han(p) else p for p in parts)
    out: list[str] = []
    buf = ""
    for piece in re.split(r"(\n)", segment):
        if len(buf) + len(piece) > CHUNK and buf.strip():
            out.append(translate_segment(buf))
            buf = ""
        buf += piece
    if buf:
        out.append(translate_segment(buf))
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
