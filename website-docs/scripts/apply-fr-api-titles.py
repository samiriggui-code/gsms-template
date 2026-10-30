#!/usr/bin/env python3
"""Translate API doc H1 and shared intro patterns."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "04-api"

TITLES = {
    "02-api-org.md": (
        "# Référence API : organisations et partage",
        "Gestion des membres d’organisation et du partage de bases de connaissances et d’agents. Une organisation regroupe des espaces de travail.",
        "Une organisation (Organization) a des espaces (tenant) comme membres. Clé API sur les routes org : `manage_spaces` ou full-access ; les deux endpoints en lecture seule « listes de KB partagées » acceptent aussi `retrieve` ; gestion des partages KB/Agent réservée aux clés full-access.",
    ),
    "02-api-agent-mcp.md": ("# Référence API : Agent, MCP et skills", None, None),
    "02-api-channels.md": ("# Référence API : IM, embed et fichiers", None, None),
    "02-api-chat.md": ("# Référence API : sessions, messages et chat", None, None),
    "02-api-faq-wiki.md": ("# Référence API : FAQ et Wiki", None, None),
    "02-api-knowledge.md": ("# Référence API : bases de connaissances et connaissances", None, None),
    "02-api-model-system.md": ("# Référence API : modèles et initialisation", None, None),
    "02-api-sandbox-skills.md": ("# Référence API : sandbox, skills et variables personnelles", None, None),
}

ROLE_COMMON = [
    ("Rôle : 创建", "Rôle : Créer"),
    ("Rôle : 列出", "Rôle : Lister"),
    ("Rôle : 删除", "Rôle : Supprimer"),
    ("Rôle : 获取", "Rôle : Obtenir"),
    ("Rôle : 读取", "Rôle : Lire"),
    ("Rôle : 搜索", "Rôle : Rechercher"),
    ("Rôle : 触发", "Rôle : Déclencher"),
    ("Rôle : 校验", "Rôle : Valider"),
    ("Rôle : 设置", "Rôle : Définir"),
    ("Rôle : 测试", "Rôle : Tester"),
    ("Rôle : 预览", "Rôle : Prévisualiser"),
    ("Rôle : 加入", "Rôle : Rejoindre"),
    ("Rôle : 离开", "Rôle : Quitter"),
    ("Rôle : 邀请", "Rôle : Inviter"),
    ("Rôle : 撤销", "Rôle : Révoquer"),
    ("Rôle : 更新", "Rôle : Mettre à jour"),
    ("组织Nom", "Nom de l’organisation"),
    ("路径Paramètres", "Paramètre chemin"),
    ("查询Paramètres", "Paramètre de requête"),
    ("请求Paramètres", "Paramètre de requête"),
    ("| 是 |", "| oui |"),
    ("| 否 |", "| non |"),
    ("是（", "oui ("),
    ("否（", "non ("),
    ("Permissions : Admin+。", "Permissions : Admin+."),
    ("Permissions : Viewer+。", "Permissions : Viewer+."),
    ("Handler:", "Handler :"),
    ("## 组织管理", "## Gestion des organisations"),
]


def main() -> None:
    for name, triple in TITLES.items():
        p = ROOT / name
        if not p.exists():
            continue
        text = p.read_text(encoding="utf-8")
        h1, p1, p2 = triple
        if text.startswith("# API"):
            lines = text.splitlines()
            lines[0] = h1
            if p1 and len(lines) > 1:
                lines[1] = ""
                lines[2] = p1
                if p2:
                    if len(lines) > 3:
                        lines[3] = p2
                    else:
                        lines.append(p2)
            text = "\n".join(lines)
        for a, b in ROLE_COMMON:
            text = text.replace(a, b)
        p.write_text(text, encoding="utf-8")
        n = len(re.findall(r"[\u4e00-\u9fff]", text))
        print(f"{name}: {n} han")


if __name__ == "__main__":
    main()
