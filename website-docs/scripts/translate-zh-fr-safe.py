#!/usr/bin/env python3
"""Translate Chinese markdown prose to French (MyMemory); preserve structure."""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

import translators as ts
HAN = re.compile(r"[\u4e00-\u9fff]")
PLACEHOLDER = "\uE000{}\uE001"

PROTECT_PATTERNS = [
    re.compile(r"```[\s\S]*?```"),
    re.compile(r"<Screenshot[\s\S]*?/>"),
    re.compile(r"`[^`\n]+`"),
    re.compile(r"\{#[^}]+\}"),
    re.compile(r"\(#[^)]+\)"),
]


def has_han(s: str) -> bool:
    return bool(HAN.search(s))


def protect(segment: str) -> tuple[str, list[str]]:
    stored: list[str] = []

    def repl(m: re.Match[str]) -> str:
        stored.append(m.group(0))
        return PLACEHOLDER.format(len(stored) - 1)

    out = segment
    for pat in PROTECT_PATTERNS:
        out = pat.sub(repl, out)
    return out, stored


def restore(text: str, stored: list[str]) -> str:
    for i, val in enumerate(stored):
        text = text.replace(PLACEHOLDER.format(i), val)
    return text


def translate_text(text: str, retries: int = 8) -> str:
    if not has_han(text):
        return text
    delay = 2.0
    for attempt in range(retries):
        try:
            out = ts.translate_text(
                text, translator="bing", from_language="zh", to_language="fr"
            )
            time.sleep(0.5)
            return out
        except Exception as e:
            msg = str(e).lower()
            if attempt + 1 < retries:
                time.sleep(delay)
                delay = min(delay * 1.5, 30)
                continue
            raise RuntimeError(f"translate failed: {e}") from e
    return text


MAX = 450


def translate_segment(segment: str) -> str:
    if not has_han(segment):
        return segment
    protected, stored = protect(segment)
    if not has_han(protected):
        return restore(protected, stored)

    if len(protected) <= MAX:
        translated = translate_text(protected)
        return restore(translated, stored)

    parts = re.split(r"(\n\n+)", protected)
    if len(parts) > 1:
        return restore(
            "".join(
                translate_segment(p) if has_han(p) else p for p in parts
            ),
            stored,
        )

    out: list[str] = []
    buf = ""
    for piece in re.split(r"(\n)", protected):
        if len(buf) + len(piece) > MAX and buf.strip():
            out.append(translate_text(buf))
            buf = ""
        buf += piece
    if buf:
        out.append(translate_text(buf) if has_han(buf) else buf)
    return restore("".join(out), stored)


def translate_markdown(content: str) -> str:
    return translate_segment(content)


def han_outside_anchors(content: str) -> int:
    scrub = re.sub(r"\{#[^}]+\}", "", content)
    scrub = re.sub(r"```[\s\S]*?```", "", scrub)
    scrub = re.sub(r"`[^`\n]+`", "", scrub)
    scrub = re.sub(r"\(#[^)]+\)", "", scrub)
    return len(HAN.findall(scrub))


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:]]
    for path in paths:
        print(f"Translating {path} ...", flush=True)
        original = path.read_text(encoding="utf-8")
        # French H1 overrides
        h1 = {
            "06-models.md": "# Gestion des modèles\n",
            "07-agent.md": "# Moteur Agent\n",
            "08-mcp.md": "# Intégration MCP (Model Context Protocol)\n",
        }.get(path.name)
        translated = translate_markdown(original)
        if h1 and translated.startswith("# "):
            translated = h1 + translated.split("\n", 1)[1]
        path.write_text(translated, encoding="utf-8")
        remaining = han_outside_anchors(translated)
        print(f"  wrote {path.name}, han outside anchors: {remaining}", flush=True)
        if remaining:
            sys.exit(1)


if __name__ == "__main__":
    main()
