#!/usr/bin/env python3
"""Translate common Rôle : ... Permissions : ... lines in API docs (conservative)."""
from __future__ import annotations

import re
from pathlib import Path

# Prefix replacements inside Rôle lines (after i18n converted 用途→Rôle)
ROLE_STARTS = [
    ("Rôle : 创建空间", "Rôle : Créer un espace"),
    ("Rôle : 列出我可访问的空间", "Rôle : Lister les espaces accessibles"),
    ("Rôle : 列出所有空间", "Rôle : Lister tous les espaces"),
    ("Rôle : 搜索空间", "Rôle : Rechercher des espaces"),
    ("Rôle : 获取空间详情", "Rôle : Détail d’un espace"),
    ("Rôle : 更新空间", "Rôle : Mettre à jour l’espace"),
    ("Rôle : 删除空间", "Rôle : Supprimer l’espace"),
    ("Rôle : 创建组织", "Rôle : Créer une organisation"),
]

TABLE = [
    ("| 是（", "| oui ("),
    ("| 否（", "| non ("),
    ("| 是 |", "| oui |"),
    ("| 否 |", "| non |"),
    (" 是（", " oui ("),
    (" 否（", " non ("),
]


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "04-api"
    for p in sorted(root.glob("*.md")):
        t = p.read_text(encoding="utf-8")
        for a, b in ROLE_STARTS + TABLE:
            t = t.replace(a, b)
        p.write_text(t, encoding="utf-8")


if __name__ == "__main__":
    main()
