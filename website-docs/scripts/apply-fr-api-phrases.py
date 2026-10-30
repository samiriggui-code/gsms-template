#!/usr/bin/env python3
"""Second-pass FR phrase replacements for API markdown."""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Longest-first when applying
PHRASES: list[tuple[str, str]] = [
    ("# API 参考：基础设施与数据源", "# Référence API : infrastructure et sources de données"),
    ("注册和管理向量存储、文件存储、网络搜索服务及数据源，提供连接测试与同步操作。",
     "Enregistrement et gestion des magasins vectoriels, backends de stockage, services de recherche Web et connecteurs de sources ; tests de connexion et synchronisation."),
    ("统一约定：读 Viewer+，写/连接测试 Admin+（凭证探测外部系统）。API key capability：向量库 `manage_vector_stores`、存储后端 `manage_storage_backends`、Web 搜索 `manage_web_search`、数据源 `manage_datasources`（均可 full-access）。",
     "Convention : lecture Viewer+, écriture / tests de connexion Admin+ (les tests interrogent les systèmes externes). Capabilities clé API : magasins vectoriels `manage_vector_stores`, backends `manage_storage_backends`, recherche Web `manage_web_search`, sources `manage_datasources` (full-access possible)."),
    ("## 向量存储（/api/v1/vector-stores）", "## Magasins vectoriels (`/api/v1/vector-stores`)"),
    ("## 存储后端（/api/v1/storage-backends）", "## Backends de stockage (`/api/v1/storage-backends`)"),
    ("## Web 搜索（/api/v1/web-search 与 /api/v1/web-search-providers）",
     "## Recherche Web (`/api/v1/web-search` et `/api/v1/web-search-providers`)"),
    ("## 数据源（/api/v1/datasource）", "## Sources de données (`/api/v1/datasource`)"),
    ("请求体（Create/Update/TestRaw 共用 `storageBackendRequest`）：",
     "Corps de requête (Create/Update/TestRaw partagent `storageBackendRequest`) :"),
    ("当前注册 14 个搜索提供商，包括 Metaso、Exa、Bocha、Brave、Serply。各自的 api_key 与 extra_config 参数见[联网搜索](../03-features/11-web-search.md)。",
     "Quatorze fournisseurs de recherche sont enregistrés (Metaso, Exa, Bocha, Brave, Serply, etc.). Clés API et `extra_config` : voir [Recherche Web](../03-features/11-web-search.md)."),
    ("外部内容连接器（Feishu/Notion/语雀等），同步任务会写入 KB。Handler: `internal/handler/datasource.go`。本组多数响应为原始对象/数组（无 `success` 包装）。",
     "Connecteurs de contenu externe (Feishu, Notion, Yuque, etc.) ; la synchronisation écrit dans la base de connaissances. Handler : `internal/handler/datasource.go`. La plupart des réponses sont des objets/tableaux bruts (sans enveloppe `success`)."),
    ("当前已注册类型为 feishu、lark、feishu_drive、lark_drive、notion、confluence、yuque、dingtalk、ima、rss、gitlab。各连接器的 credentials、资源选择与同步限制见[数据源导入](../03-features/10-datasource.md)。sync_deletions 开启后会真实删除该数据源归属下的已删除知识；source_created_at/source_updated_at 保存在知识 metadata 中。",
     "Types enregistrés : feishu, lark, feishu_drive, lark_drive, notion, confluence, yuque, dingtalk, ima, rss, gitlab. Credentials, sélection de ressources et limites : voir [Import de sources](../03-features/10-datasource.md). Avec `sync_deletions`, les connaissances supprimées côté source sont réellement effacées ; `source_created_at` / `source_updated_at` sont stockés dans les métadonnées."),
    ("路由注册：", "Enregistrement des routes :"),
    ("可用引擎类型与配置 schema", "Types de moteur disponibles et schéma de configuration"),
    ("用原始配置测试连接（不落库）", "Tester la connexion avec une config brute (sans persistance)"),
    ("创建向量库配置", "Créer une configuration de magasin vectoriel"),
    ("向量库列表（环境变量注入的 `__env_*` store 在前）", "Lister les magasins (`__env_*` injectés par variables d’environnement en tête)"),
    ("向量库详情（支持 `__env_*` ID）", "Détail d’un magasin (ID `__env_*` accepté)"),
    ("更新（仅重命名；env store 不可改）", "Mettre à jour (renommage seul ; magasins env non modifiables)"),
    ("删除（env store 不可删）", "Supprimer (magasins env non supprimables)"),
    ("测试已保存/env 向量库", "Tester un magasin enregistré ou env"),
    ("原始配置连接测试", "Test de connexion avec config brute"),
    ("创建存储后端", "Créer un backend de stockage"),
    ("列表（含 `default_storage_backend_id`）", "Lister (inclut `default_storage_backend_id`)"),
    ("详情（凭证掩码）", "Détail (credentials masqués)"),
    ("更新", "Mettre à jour"),
    ("删除", "Supprimer"),
    ("测试已保存后端", "Tester un backend enregistré"),
    ("设为默认后端", "Définir comme backend par défaut"),
    ("内置搜索提供方目录（只读）", "Catalogue des fournisseurs intégrés (lecture seule)"),
    ("提供方类型与参数 schema", "Types de fournisseur et schéma des paramètres"),
    ("原始凭证测试（不落库）", "Tester des credentials bruts (sans persistance)"),
    ("创建提供方配置", "Créer une configuration de fournisseur"),
    ("提供方列表", "Lister les fournisseurs"),
    ("详情", "Détail"),
    ("设置 API key", "Définir la clé API"),
    ("删除凭证字段", "Supprimer un champ de credentials"),
    ("测试已保存提供方", "Tester un fournisseur enregistré"),
    ("可用连接器目录", "Catalogue des connecteurs disponibles"),
    ("校验原始凭证（“测试连接”按钮，不落库）", "Valider des credentials bruts (bouton « Tester la connexion », sans persistance)"),
    ("创建数据源", "Créer une source de données"),
    ("数据源列表", "Lister les sources de données"),
    ("校验已保存数据源连接", "Valider la connexion d’une source enregistrée"),
    ("浏览外部资源树（懒加载）", "Parcourir l’arborescence de ressources externes (lazy load)"),
    ("解析资源祖先链（选择器展开）", "Résoudre la chaîne d’ancêtres (dépliage du sélecteur)"),
    ("手动触发同步", "Déclencher une synchronisation manuelle"),
    ("暂停 / 恢复定时同步", "Suspendre / reprendre la synchronisation planifiée"),
    ("同步日志列表", "Lister les journaux de synchronisation"),
    ("单条同步日志", "Détail d’un journal de synchronisation"),
    ("整体替换凭证", "Remplacer entièrement les credentials"),
    ("清空凭证", "Effacer les credentials"),
    ("字段：`name`（必填）、`engine_type`（必填）、`connection_config`（必填）、`index_config`（可选）。",
     "Champs : `name` (obligatoire), `engine_type` (obligatoire), `connection_config` (obligatoire), `index_config` (optionnel)."),
    ("请求体：`{\"name\":\"...\"}`（`binding:\"required\"}`）。", "Corps : `{\"name\":\"...\"}` (`binding:\"required\"`)."),
    ("请求体：`provider`（`binding:\"required\"}`）、`parameters`（可选）。",
     "Corps : `provider` (`binding:\"required\"`), `parameters` (optionnel)."),
    ("更新（空字段保留原值；APIKey 保留）。Permissions : Admin+。请求体：`name/description/parameters/is_default`（均可选）。",
     "Mettre à jour (champs vides conservés ; clé API préservée). Permissions : Admin+. Corps : `name` / `description` / `parameters` / `is_default` (tous optionnels)."),
    ("Permissions : Viewer+，仅 JWT（未声明 API key 策略）。", "Permissions : Viewer+, JWT uniquement (pas de politique clé API déclarée)."),
    ("| 引擎类型 |", "| Type de moteur |"),
    ("| 连接配置 |", "| Config connexion |"),
    ("| 名称 |", "| Nom |"),
    ("| 描述 |", "| Description |"),
    ("| 提供方 |", "| Fournisseur |"),
    ("| 参数 |", "| Paramètres |"),
    ("| 连接器类型 |", "| Type de connecteur |"),
    ("| 凭证 |", "| Credentials |"),
    ("引擎类型", "Type de moteur"),
    ("连接配置", "Configuration de connexion"),
    ("提供方", "Fournisseur"),
    ("参数", "Paramètres"),
    ("连接器类型", "Type de connecteur"),
    ("凭证", "Credentials"),
    ("类型（bing/tavily/google…）", "Type (bing/tavily/google…)"),
    ("默认提供方", "Fournisseur par défaut"),
    ("提供方配置，字段见[存储后端](../03-features/19-storage-backends.md#连接参数)（响应中凭证掩码）",
     "Config du fournisseur ; champs : voir [Backends de stockage](../03-features/19-storage-backends.md#连接参数) (credentials masqués en réponse)"),
    ("目标 KB（须归属本空间）", "Base cible (doit appartenir à l’espace)"),
    ("cron 表达式", "Expression cron"),
    ("本数据源同步日志保留天数，默认 30；非正值按 30 天处理",
     "Rétention des journaux de sync pour cette source (défaut 30 jours ; valeur ≤ 0 → 30)"),
    ("查询参数：`kb_id`（必填）。", "Paramètre : `kb_id` (obligatoire)."),
    ("查询参数：`limit`（默认 10，上限 100）、`offset`（默认 0）。",
     "Paramètres : `limit` (défaut 10, max 100), `offset` (défaut 0)."),
    ("查询参数：`parent_id`（可选，空=顶层）。", "Paramètre : `parent_id` (optionnel, vide = racine)."),
    ("`field` 仅 `api_key`", "`field` = `api_key` uniquement"),
    ("`field` 必须为 `credentials`", "`field` doit être `credentials`"),
    ("（`binding:\"required\"}`）", "(`binding:\"required\"`)"),
    ("是（`binding:\"required\"`）", "oui (`binding:\"required\"`)"),
    ("[类型定义]", "[définitions de types]"),
]

PHRASES.sort(key=lambda x: -len(x[0]))


def process(text: str) -> str:
    for zh, fr in PHRASES:
        text = text.replace(zh, fr)
    # leftover role fragments
    text = re.sub(r"Rôle : 更新\b", "Rôle : Mettre à jour", text)
    text = re.sub(r"Rôle : 删除\b", "Rôle : Supprimer", text)
    text = re.sub(r"Rôle : 详情\b", "Rôle : Détail", text)
    return text


def main() -> None:
    paths = [Path(p) for p in sys.argv[1:]] if len(sys.argv) > 1 else []
    for p in paths:
        t = p.read_text(encoding="utf-8")
        p.write_text(process(t), encoding="utf-8")
        n = len(re.findall(r"[\u4e00-\u9fff]", p.read_text(encoding="utf-8")))
        print(f"{p.name}: {n} han remaining")


if __name__ == "__main__":
    main()
