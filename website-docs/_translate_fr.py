#!/usr/bin/env python3
"""Offline markdown translation to French (Argos: zh->en->fr, en->fr)."""
import re
import sys
from pathlib import Path

import argostranslate.translate

CJK = re.compile(r"[\u4e00-\u9fff\u3000-\u303f\uff00-\uffef]")
CACHE: dict[tuple[str, str, str], str] = {}


def tr(text: str, src: str, tgt: str) -> str:
    key = (src, tgt, text)
    if key in CACHE:
        return CACHE[key]
    out = argostranslate.translate.translate(text, src, tgt)
    CACHE[key] = out
    return out


def to_fr(text: str) -> str:
    s = text.strip()
    if not s:
        return text
    if CJK.search(s):
        mid = tr(s, "zh", "en")
        return tr(mid, "en", "fr")
    if re.search(r"[a-zA-Z]{3,}", s):
        return tr(s, "en", "fr")
    return text


def translate_inline(body: str) -> str:
    parts = re.split(r"(`[^`]+`|\[[^\]]+\]\([^)]+\)|<[^>]+>)", body)
    out = []
    for p in parts:
        if not p or p.startswith("`") or p.startswith("[") or p.startswith("<"):
            out.append(p)
        elif CJK.search(p) or (re.search(r"[a-zA-Z]{4,}", p) and "http" not in p and not re.match(r"^[/a-z0-9_.-]+$", p.strip())):
            out.append(to_fr(p))
        else:
            out.append(p)
    return "".join(out)


def translate_file(path: Path) -> None:
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    out: list[str] = []
    in_code = False
    for line in lines:
        if line.strip().startswith("```"):
            in_code = not in_code
            out.append(line)
            continue
        if in_code:
            out.append(line)
            continue
        if line.strip().startswith("|") and re.match(r"^\|\s*[-:| ]+\|\s*$", line.strip()):
            out.append(line)
            continue
        m = re.match(r"^(\s*)(.*?)(\s*)$", line.rstrip("\n"))
        if not m:
            out.append(line)
            continue
        lead, body, trail = m.group(1), m.group(2), m.group(3)
        if not body.strip():
            out.append(line)
            continue
        if body.strip().startswith("<Screenshot") or body.strip().startswith("<video"):
            # translate caption/hint attributes only
            def repl_attr(mo: re.Match) -> str:
                val = mo.group(2)
                if CJK.search(val) or (len(val) > 20 and re.search(r"[a-zA-Z]", val)):
                    return f'{mo.group(1)}="{to_fr(val)}"'
                return mo.group(0)

            body = re.sub(r'(caption|hint)=("([^"]*)")', repl_attr, body)
            out.append(lead + body + trail + ("\n" if line.endswith("\n") else ""))
            continue
        if CJK.search(body) or (
            re.search(r"[a-zA-Z]{4,}", body)
            and not body.strip().startswith("http")
            and not re.match(r"^[#|`/]", body.strip())
            and "github.com" not in body
            and "module " not in body
        ):
            body = translate_inline(body)
        out.append(lead + body + trail + ("\n" if line.endswith("\n") else ""))
    path.write_text("".join(out), encoding="utf-8")
    print(f"OK {path}", flush=True)


def main() -> None:
    for p in sys.argv[1:]:
        translate_file(Path(p))


if __name__ == "__main__":
    main()
