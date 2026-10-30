#!/usr/bin/env python3
"""Translate Chinese prose in markdown to French; preserve code, routes, anchors."""
from __future__ import annotations

import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator, MyMemoryTranslator

CJK = re.compile(r"[\u4e00-\u9fff]")
MAX_CHUNK = 4800
SLEEP_SEC = 12


def has_cjk(text: str) -> bool:
    return CJK.search(text) is not None


def make_translators():
    return [
        GoogleTranslator(source="zh-CN", target="fr"),
        MyMemoryTranslator(source="zh-CN", target="fr-FR"),
    ]


translators = make_translators()
t_idx = 0


def translate_text(text: str) -> str:
    global t_idx
    text = text.strip()
    if not text or not has_cjk(text):
        return text
    for attempt in range(8):
        tr = translators[t_idx % len(translators)]
        try:
            if len(text) <= MAX_CHUNK:
                return tr.translate(text)
            parts: list[str] = []
            buf = ""
            for para in text.split("\n\n"):
                candidate = (buf + "\n\n" + para) if buf else para
                if len(candidate) > MAX_CHUNK and buf:
                    parts.append(tr.translate(buf))
                    buf = para
                else:
                    buf = candidate
            if buf:
                parts.append(tr.translate(buf))
            return "\n\n".join(parts)
        except Exception as e:
            err = str(e).lower()
            if "many" in err or "429" in err or "limit" in err:
                t_idx += 1
                time.sleep(30 * (attempt + 1))
                continue
            if attempt == 7:
                print(f"  FAIL: {e!r} :: {text[:100]}", file=sys.stderr)
                return text
            time.sleep(5 * (attempt + 1))
    return text


def protect_blocks(content: str) -> tuple[str, list[str]]:
    store: list[str] = []

    def stash(match: re.Match[str]) -> str:
        store.append(match.group(0))
        return f"\x00PH{len(store) - 1}\x00"

    content = re.sub(r"```[\s\S]*?```", stash, content)
    content = re.sub(r"\{#[^}]+\}", stash, content)
    content = re.sub(r"`[^`\n]+`", stash, content)
    return content, store


def restore_blocks(content: str, store: list[str]) -> str:
    for i, block in enumerate(store):
        content = content.replace(f"\x00PH{i}\x00", block)
    return content


def translate_links(content: str) -> str:
    def repl(m: re.Match[str]) -> str:
        label, tail = m.group(1), m.group(2)
        if has_cjk(label):
            time.sleep(SLEEP_SEC)
            label = translate_text(label)
        return f"[{label}]{tail}"

    return re.sub(r"\[([^\]]+)\](\([^)]+\)|\[[^\]]+\])", repl, content)


def translate_markdown(content: str) -> str:
    protected, store = protect_blocks(content)
    protected = translate_links(protected)
    paragraphs = protected.split("\n\n")
    out: list[str] = []
    batch: list[str] = []
    batch_len = 0

    def flush_batch() -> None:
        nonlocal batch, batch_len
        if not batch:
            return
        block = "\n\n".join(batch)
        if has_cjk(block):
            time.sleep(SLEEP_SEC)
            block = translate_text(block)
        out.append(block)
        batch = []
        batch_len = 0

    for para in paragraphs:
        if not has_cjk(para):
            flush_batch()
            out.append(para)
            continue
        if batch_len + len(para) + 2 > MAX_CHUNK:
            flush_batch()
        batch.append(para)
        batch_len += len(para) + 2
    flush_batch()
    return restore_blocks("\n\n".join(out), store)


def process_file(path: Path) -> None:
    original = path.read_text(encoding="utf-8")
    translated = translate_markdown(original)
    path.write_text(translated, encoding="utf-8")
    print(path.name, file=sys.stderr)


def main() -> None:
    if len(sys.argv) > 1:
        files = [Path(p) for p in sys.argv[1:]]
    else:
        roots = [
            Path("/home/jarvis/Projects/gsms-template-1/website-docs/04-api"),
            Path("/home/jarvis/Projects/gsms-template-1/website-docs/05-clients"),
        ]
        files = []
        for root in roots:
            files.extend(sorted(root.glob("*.md")))
    for f in files:
        process_file(f)


if __name__ == "__main__":
    main()
