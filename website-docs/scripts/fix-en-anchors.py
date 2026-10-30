#!/usr/bin/env python3
"""Repair explicit {#...} heading IDs under en/ (and optional paths).

Fixes VitePress fatal « User defined id attribute … is not unique », mainly from
fix-fr-anchors having collapsed Chinese-only titles to {#section}.

- Assigns unique ASCII slugs per heading (from title; hash suffix if CJK-only).
- Rewrites internal [label](#anchor) links; {#section} targets match via link label text.
"""
from __future__ import annotations

import argparse
import hashlib
import re
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

HAN = re.compile(r"[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]")
HEADING_LINE = re.compile(
    r"^(?P<hashes>#{1,6})\s+(?P<title>.+?)(?:\s+\{#(?P<anchor>[^}]+)\})?\s*$"
)
HEADING_ANCHOR = re.compile(
    r"^(?P<hashes>#{1,6})\s+(?P<title>.+?)\s+\{#(?P<anchor>[^}]+)\}\s*$"
)
INLINE_LINK = re.compile(r"\[(?P<text>(?:[^\[\]\\]|\\.)+)\]\(#(?P<anchor>[^)]+)\)")


def slugify(title: str) -> str:
    t = title.strip()
    t = HAN.sub("", t)
    t = t.replace("'", "'").replace("«", "").replace("»", "")
    t = unicodedata.normalize("NFKD", t)
    t = t.encode("ascii", "ignore").decode("ascii")
    t = t.lower()
    t = re.sub(r"[^a-z0-9]+", "-", t)
    t = re.sub(r"-+", "-", t).strip("-")
    if t:
        return t
    h = hashlib.sha1(title.encode("utf-8")).hexdigest()[:10]
    return f"heading-{h}"


def clean_title(title: str) -> str:
    t = title.strip()
    t = re.sub(r"`([^`]+)`", r"\1", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"\1", t)
    t = re.sub(r"\*([^*]+)\*", r"\1", t)
    t = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", t)
    return t.strip()


@dataclass
class HeadingRow:
    title: str
    old_anchor: str
    new_slug: str


def next_unique_slug(base: str, used: set[str]) -> str:
    slug = base
    n = 2
    while slug in used:
        slug = f"{base}-{n}"
        n += 1
    used.add(slug)
    return slug


def plan_explicit_slugs(
    parsed: list[tuple[int, str, str | None]],
) -> list[tuple[int, str, str, str]]:
    """Return (line_no, title, old_anchor, new_slug) for headings with explicit {#id}."""
    used: set[str] = set()
    explicit_counts = Counter(a for _, _, a in parsed if a is not None)

    for _, title, anchor in parsed:
        if anchor is not None:
            continue
        base = slugify(clean_title(title))
        next_unique_slug(base, used)

    out: list[tuple[int, str, str, str]] = []
    for line_no, title, anchor in parsed:
        if anchor is None:
            continue
        base = slugify(clean_title(title))
        must_change = (
            anchor == "section"
            or HAN.search(anchor)
            or explicit_counts[anchor] > 1
            or anchor in used
        )
        if must_change:
            new_slug = next_unique_slug(base, used)
        else:
            new_slug = anchor
            used.add(anchor)
        out.append((line_no, title, anchor, new_slug))
    return out


def resolve_link_target(link_text: str, headings: list[HeadingRow]) -> str | None:
    text = link_text.strip()
    if not text:
        return None
    exact = [h for h in headings if clean_title(h.title) == text]
    if len(exact) == 1:
        return exact[0].new_slug
    contains = [h for h in headings if text in clean_title(h.title)]
    if len(contains) == 1:
        return contains[0].new_slug
    rev = [h for h in headings if clean_title(h.title) in text]
    if len(rev) == 1:
        return rev[0].new_slug
    return None


def process_file(path: Path, dry_run: bool) -> tuple[int, int]:
    original = path.read_text(encoding="utf-8")
    lines = original.splitlines()
    parsed: list[tuple[int, str, str | None]] = []
    for i, line in enumerate(lines):
        m = HEADING_LINE.match(line)
        if m:
            parsed.append((i, m.group("title"), m.group("anchor")))

    explicit_plan = plan_explicit_slugs(parsed)
    if not explicit_plan:
        return 0, 0

    headings: list[HeadingRow] = [
        HeadingRow(title=title, old_anchor=old, new_slug=new)
        for _, title, old, new in explicit_plan
    ]

    remapped_anchors: set[str] = set()
    heading_changes = 0
    for h in headings:
        if h.old_anchor != h.new_slug:
            remapped_anchors.add(h.old_anchor)
            heading_changes += 1

    if not heading_changes:
        return 0, 0

    new_lines = list(lines)
    for line_no, title, old_anchor, new_slug in explicit_plan:
        if old_anchor == new_slug:
            continue
        line = new_lines[line_no]
        new_lines[line_no] = HEADING_ANCHOR.sub(
            lambda m, ns=new_slug: f"{m.group('hashes')} {m.group('title')} {{#{ns}}}",
            line,
            count=1,
        )

    link_changes = 0

    def sub_link(m: re.Match[str]) -> str:
        nonlocal link_changes
        text = m.group("text")
        anchor = m.group("anchor")
        if anchor not in remapped_anchors and anchor != "section":
            return m.group(0)
        target = resolve_link_target(text, headings)
        if target is None:
            if anchor in remapped_anchors:
                for h in headings:
                    if h.old_anchor == anchor and h.new_slug != anchor:
                        target = h.new_slug
                        break
        if target is None or target == anchor:
            return m.group(0)
        link_changes += 1
        return f"[{text}](#{target})"

    new_body = "\n".join(INLINE_LINK.sub(sub_link, line) for line in new_lines)
    new_text = new_body + ("\n" if original.endswith("\n") else "")
    if new_text != original:
        if not dry_run:
            path.write_text(new_text, encoding="utf-8")
        return heading_changes, link_changes
    return 0, 0


def validate_file(path: Path) -> list[str]:
    errors: list[str] = []
    parsed: list[tuple[str, str | None]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = HEADING_LINE.match(line)
        if m:
            parsed.append((m.group("title"), m.group("anchor")))

    used: set[str] = set()
    explicit_counts: Counter[str] = Counter()
    for title, anchor in parsed:
        if anchor is None:
            next_unique_slug(slugify(clean_title(title)), used)
            continue
        explicit_counts[anchor] += 1
        if anchor in used:
            errors.append(f"explicit id #{anchor!r} collides with another heading slug")
        used.add(anchor)

    for a, c in explicit_counts.items():
        if c > 1:
            errors.append(f"duplicate explicit id #{a!r}")
    return errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("paths", nargs="*", help="Markdown files or dirs (default: en/)")
    parser.add_argument("--dry-run", action="store_true", help="Report only, do not write")
    parser.add_argument("--check", action="store_true", help="Validate uniqueness only")
    args = parser.parse_args()

    root = Path(__file__).resolve().parents[1]
    files: list[Path] = []
    if args.paths:
        for p in args.paths:
            path = Path(p)
            if not path.is_absolute():
                path = root / path
            if path.is_dir():
                files.extend(sorted(path.rglob("*.md")))
            elif path.is_file():
                files.append(path)
    else:
        files = sorted((root / "en").rglob("*.md"))

    if args.check:
        bad = 0
        for f in files:
            errs = validate_file(f)
            if errs:
                bad += 1
                rel = f.relative_to(root)
                for e in errs:
                    print(f"{rel}: {e}")
        if bad:
            sys.exit(1)
        print(f"OK — {len(files)} files, no duplicate explicit heading ids.")
        return

    total_h = total_l = 0
    for f in files:
        h, l = process_file(f, dry_run=args.dry_run)
        if h or l:
            rel = f.relative_to(root)
            print(f"{rel}: {h} headings, {l} links")
            total_h += h
            total_l += l

    mode = " (dry-run)" if args.dry_run else ""
    print(f"Done{mode}. {total_h} heading ids, {total_l} links updated in {len(files)} files.")

    if not args.dry_run:
        bad = []
        for f in files:
            bad.extend((f, e) for e in validate_file(f))
        if bad:
            print("Validation failed after write:", file=sys.stderr)
            for f, e in bad[:20]:
                print(f"  {f.relative_to(root)}: {e}", file=sys.stderr)
            sys.exit(1)


if __name__ == "__main__":
    main()
