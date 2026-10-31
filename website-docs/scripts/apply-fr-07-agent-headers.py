#!/usr/bin/env python3
"""Translate section headers in 07-agent.md (keep {#zh} anchors)."""
from __future__ import annotations

from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "03-features" / "07-agent.md"

HEADERS = [
    ("### 总览与架构", "### Vue d’ensemble et architecture"),
    ("#### 核心组件", "#### Composants principaux"),
    ("| 组件 | 源码位置 | 职责 |", "| Composant | Emplacement | Rôle |"),
    ("#### 组件关系图", "#### Diagramme des composants"),
    ("#### System Prompt 的构建", "#### Construction du prompt système"),
    ("### ReAct 循环逐阶段详解", "### Boucle ReAct, étape par étape"),
    ("#### 入口：Execute", "#### Entrée : Execute"),
    ("#### 主循环：executeLoop 与 runReActIteration", "#### Boucle principale : executeLoop et runReActIteration"),
    ("#### 终止条件汇总与最大迭代", "#### Conditions d’arrêt et itérations max"),
    ("#### ReAct 循环流程图", "#### Schéma de la boucle ReAct"),
    ("### 内置工具全解", "### Outils intégrés"),
    ("#### 工具总表", "#### Table des outils"),
    ("| 工具名 | 关键参数 | 行为 / 返回 |", "| Outil | Paramètres clés | Comportement / retour |"),
    ("#### 工具注册表（ToolRegistry）", "#### Registre d’outils (ToolRegistry)"),
    ("#### 能力（capabilities）机制与按配置启停", "#### Capabilities et activation selon la config"),
    ("### 记忆与上下文压缩", "### Mémoire et compression du contexte"),
    ("#### Token 预算与估算器", "#### Budget de tokens et estimateur"),
    ("#### 上下文压缩与溢出恢复", "#### Compression du contexte et dépassement"),
    ("#### 会话历史（agent_history）", "#### Historique de session (agent_history)"),
    ("### 技能（Skills）系统", "### Système de skills"),
    ("#### 渐进加载和作用域", "#### Chargement progressif et périmètre"),
    ("#### 会话环境与文件", "#### Environnement de session et fichiers"),
    ("| 路径 | 用途 |", "| Chemin | Usage |"),
    ("#### 文件工具契约", "#### Contrat des outils fichiers"),
    ("#### 执行流程", "#### Flux d’exécution"),
    ("### 工具审批机制（Human-in-the-Loop）", "### Approbation des outils (Human-in-the-Loop)"),
    ("### Agent 模式与普通 RAG 问答模式", "### Mode Agent vs RAG classique"),
    ("#### 两条问答路径", "#### Deux chemins de Q&R"),
    ("#### 模式决策逻辑", "#### Logique de choix du mode"),
    ("#### 两条路径的差异", "#### Différences entre les deux chemins"),
    ("| 维度 | 普通 RAG（qaModeNormal） | Agent（qaModeAgent） |",
     "| Dimension | RAG classique (qaModeNormal) | Agent (qaModeAgent) |"),
    ("### 关键常量速查", "### Constantes clés"),
    ("| 常量 | 值 | 位置 |", "| Constante | Valeur | Emplacement |"),
    ("引擎职责与约束：", "Rôle et contraintes du moteur :"),
    ("一次迭代 `runReActIteration` 内部依次是四个阶段：", "Une itération `runReActIteration` comporte quatre phases :"),
    ("最大迭代次数的多层默认值：", "Valeurs par défaut des itérations max (plusieurs niveaux) :"),
]

HEADERS.sort(key=lambda x: -len(x[0]))


def main() -> None:
    t = PATH.read_text(encoding="utf-8")
    for a, b in HEADERS:
        t = t.replace(a, b)
    PATH.write_text(t, encoding="utf-8")


if __name__ == "__main__":
    main()
