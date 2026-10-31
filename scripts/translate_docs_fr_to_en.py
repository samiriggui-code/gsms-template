#!/usr/bin/env python3
"""Translate markdown FR→EN line-wise outside code fences."""
import re
import sys
import time
from pathlib import Path

from deep_translator import GoogleTranslator

CJK = re.compile(r"[\u4e00-\u9fff]")
FRENCH = re.compile(r"[àâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ]|(\b(le|la|les|des|une|dans|pour|avec|sont|est|par|sur|aux|du|de|et|ou|qui|que|ce|cette|ces|n'est|d'|l'|à|Une|Les|Des|Pour|Dans|Cette|Ces|Voir|Points|Mode|File|Usage)\b)")


def translate_file(src: Path, dst: Path, prefix: str = "") -> None:
    translator = GoogleTranslator(source="fr", target="en")
    lines = src.read_text(encoding="utf-8").splitlines()
    out: list[str] = []
    in_code = False
    for i, line in enumerate(lines):
        if line.strip().startswith("```"):
            in_code = not in_code
            out.append(line)
            continue
        if in_code:
            out.append(line)
            continue
        if CJK.search(line) and not FRENCH.search(line):
            # Chinese source in dst-only files: translate zh→en
            tr = GoogleTranslator(source="zh-CN", target="en")
            for attempt in range(3):
                try:
                    line = tr.translate(line)
                    break
                except Exception:
                    time.sleep(1)
        elif FRENCH.search(line) or (line.startswith("#") and "{" in line):
            if FRENCH.search(line):
                for attempt in range(3):
                    try:
                        line = translator.translate(line)
                        break
                    except Exception:
                        time.sleep(1)
        out.append(line)
        if (i + 1) % 50 == 0:
            print(f"  {src.name}: {i+1}/{len(lines)}", flush=True)
        time.sleep(0.05)
    text = prefix + "\n".join(out) + "\n"
    dst.write_text(text, encoding="utf-8")
    print(f"Wrote {dst}")


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    jobs = [
        (root / "website-docs/02-architecture/03-document-pipeline.md", root / "website-docs/en/02-architecture/03-document-pipeline.md", ""),
        (root / "website-docs/02-architecture/04-rag-pipeline.md", root / "website-docs/en/02-architecture/04-rag-pipeline.md", ""),
        (root / "website-docs/02-architecture/05-async-tasks.md", root / "website-docs/en/02-architecture/05-async-tasks.md", ""),
    ]
    if len(sys.argv) > 1:
        idx = int(sys.argv[1])
        jobs = [jobs[idx]]
    for src, dst, prefix in jobs:
        translate_file(src, dst, prefix)

    if len(sys.argv) == 1:
        en_cfg = root / "website-docs/en/01-getting-started/04-configuration.md"
        fr_cfg = root / "website-docs/01-getting-started/04-configuration.md"
        head = "\n".join(en_cfg.read_text(encoding="utf-8").splitlines()[:41]) + "\n"
        fr_tail = fr_cfg.read_text(encoding="utf-8").split("## `config/config.yaml` section par section", 1)[1]
        tmp = root / "website-docs/.tmp-config-tail.md"
        tmp.write_text("## `config/config.yaml` section by section" + fr_tail, encoding="utf-8")
        translate_file(tmp, en_cfg, prefix=head)
        tmp.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
