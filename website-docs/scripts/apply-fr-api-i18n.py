#!/usr/bin/env python3
"""Apply standard FR labels to API reference markdown (no external translation API)."""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def normalize_prefixes(text: str) -> str:
    text = text.replace("用途：", "Rôle : ").replace("权限：", "Permissions : ")
    text = text.replace("响应：", "Réponse : ")
    text = text.replace("| 字段 | 类型 | 必填 | 说明 |", "| Champ | Type | Obligatoire | Description |")
    text = text.replace("| 查询参数 | 类型 | 必填 | 说明 |", "| Paramètre | Type | Obligatoire | Description |")
    text = text.replace("| 路径参数 | 类型 | 必填 | 说明 |", "| Paramètre chemin | Type | Obligatoire | Description |")
    text = text.replace("| 请求体字段 | 类型 | 必填 | 说明 |", "| Champ corps | Type | Obligatoire | Description |")
    text = text.replace("| 路由 | 要求能力 |", "| Route | Capability |")
    text = text.replace("| 能力 | 说明 |", "| Capability | Description |")
    text = text.replace("| 配置项 | 说明 |", "| Champ | Description |")
    text = text.replace("| 层 | 文件 |", "| Couche | Fichier |")
    text = text.replace("| 层 | 路径 | 职责 |", "| Couche | Chemin | Rôle |")
    text = text.replace("| 维度 |", "| Dimension |")
    text = text.replace("## 实现参考", "## Référence d’implémentation")
    text = text.replace("| 否 |", "| non |").replace("| 是 |", "| oui |")
    return text


def process(path: Path) -> int:
    before = path.read_text(encoding="utf-8")
    after = normalize_prefixes(before)
    if after != before:
        path.write_text(after, encoding="utf-8")
    return len(re.findall(r"[\u4e00-\u9fff]", after))


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:]] if len(sys.argv) > 1 else sorted((ROOT / "04-api").glob("*.md"))
    for p in paths:
        n = process(p)
        print(f"{p.name}: {n} han chars remaining")


if __name__ == "__main__":
    main()
