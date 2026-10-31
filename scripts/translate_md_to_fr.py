#!/usr/bin/env python3
"""Translate Chinese prose in markdown to French, preserving code fences and structure."""

from __future__ import annotations

import re
import sys
from pathlib import Path

# Minimal professional FR replacements for common doc patterns (fallback only).
# Primary translation is done inline in the replacement map per file section.

HAN = re.compile(r"[\u4e00-\u9fff]")


def split_fences(text: str) -> list[tuple[str, bool]]:
    """Return list of (segment, is_code) alternating."""
    parts: list[tuple[str, bool]] = []
    pos = 0
    for m in re.finditer(r"^```.*$", text, flags=re.MULTILINE):
        start = m.start()
        if start > pos:
            parts.append((text[pos:start], False))
        end = text.find("\n```", m.end())
        if end == -1:
            parts.append((text[start:], True))
            return parts
        end += len("\n```")
        parts.append((text[start:end], True))
        pos = end
    if pos < len(text):
        parts.append((text[pos:], False))
    return parts


def line_has_prose_han(line: str) -> bool:
    stripped = line.lstrip()
    if not HAN.search(line):
        return False
    if stripped.startswith("#"):
        # Heading: allow han only in {#anchor}
        body = re.sub(r"\s*\{#[^}]+\}\s*$", "", stripped)
        if body.startswith("#"):
            body = re.sub(r"^#+\s*", "", body)
            return bool(HAN.search(body))
        return bool(HAN.search(stripped))
    return True


def verify(path: Path) -> list[str]:
    bad: list[str] = []
    for i, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.lstrip().startswith("#"):
            continue
        if HAN.search(line):
            bad.append(f"{path}:{i}:{line[:120]}")
    return bad


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: translate_md_to_fr.py verify <file>...", file=sys.stderr)
        sys.exit(2)
    if sys.argv[1] == "verify":
        failed = False
        for p in sys.argv[2:]:
            issues = verify(Path(p))
            if issues:
                failed = True
                print(f"{p}: {len(issues)} prose lines with Han")
                for x in issues[:20]:
                    print(x)
                if len(issues) > 20:
                    print("...")
        sys.exit(1 if failed else 0)
    print("Only verify mode implemented", file=sys.stderr)
    sys.exit(2)


if __name__ == "__main__":
    main()
