#!/usr/bin/env python3
"""Translate remaining Han in 03-extension-points.md code-comment examples."""
from pathlib import Path

REPLACEMENTS = [
    ("# docreader/parser/registry.py（节选）", "# docreader/parser/registry.py (extrait)"),
    ('description="我的解析引擎"', 'description="Mon moteur d\'analyse"'),
    ("# 可选：依赖可用性探测", "# optionnel : sonde de disponibilité des dépendances"),
    ('unavailable_hint="缺依赖时给用户的提示"', 'unavailable_hint="Message si dépendance manquante"'),
    ("// 空 = legacy（向后兼容）", "// vide = legacy (rétrocompatibilité)"),
    ("// 以近似 token 数限制块大小，0 = 用 ChunkSize 字符数", "// limite de taille en tokens approx., 0 = ChunkSize en caractères"),
    ("// 多语言启发式提示，空 = 自动检测", "// indices multilingues ; vide = détection auto"),
    ("// 被 heading_splitter.go 的 init() 覆盖", "// remplacé par init() de heading_splitter.go"),
    ("// 被 heuristic_splitter.go 的 init() 覆盖", "// remplacé par init() de heuristic_splitter.go"),
    ("// 支持的检索类型（向量/关键词）", "// types de retrieval supportés (vecteur / mots-clés)"),
    ("// internal/container/container.go（节选）", "// internal/container/container.go (extrait)"),
    ("// internal/models/providers/definition.go（节选）", "// internal/models/providers/definition.go (extrait)"),
    ("// 存入 models.parameters.provider 的稳定标识", "// identifiant stable dans models.parameters.provider"),
    ('// 按语言的名称，如 "zh-CN"', '// libellés par locale, ex. "zh-CN"'),
    ("// 默认对话协议", "// protocole de chat par défaut"),
    ("// 未声明时默认 cohere-rerank", "// défaut cohere-rerank si absent"),
    ("// 未声明时默认 openai-embeddings", "// défaut openai-embeddings si absent"),
    ("// 未声明时默认 openai-transcriptions", "// défaut openai-transcriptions si absent"),
    ("// 旧行未填 provider 时按 URL 识别", "// lignes legacy sans provider : reconnaissance par URL"),
    ("// 编辑器动态渲染的额外字段", "// champs extra rendus dynamiquement dans l'éditeur"),
]

def main() -> None:
    path = Path(__file__).resolve().parents[1] / "06-development/03-extension-points.md"
    text = path.read_text(encoding="utf-8")
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    path.write_text(text, encoding="utf-8")
    print("Updated", path.name)


if __name__ == "__main__":
    main()
